import "./DeductionCard.css";

const fmtMoney = (n) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// Shows exactly how a payroll deduction amount was derived, in the same
// terms the /api/payroll/summary endpoint used to compute it: gross ÷
// working days = per-day rate, then that rate applied to each absence /
// half-day, summing to the total deducted.
const DeductionCard = ({ p }) => {
  if (!p || p.perDayRate == null) {
    return (
      <div className="ded-card">
        <div className="ded-card__header">
          <i className="ti ti-calculator" aria-hidden="true" /> How this is calculated
        </div>
        <p className="ded-card__empty">No salary set for this employee yet.</p>
      </div>
    );
  }

  const items = [];
  if (p.absentDays) {
    items.push({
      label: `Absent — ${p.absentDays} day${p.absentDays === 1 ? "" : "s"}`,
      amount: p.absentDays * p.perDayRate,
    });
  }
  if (p.halfDays) {
    items.push({
      label: `Half-day — ${p.halfDays} × 0.5`,
      amount: p.halfDays * 0.5 * p.perDayRate,
    });
  }

  return (
    <div className="ded-card">
      <div className="ded-card__header">
        <i className="ti ti-calculator" aria-hidden="true" /> How this deduction was calculated
      </div>

      <div className="ded-card__formula">
        <div className="ded-card__formula-item">
          <span>Gross salary</span>
          <strong>{fmtMoney(p.monthlySalary)}</strong>
        </div>
        <i className="ti ti-divide ded-card__formula-op" aria-hidden="true" />
        <div className="ded-card__formula-item">
          <span>Working days</span>
          <strong>{p.workingDaysInMonth}</strong>
        </div>
        <i className="ti ti-equal ded-card__formula-op" aria-hidden="true" />
        <div className="ded-card__formula-item ded-card__formula-item--result">
          <span>Per-day rate</span>
          <strong>{fmtMoney(p.perDayRate)}</strong>
        </div>
      </div>

      {items.length ? (
        <div className="ded-card__items">
          {items.map((item) => (
            <div className="ded-card__item" key={item.label}>
              <span>{item.label}</span>
              <strong>{fmtMoney(item.amount)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="ded-card__empty">No absences or half-days this month — nothing deducted.</p>
      )}

      <div className="ded-card__total">
        <span>Total deduction</span>
        <strong>− {fmtMoney(p.deduction)}</strong>
      </div>
    </div>
  );
};

export default DeductionCard;
