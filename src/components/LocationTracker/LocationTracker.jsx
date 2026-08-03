import { useEffect, useRef, useState } from "react";
import { getSocket } from "../../utils/socket";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/attendance`;
const POLL_MS = 20000;

// Dispatched by PunchAttendance right after a punch in/out succeeds, so the
// live-location stream reacts immediately instead of waiting for the next poll.
export const DUTY_STATUS_EVENT = "attendance:duty-changed";

const isOnDuty = (attendance) => {
  const sessions = attendance?.sessions || [];
  const last = sessions[sessions.length - 1];
  return !!(last && !last.punchOut);
};

// Mounted once for the whole app (see App.jsx) so an employee's live location
// keeps streaming to managers no matter which page they're on, instead of
// only while they sit on the Punch Attendance screen.
const LocationTracker = () => {
  const [onDuty, setOnDuty] = useState(false);
  const watchRef = useRef(null);

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
    if (onDuty && navigator.geolocation) {
      const socket = getSocket();
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          socket.emit("location:update", { lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    } else if (localStorage.getItem("token")) {
      getSocket().emit("location:stop");
    }
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [onDuty]);

  return null;
};

export default LocationTracker;
