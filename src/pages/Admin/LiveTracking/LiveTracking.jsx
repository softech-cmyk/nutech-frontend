import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import HomeButton from "../../../components/HomeButton/HomeButton";
import { getSocket } from "../../../utils/socket";
import "./LiveTracking.css";

// Leaflet's default marker icon path breaks under Vite bundling — point it
// at the bundled asset URLs instead.
L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }; // fallback: New Delhi

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

// Re-centers/fits the map whenever the set of live markers changes, without
// fighting the user if they've since panned or zoomed manually.
const FitBounds = ({ points }) => {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (points.length === 0 || fitted.current) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
    } else {
      map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [40, 40] });
    }
    fitted.current = true;
  }, [points, map]);

  return null;
};

// Flies the map to a selected employee and pops their marker open, so
// clicking a row in the list below jumps straight to that person.
const FlyToSelected = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 16, { duration: 0.8 });
  }, [target, map]);
  return null;
};

const EmployeeMarker = ({ point, isSelected }) => {
  const markerRef = useRef(null);

  useEffect(() => {
    if (isSelected && markerRef.current) markerRef.current.openPopup();
  }, [isSelected]);

  return (
    <Marker position={[point.lat, point.lng]} ref={markerRef}>
      <Tooltip permanent direction="top" offset={[0, -38]} className="lt__marker-label">
        {point.name}
      </Tooltip>
      <Popup>
        <strong>{point.name}</strong>
        <br />
        Last update: {fmtTime(point.updatedAt)}
      </Popup>
    </Marker>
  );
};

const LiveTracking = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState({}); // userId -> { userId, name, lat, lng, updatedAt }
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }

    // Initial snapshot over REST, so the map isn't empty until the next ping.
    fetch(`${API}/attendance/live-locations`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(({ locations: initial }) => {
        const map = {};
        (initial || []).forEach((loc) => { map[loc.userId] = loc; });
        setLocations(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const socket = getSocket();

    const onSnapshot = (initial) => {
      const map = {};
      (initial || []).forEach((loc) => { map[loc.userId] = loc; });
      setLocations(map);
    };
    const onUpdate = (entry) => {
      setLocations((prev) => ({ ...prev, [entry.userId]: entry }));
    };
    const onOffline = ({ userId }) => {
      setLocations((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on("location:snapshot", onSnapshot);
    socket.on("location:update", onUpdate);
    socket.on("location:offline", onOffline);

    return () => {
      socket.off("location:snapshot", onSnapshot);
      socket.off("location:update", onUpdate);
      socket.off("location:offline", onOffline);
    };
  }, [navigate]);

  const points = Object.values(locations);
  const selectedPoint = points.find((p) => p.userId === selectedUserId) || null;

  return (
    <div className="lt">
      <HomeButton />
      <div className="lt__topbar">
        <button className="lt__back" onClick={() => navigate("/managerdashboard")}>
          <i className="ti ti-arrow-left" /> Back
        </button>
        <h1 className="lt__title">Live Location Tracking</h1>
        <span className="lt__count">
          <i className="ti ti-map-pin" /> {points.length} on duty
        </span>
      </div>

      {!loading && points.length === 0 && (
        <p className="lt__empty">No employees currently on duty with location sharing active.</p>
      )}

      <div className="lt__map-wrap">
        <MapContainer
          center={points[0] ? [points[0].lat, points[0].lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          zoom={12}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
          <FlyToSelected target={selectedPoint} />
          {points.map((p) => (
            <EmployeeMarker key={p.userId} point={p} isSelected={p.userId === selectedUserId} />
          ))}
        </MapContainer>
      </div>

      <ul className="lt__list">
        {points.map((p) => (
          <li
            key={p.userId}
            className={`lt__list-item ${p.userId === selectedUserId ? "is-selected" : ""}`}
            onClick={() => setSelectedUserId(p.userId)}
          >
            <i className="ti ti-user-circle" />
            <span className="lt__list-name">{p.name}</span>
            <span className="lt__list-time">updated {fmtTime(p.updatedAt)}</span>
            <i className="ti ti-map-pin-search lt__list-goto" />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LiveTracking;
