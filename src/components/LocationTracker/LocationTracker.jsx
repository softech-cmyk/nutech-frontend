import { useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { getSocket } from "../../utils/socket";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/attendance`;
const POLL_MS = 20000;

// No JS wrapper ships with this plugin — it's registered directly, per its
// own docs, rather than imported as a class/instance.
const BackgroundGeolocation = registerPlugin("BackgroundGeolocation");

// Dispatched by PunchAttendance right after a punch in/out succeeds, so the
// live-location stream reacts immediately instead of waiting for the next poll.
export const DUTY_STATUS_EVENT = "attendance:duty-changed";

const isOnDuty = (attendance) => {
  const sessions = attendance?.sessions || [];
  const last = sessions[sessions.length - 1];
  return !!(last && !last.punchOut);
};

// Sends one location ping over whichever channel is available. The socket
// emit works while the app is foregrounded (or briefly after backgrounding);
// the HTTP POST is a fallback for when the native watcher fires while the
// socket is disconnected/reconnecting, e.g. after Android wakes the app
// specifically to deliver a background location fix. CapacitorHttp is
// enabled (capacitor.config.json) so this POST goes over native networking
// instead of the WebView's fetch, which Android throttles once backgrounded.
const sendUpdate = (lat, lng) => {
  const token = localStorage.getItem("token");
  if (!token) return;

  getSocket().emit("location:update", { lat, lng });

  fetch(`${API}/location`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ lat, lng }),
  }).catch(() => {});
};

// Mounted once for the whole app (see App.jsx) so an employee's live location
// keeps streaming to managers no matter which page they're on, instead of
// only while they sit on the Punch Attendance screen.
const LocationTracker = () => {
  const [onDuty, setOnDuty] = useState(false);
  const watcherRef = useRef(null); // { kind: "native" | "web", id }

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");
      // Only employees are tracked — the backend socket handler drops
      // location updates from any other role anyway.
      if (!token || !user || user.role !== "employee") {
        if (!cancelled) setOnDuty(false);
        return;
      }
      try {
        const res = await fetch(`${API}/today`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!cancelled) setOnDuty(isOnDuty(data?.attendance));
      } catch {
        // transient network failure — leave the current state as-is
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, POLL_MS);

    const onDutyEvent = (e) => setOnDuty(!!e.detail?.onDuty);
    window.addEventListener(DUTY_STATUS_EVENT, onDutyEvent);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(DUTY_STATUS_EVENT, onDutyEvent);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const clearWatcher = () => {
      const w = watcherRef.current;
      watcherRef.current = null;
      if (!w) return;
      if (w.kind === "native") BackgroundGeolocation.removeWatcher({ id: w.id }).catch(() => {});
      else navigator.geolocation.clearWatch(w.id);
    };

    const startWebWatch = () => {
      if (!navigator.geolocation) return;
      const id = navigator.geolocation.watchPosition(
        (pos) => sendUpdate(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      watcherRef.current = { kind: "web", id };
    };

    const startNativeWatch = async () => {
      // Best-effort — Android 13+ needs POST_NOTIFICATIONS granted for the
      // persistent "on duty" notification to actually show, but the watcher
      // still works without it.
      try {
        await LocalNotifications.requestPermissions();
      } catch {
        // ignore
      }

      try {
        const id = await BackgroundGeolocation.addWatcher(
          {
            backgroundTitle: "Attendance tracking",
            backgroundMessage: "Tracking your location while you're on duty.",
            requestPermissions: true,
            stale: false,
            distanceFilter: 20,
          },
          (location, error) => {
            if (cancelled) return;
            if (error) {
              if (error.code === "NOT_AUTHORIZED") {
                // Only foreground (or no) location permission was granted —
                // degrade to foreground-only tracking instead of going dark.
                clearWatcher();
                startWebWatch();
              }
              return;
            }
            if (location) sendUpdate(location.latitude, location.longitude);
          }
        );
        if (cancelled) {
          BackgroundGeolocation.removeWatcher({ id }).catch(() => {});
          return;
        }
        watcherRef.current = { kind: "native", id };
      } catch {
        // addWatcher itself failed (e.g. plugin unavailable) — fall back.
        if (!cancelled) startWebWatch();
      }
    };

    if (onDuty) {
      if (Capacitor.isNativePlatform()) startNativeWatch();
      else startWebWatch();
    } else if (localStorage.getItem("token")) {
      getSocket().emit("location:stop");
    }

    return () => {
      cancelled = true;
      clearWatcher();
    };
  }, [onDuty]);

  return null;
};

export default LocationTracker;
