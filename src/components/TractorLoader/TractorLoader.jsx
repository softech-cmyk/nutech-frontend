import { useEffect, useState } from "react";
import "./TractorLoader.css";

// Only shows up if loading actually takes a moment — avoids a flash on fast loads.
const SHOW_DELAY_MS = 300;
const START_DURATION_MS = 900;
const MIN_DURATION_MS = 200;
const SPEEDUP_INTERVAL_MS = 350;
const SPEEDUP_STEP_MS = 70;

const TractorLoader = ({ label = "Loading..." }) => {
  const [visible, setVisible] = useState(false);
  const [duration, setDuration] = useState(START_DURATION_MS);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const speedTimer = setInterval(() => {
      setDuration((d) => Math.max(MIN_DURATION_MS, d - SPEEDUP_STEP_MS));
    }, SPEEDUP_INTERVAL_MS);
    return () => clearInterval(speedTimer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="tload"
      style={{
        "--tload-wheel-duration": `${duration}ms`,
        "--tload-smoke-duration": `${duration * 2.6}ms`,
      }}
    >
      <svg viewBox="0 0 220 110" className="tload__svg">
        <rect x="0" y="92" width="220" height="18" fill="#bbf7d0" />
        {[10, 26, 42, 58, 74, 90, 106, 122, 138, 154, 170, 186, 202].map((x) => (
          <line key={x} x1={x} y1="92" x2={x} y2="82" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
        ))}

        <circle className="tload__smoke tload__smoke--1" cx="100" cy="34" r="4" fill="#cbd5e1" />
        <circle className="tload__smoke tload__smoke--2" cx="100" cy="34" r="4" fill="#cbd5e1" />
        <circle className="tload__smoke tload__smoke--3" cx="100" cy="34" r="4" fill="#cbd5e1" />

        <g className="tload__body">
          <rect x="96" y="38" width="6" height="20" rx="2" fill="#64748b" />
          <rect x="55" y="74" width="70" height="8" rx="3" fill="#1a2e1c" />
          <rect x="88" y="56" width="52" height="20" rx="4" fill="#0369a1" />
          <rect x="30" y="42" width="34" height="34" rx="5" fill="#15803d" />
          <rect x="36" y="48" width="22" height="16" rx="2" fill="#bae6fd" />

          <g className="tload__wheel tload__wheel--rear">
            <circle cx="58" cy="84" r="19" fill="#1a2e1c" />
            <circle cx="58" cy="84" r="8" fill="#4ade80" />
            <line x1="58" y1="65" x2="58" y2="103" stroke="#166534" strokeWidth="2" />
            <line x1="39" y1="84" x2="77" y2="84" stroke="#166534" strokeWidth="2" />
            <line x1="45" y1="71" x2="71" y2="97" stroke="#166534" strokeWidth="2" />
            <line x1="71" y1="71" x2="45" y2="97" stroke="#166534" strokeWidth="2" />
          </g>

          <g className="tload__wheel tload__wheel--front">
            <circle cx="132" cy="88" r="11" fill="#1a2e1c" />
            <circle cx="132" cy="88" r="4.5" fill="#38bdf8" />
            <line x1="132" y1="77" x2="132" y2="99" stroke="#0369a1" strokeWidth="1.5" />
            <line x1="121" y1="88" x2="143" y2="88" stroke="#0369a1" strokeWidth="1.5" />
          </g>
        </g>
      </svg>
      {label && <p className="tload__label">{label}</p>}
    </div>
  );
};

export default TractorLoader;
