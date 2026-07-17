import { useState } from "react";
import "./InHandCard.css";

const fmtMoney = (n) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const toNum = (v) => (v === "" || v == null || isNaN(v) ? 0 : Number(v));

const FIELDS = [
  { key: "esi", label: "ESI" },
  { key: "pf", label: "PF" },
  { key: "bonus", label: "Bonus" },
  { key: "gratuity", label: "Gratuity" },
];

// Lets a manager optionally knock ESI / PF / Bonus / Gratuity off the
// attendance-based in-hand salary to arrive at the final Net Salary — the
// amount actually credited. Every field is optional — leaving one blank
// just means it isn't deducted.
const InHandCard = ({ netSalary, adjustments, onSave, saving }) => {
  const [values, setValues] = useState({
    esi: adjustments?.esi ?? "",
    pf: adjustments?.pf ?? "",
    bonus: adjustments?.bonus ?? "",
    gratuity: adjustments?.gratuity ?? "",
  });

  const setField = (key, val) => setValues((v) => ({ ...v, [key]: val }));

  const totalAdjustments = FIELDS.reduce((sum, f) => sum + toNum(values[f.key]), 0);
  const finalInHand = toNum(netSalary) - totalAdjustments;

  const handleSave = () => {
    onSave({
      esi: values.esi === "" ? null : Number(values.esi),
      pf: values.pf === "" ? null : Number(values.pf),
      bonus: values.bonus === "" ? null : Number(values.bonus),
      gratuity: values.gratuity === "" ? null : Number(values.gratuity),
    });
  };

  return (
    <div className="inhand-card">
      <div className="inhand-card__header">
        <i className="ti ti-calculator" aria-hidden="true" /> Net Salary breakdown
      </div>

      <div className="inhand-card__base">
        <span>In-hand salary (before adjustments)</span>
        <strong>{fmtMoney(netSalary)}</strong>
      </div>

      <div className="inhand-card__fields">
        {FIELDS.map((f) => (
          <label key={f.key} className="inhand-card__field">
            <span>{f.label}</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={values[f.key]}
              onChange={(e) => setField(f.key, e.target.value)}
              disabled={saving}
            />
          </label>
        ))}
      </div>

      <div className="inhand-card__total">
        <span>Net Salary</span>
        <strong>{fmtMoney(finalInHand)}</strong>
      </div>

      <button type="button" className="inhand-card__save" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save adjustments"}
      </button>
    </div>
  );
};

export default InHandCard;
