import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import ExcelJS from "exceljs";
import HomeButton from "../../HomeButton/HomeButton";
import "./AttendanceRecords.css";

const API      = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MAP_STYLE = { width: "100%", height: "340px", borderRadius: "12px" };

const fmtTime = (iso) => {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const fmtMins = (mins) => {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const STATUS_LABEL = { present: "Present", "half-day": "Half Day", absent: "Absent" };
const STATUS_FILL  = { present: "FFDCFCE7", "half-day": "FFFEF9C3", absent: "FFFEE2E2" };
const STATUS_FONT  = { present: "FF15803D", "half-day": "FFA16207", absent: "FFB91C1C" };

const toHours = (mins) => (mins != null ? Math.round((mins / 60) * 100) / 100 : null);

// Groups flat attendance records into one entry per employee, sorted by name then date.
const groupRecordsByEmployee = (records) => {
  const byUser = new Map();
  for (const rec of records) {
    const id = rec.userId?._id || rec.userId?.phone || "unknown";
    if (!byUser.has(id)) {
      byUser.set(id, {
        userId: id,
        name: rec.userId?.name || rec.userId?.phone || "—",
        company: rec.company || "—",
        presentCount: 0,
        halfDayCount: 0,
        absentCount: 0,
        totalMinutes: 0,
        days: [],
      });
    }
    const group = byUser.get(id);
    if (rec.status === "present") group.presentCount += 1;
    else if (rec.status === "half-day") group.halfDayCount += 1;
    else if (rec.status === "absent") group.absentCount += 1;
    group.totalMinutes += rec.totalMinutes || 0;
    group.days.push(rec);
  }
  return [...byUser.values()]
    .map((g) => ({ ...g, days: g.days.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const triggerDownload = async (workbook, fileName) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// One row per employee — present/half/absent day counts and total hours,
// computed independently from the flat detail rows rather than read off them,
// so it stands on its own as a checkable total. Placed as the first sheet so
// it's the first thing anyone opening the export sees.
const addSummarySheet = (workbook, records) => {
  const sheet = workbook.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Name",         key: "name",    width: 26 },
    { header: "Company",      key: "company", width: 22 },
    { header: "Present Days", key: "present", width: 14 },
    { header: "Half Days",    key: "half",    width: 12 },
    { header: "Absent Days",  key: "absent",  width: 14 },
    { header: "Total Days",   key: "total",   width: 12 },
    { header: "Total Hours",  key: "hours",   width: 14 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  const groups = groupRecordsByEmployee(records);
  groups.forEach((g, idx) => {
    const row = sheet.addRow({
      name: g.name,
      company: g.company,
      present: g.presentCount,
      half: g.halfDayCount,
      absent: g.absentCount,
      total: g.presentCount + g.halfDayCount + g.absentCount,
      hours: toHours(g.totalMinutes),
    });
    row.getCell(7).numFmt = "0.00";
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFDCFCE7" } } };
      if (idx % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
    });
    row.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    row.getCell(1).font = { bold: true, color: { argb: "FF14532D" } };
  });

  if (groups.length > 0) {
    const firstDataRow = 2;
    const lastDataRow  = sheet.rowCount;
    const totalsRow = sheet.addRow({
      name: "TOTAL",
      company: `${groups.length} employee${groups.length === 1 ? "" : "s"}`,
      present: { formula: `SUM(C${firstDataRow}:C${lastDataRow})` },
      half:    { formula: `SUM(D${firstDataRow}:D${lastDataRow})` },
      absent:  { formula: `SUM(E${firstDataRow}:E${lastDataRow})` },
      total:   { formula: `SUM(F${firstDataRow}:F${lastDataRow})` },
      hours:   { formula: `SUM(G${firstDataRow}:G${lastDataRow})` },
    });
    totalsRow.height = 22;
    totalsRow.getCell(7).numFmt = "0.00";
    totalsRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF14532D" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
      cell.border = { top: { style: "medium", color: { argb: "FF15803D" } } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    totalsRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
  }

  return sheet;
};

// Bare-bones sheet for the Today export: just punch times and hours worked
// today, per employee — no day/week counts, since there's only one day here.
const addTodayHoursSheet = (workbook, records) => {
  const sheet = workbook.addWorksheet("Today's Hours", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Name",         key: "name",  width: 26 },
    { header: "Punch In",     key: "in",    width: 14 },
    { header: "Punch Out",    key: "out",   width: 14 },
    { header: "Hours Worked", key: "hours", width: 16 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  const sorted = [...records].sort((a, b) =>
    (a.userId?.name || "").localeCompare(b.userId?.name || "")
  );
  sorted.forEach((rec, idx) => {
    const row = sheet.addRow({
      name: rec.userId?.name || rec.userId?.phone || "—",
      in: fmtTime(rec.punchIn),
      out: fmtTime(rec.punchOut),
      hours: toHours(rec.totalMinutes),
    });
    row.getCell(4).numFmt = "0.00";
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFDCFCE7" } } };
      if (idx % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
    });
    row.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    row.getCell(1).font = { bold: true, color: { argb: "FF14532D" } };
  });

  if (sorted.length > 0) {
    const firstDataRow = 2;
    const lastDataRow  = sheet.rowCount;
    const totalsRow = sheet.addRow({
      name: "TOTAL",
      hours: { formula: `SUM(D${firstDataRow}:D${lastDataRow})` },
    });
    totalsRow.height = 22;
    totalsRow.getCell(4).numFmt = "0.00";
    totalsRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF14532D" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
      cell.border = { top: { style: "medium", color: { argb: "FF15803D" } } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    totalsRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
  }

  return sheet;
};

// One flat sheet, every record as its own row — good for a quick company-wide dump.
const exportCombinedSheet = async (records, fileName, { isToday = false } = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AttendEase";
  workbook.created = new Date();

  // Today's hours is the headline number when exporting from the Today tab,
  // so it leads the workbook rather than being buried after the day/week counts.
  if (isToday) addTodayHoursSheet(workbook, records);
  addSummarySheet(workbook, records);

  const sheet = workbook.addWorksheet("Attendance");
  sheet.columns = [
    { header: "Name",        key: "name",    width: 24 },
    { header: "Company",     key: "company", width: 22 },
    { header: "Date",        key: "date",    width: 14 },
    { header: "Punch In",    key: "in",      width: 12 },
    { header: "Punch Out",   key: "out",     width: 12 },
    { header: "Total Hours", key: "hours",   width: 14 },
    { header: "Status",      key: "status",  width: 14 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
  headerRow.alignment = { vertical: "middle" };

  // Grouped by employee (each already sorted by date) rather than one flat
  // sort, so a subtotal row can be dropped in right after each employee's
  // block — a running total the reader never has to compute by hand.
  const groups = groupRecordsByEmployee(records);

  groups.forEach((group) => {
    const firstRow = sheet.rowCount + 1;

    group.days.forEach((rec) => {
      const row = sheet.addRow({
        name: rec.userId?.name || rec.userId?.phone || group.name,
        company: rec.company || group.company,
        date: rec.date,
        in: fmtTime(rec.punchIn),
        out: fmtTime(rec.punchOut),
        hours: toHours(rec.totalMinutes),
        status: STATUS_LABEL[rec.status] || rec.status,
      });
      row.getCell(6).numFmt = "0.00";
      const statusCell = row.getCell(7);
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILL[rec.status] || "FFF3F4F6" } };
      statusCell.font = { bold: true, color: { argb: STATUS_FONT[rec.status] || "FF374151" } };
    });

    const lastRow = sheet.rowCount;
    const subtotal = sheet.addRow({
      name: `${group.name} — Total`,
      company: group.company,
      date: { formula: `"Total Days: "&ROWS(C${firstRow}:C${lastRow})` },
      in: { formula: `"Present: "&COUNTIF(G${firstRow}:G${lastRow},"Present")` },
      out: { formula: `"Absent: "&COUNTIF(G${firstRow}:G${lastRow},"Absent")` },
      hours: { formula: `SUM(F${firstRow}:F${lastRow})` },
      status: { formula: `"Half Day: "&COUNTIF(G${firstRow}:G${lastRow},"Half Day")` },
    });
    subtotal.getCell(6).numFmt = "0.00";
    subtotal.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF14532D" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
      cell.border = { top: { style: "thin", color: { argb: "FF15803D" } }, bottom: { style: "medium", color: { argb: "FF15803D" } } };
    });

    sheet.addRow({}); // spacer row between employees
  });

  await triggerDownload(workbook, fileName);
};

// Adds one sheet for a single employee: a day-by-day table plus a totals block
// driven by real Excel formulas (COUNTIF / SUM), so it recalculates if edited.
const addEmployeeSheet = (workbook, group, sheetName) => {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = [
    { key: "date",   width: 14 },
    { key: "in",     width: 12 },
    { key: "out",    width: 12 },
    { key: "hours",  width: 14 },
    { key: "status", width: 14 },
  ];

  sheet.mergeCells("A1:E1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `${group.name} — ${group.company}`;
  titleCell.font = { bold: true, size: 13, color: { argb: "FF14532D" } };
  sheet.getRow(1).height = 22;

  const headerRow = sheet.getRow(3);
  headerRow.values = ["Date", "Punch In", "Punch Out", "Total Hours", "Status"];
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };

  const firstDataRow = 4;
  group.days.forEach((rec, idx) => {
    const row = sheet.getRow(firstDataRow + idx);
    row.values = [
      rec.date,
      fmtTime(rec.punchIn),
      fmtTime(rec.punchOut),
      toHours(rec.totalMinutes),
      STATUS_LABEL[rec.status] || rec.status,
    ];
    row.getCell(4).numFmt = "0.00";
    const statusCell = row.getCell(5);
    statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILL[rec.status] || "FFF3F4F6" } };
    statusCell.font = { bold: true, color: { argb: STATUS_FONT[rec.status] || "FF374151" } };
  });

  if (group.days.length > 0) {
    const lastDataRow = firstDataRow + group.days.length - 1;
    const summaryStart = lastDataRow + 2;
    const addSummary = (offset, label, formula) => {
      const row = sheet.getRow(summaryStart + offset);
      row.getCell(1).value = label;
      row.getCell(1).font = { bold: true, color: { argb: "FF14532D" } };
      row.getCell(2).value = { formula };
      row.getCell(2).font = { bold: true };
    };
    addSummary(0, "Present days", `COUNTIF(E${firstDataRow}:E${lastDataRow},"Present")`);
    addSummary(1, "Half days",    `COUNTIF(E${firstDataRow}:E${lastDataRow},"Half Day")`);
    addSummary(2, "Total hours",  `SUM(D${firstDataRow}:D${lastDataRow})`);
  }

  return sheet;
};

// One workbook, one sheet per employee — each with its own totals.
const exportEmployeeWiseWorkbook = async (records, fileName) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AttendEase";
  workbook.created = new Date();

  const groups = groupRecordsByEmployee(records);
  const usedNames = new Set();
  groups.forEach((group) => {
    const base = (group.name || "Employee").replace(/[\\/*?:[\]]/g, "").slice(0, 28) || "Employee";
    let name = base;
    let n = 2;
    while (usedNames.has(name)) name = `${base} (${n++})`.slice(0, 31);
    usedNames.add(name);
    addEmployeeSheet(workbook, group, name);
  });

  await triggerDownload(workbook, fileName);
};

// Single employee, single sheet with totals — used by the per-row export button.
const exportSingleEmployeeSheet = async (group, fileName) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AttendEase";
  workbook.created = new Date();
  addEmployeeSheet(workbook, group, (group.name || "Employee").slice(0, 31));
  await triggerDownload(workbook, fileName);
};

const LocationModal = ({ rec, onClose, onLogged }) => {
  const { isLoaded } = useLoadScript({ googleMapsApiKey: MAPS_KEY });
  const [activeMarker, setActiveMarker] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [reason, setReason]     = useState("");
  const [error, setError]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [record, setRecord]     = useState(rec);

  const inLoc  = record.punchInLocation?.lat  ? record.punchInLocation  : null;
  const outLoc = record.punchOutLocation?.lat ? record.punchOutLocation : null;
  const center = inLoc || outLoc || { lat: 28.6139, lng: 77.2090 };

  const submitReason = async () => {
    if (!reason.trim()) {
      setError("Please state why you're viewing this location.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/attendance/${record._id}/view-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setRecord(data.attendance);
      onLogged(data.attendance);
      setUnlocked(true);
    } catch (err) {
      setError(err.message || "Could not log this view.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ar__modal-backdrop" onClick={onClose}>
      <div className="ar__modal" onClick={(e) => e.stopPropagation()}>
        <div className="ar__modal-header">
          <div>
            <h3>{record.userId?.name || record.userId?.phone || "Employee"}</h3>
            <p>{record.date} &nbsp;·&nbsp; {fmtTime(record.punchIn)} – {fmtTime(record.punchOut)}</p>
          </div>
          <button className="ar__modal-close" onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>

        {!unlocked ? (
          <div className="ar__loc-gate">
            <p className="ar__loc-gate-intro">
              <i className="ti ti-shield-lock" /> Location data is sensitive. State why you're viewing it — this is logged against the record.
            </p>
            <textarea
              className="ar__reg-note"
              rows={2}
              placeholder="e.g. Verifying a field-visit claim for this date"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
            {error && <p className="ar__reg-error"><i className="ti ti-alert-circle" /> {error}</p>}
            <button className="ar__reg-btn ar__reg-btn--full" disabled={submitting} onClick={submitReason}>
              <i className="ti ti-eye" /> {submitting ? "Logging…" : "View location"}
            </button>
          </div>
        ) : (
          <>
            <div className="ar__modal-legend">
              <span className="ar__legend ar__legend--in">● Punch In</span>
              <span className="ar__legend ar__legend--out">● Punch Out</span>
            </div>

            {(record.punchInAddress || record.punchOutAddress) && (
              <div className="ar__modal-addresses">
                {record.punchInAddress && (
                  <p className="ar__modal-address ar__modal-address--in">
                    <i className="ti ti-map-pin" /> <strong>In:</strong> {record.punchInAddress}
                  </p>
                )}
                {record.punchOutAddress && (
                  <p className="ar__modal-address ar__modal-address--out">
                    <i className="ti ti-map-pin" /> <strong>Out:</strong> {record.punchOutAddress}
                  </p>
                )}
              </div>
            )}

            {isLoaded ? (
              <GoogleMap mapContainerStyle={MAP_STYLE} center={center} zoom={15}>
                {inLoc && (
                  <Marker
                    position={inLoc}
                    onClick={() => setActiveMarker("in")}
                    icon={{ url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }}
                  >
                    {activeMarker === "in" && (
                      <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                        <div style={{ fontWeight: 700, color: "#166534" }}>
                          Punch In<br />{fmtTime(record.punchIn)}
                        </div>
                      </InfoWindow>
                    )}
                  </Marker>
                )}
                {outLoc && (
                  <Marker
                    position={outLoc}
                    onClick={() => setActiveMarker("out")}
                    icon={{ url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" }}
                  >
                    {activeMarker === "out" && (
                      <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                        <div style={{ fontWeight: 700, color: "#991b1b" }}>
                          Punch Out<br />{fmtTime(record.punchOut)}
                        </div>
                      </InfoWindow>
                    )}
                  </Marker>
                )}
              </GoogleMap>
            ) : (
              <div className="ar__map-loading">Loading map…</div>
            )}

            {!inLoc && !outLoc && (
              <p className="ar__modal-no-loc">No location data recorded for this entry.</p>
            )}

            {record.locationViewLogs?.length > 0 && (
              <div className="ar__loc-history">
                <p className="ar__loc-history-title">
                  <i className="ti ti-history" /> Access history
                </p>
                <ul className="ar__loc-history-list">
                  {[...record.locationViewLogs].reverse().map((log, idx) => (
                    <li key={idx}>
                      <span className="ar__loc-history-who">{log.viewedBy?.name || "A manager"}</span>
                      <span className="ar__loc-history-when">{new Date(log.viewedAt).toLocaleString()}</span>
                      <span className="ar__loc-history-reason">{log.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const RegularizeModal = ({ rec, onClose, onUpdated }) => {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const runAction = async (action) => {
    if (action !== "reset" && !note.trim()) {
      setError("A reason is required to regularize attendance.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/attendance/${rec._id}/regularize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onUpdated(data.attendance);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ar__modal-backdrop" onClick={onClose}>
      <div className="ar__modal" onClick={(e) => e.stopPropagation()}>
        <div className="ar__modal-header">
          <div>
            <h3>Regularize attendance</h3>
            <p>{rec.userId?.name || rec.userId?.phone || "Employee"} &nbsp;·&nbsp; {rec.date}</p>
          </div>
          <button className="ar__modal-close" onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div className="ar__reg-current">
          Current status:{" "}
          <span className={`ar__status-badge ar__status-badge--${rec.status}`}>
            {rec.status === "present" ? "Present" : rec.status === "half-day" ? "Half Day" : "Absent"}
          </span>
          {rec.regularized && (
            <span className="ar__reg-tag" title={rec.regularizationNote || ""}>
              <i className="ti ti-pencil" /> Already regularized by {rec.regularizedBy?.name || "a manager"}
            </span>
          )}
        </div>

        <label className="ar__reg-label" htmlFor="reg-note">
          Reason <span className="ar__reg-required">(required for Full/Half Day)</span>
        </label>
        <textarea
          id="reg-note"
          className="ar__reg-note"
          rows={2}
          placeholder="e.g. Approved late arrival, client visit before office…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {error && <p className="ar__reg-error"><i className="ti ti-alert-circle" /> {error}</p>}

        <div className="ar__reg-actions">
          <button className="ar__reg-btn ar__reg-btn--full" disabled={submitting} onClick={() => runAction("full-day")}>
            <i className="ti ti-circle-check" /> Mark Full Day
          </button>
          <button className="ar__reg-btn ar__reg-btn--half" disabled={submitting} onClick={() => runAction("half-day")}>
            <i className="ti ti-circle-half-2" /> Mark Half Day
          </button>
          {rec.regularized && (
            <button className="ar__reg-btn ar__reg-btn--reset" disabled={submitting} onClick={() => runAction("reset")}>
              <i className="ti ti-refresh" /> Reset to Automatic
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const AttendanceRecords = () => {
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState("today");
  const [startDate, setStartDate]   = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate]       = useState(new Date().toISOString().slice(0, 10));
  const [yearInput, setYearInput]   = useState(String(new Date().getFullYear()));
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [monthInput, setMonthInput] = useState(new Date().toISOString().slice(0, 7));
  const [activeMonth, setActiveMonth] = useState(new Date().toISOString().slice(0, 7));
  const [records, setRecords]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedRec, setSelectedRec] = useState(null);
  const [regularizingRec, setRegularizingRec] = useState(null);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [sundayStatusByUser, setSundayStatusByUser] = useState({});

  const handleRegularized = (updated) => {
    setRecords((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
  };

  const handleLocationLogged = (updated) => {
    setRecords((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
  };

  const fetchSundayStatus = useCallback(async (userId) => {
    setSundayStatusByUser((prev) => ({ ...prev, [userId]: { loading: true } }));
    try {
      const token = localStorage.getItem("token");
      const res  = await fetch(`${API}/attendance/sunday-status?userId=${userId}&month=${activeMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSundayStatusByUser((prev) => ({ ...prev, [userId]: { sundays: data.sundays || [] } }));
    } catch {
      setSundayStatusByUser((prev) => ({ ...prev, [userId]: { error: true } }));
    }
  }, [activeMonth]);

  const toggleExpanded = (userId) => {
    const isCurrentlyOpen = expandedUsers.has(userId);
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (isCurrentlyOpen) next.delete(userId);
      else next.add(userId);
      return next;
    });
    if (!isCurrentlyOpen && !sundayStatusByUser[userId]) fetchSundayStatus(userId);
  };

  // One entry per employee for the month — his day-by-day punches roll up
  // underneath instead of repeating the name in every row.
  const monthGroups = useMemo(
    () => (filterType === "month" ? groupRecordsByEmployee(records) : []),
    [records, filterType]
  );

  // The Today tab is meant to show who's actually present, not every record
  // for the date — so absent entries (from manual regularization) are excluded.
  const displayRecords = useMemo(
    () => (filterType === "today" ? records.filter((r) => r.status !== "absent") : records),
    [records, filterType]
  );

  // Human-readable label for the currently active filter, used in export file names.
  const periodLabel = () => {
    if (filterType === "today") return new Date().toISOString().slice(0, 10);
    if (filterType === "month") return activeMonth;
    if (filterType === "range") return `${startDate}_to_${endDate}`;
    if (filterType === "year") return String(activeYear);
    return "records";
  };

  const handleExportCombined = () => {
    exportCombinedSheet(displayRecords, `attendance-${periodLabel()}.xlsx`, { isToday: filterType === "today" });
  };

  const handleExportEmployeeWise = () => {
    exportEmployeeWiseWorkbook(displayRecords, `attendance-by-employee-${periodLabel()}.xlsx`);
  };

  const handleExportEmployee = (group) => {
    exportSingleEmployeeSheet(
      group,
      `attendance-${group.name.replace(/\s+/g, "_")}-${periodLabel()}.xlsx`
    );
  };

  const fetchRecords = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }

    setLoading(true);
    try {
      let url = `${API}/attendance/all?`;
      if (filterType === "today") {
        url += `date=${new Date().toISOString().slice(0, 10)}`;
      } else if (filterType === "range") {
        url += `startDate=${startDate}&endDate=${endDate}`;
      } else if (filterType === "month") {
        const [y, m] = activeMonth.split("-").map(Number);
        const lastDay  = new Date(y, m, 0).getDate(); // days in month, timezone-safe
        const monthEnd = `${activeMonth}-${String(lastDay).padStart(2, "0")}`;
        url += `startDate=${activeMonth}-01&endDate=${monthEnd}`;
      } else if (filterType === "year") {
        url += `year=${activeYear}`;
      }

      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error("Failed to fetch records:", err.message);
    } finally {
      setLoading(false);
    }
  }, [filterType, startDate, endDate, activeMonth, activeYear, navigate]);

  useEffect(() => {
    // Deferred via setTimeout rather than called directly, so the effect
    // itself never synchronously invokes a function that sets state.
    const initialFetch = setTimeout(fetchRecords, 0);
    const interval = setInterval(fetchRecords, 30000);
    return () => { clearTimeout(initialFetch); clearInterval(interval); };
  }, [fetchRecords]);

  return (
    <div className="attendance-records">
      <HomeButton />
      <div className="present-table-container">
        <div className="table-actions">
          <div>
            <h2>Attendance Records</h2>
            <p className="table-sub">Real-time attendance data from the database.</p>
          </div>
          <div className="ar__header-actions">
            <button
              className="ar__export-btn"
              onClick={handleExportCombined}
              disabled={displayRecords.length === 0}
              title="One sheet, every record currently shown"
            >
              <i className="ti ti-file-spreadsheet" /> Export (Combined)
            </button>
            <button
              className="ar__export-btn ar__export-btn--alt"
              onClick={handleExportEmployeeWise}
              disabled={displayRecords.length === 0}
              title="One sheet per employee, with Present/Half-day/Total-hours totals"
            >
              <i className="ti ti-users" /> Export (By Employee)
            </button>
            <button className="ar__refresh-btn" onClick={fetchRecords}>
              <i className="ti ti-refresh" /> Refresh
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="ar__filter">
          <div className="ar__filter-tabs">
            <button
              className={`ar__tab ${filterType === "today" ? "ar__tab--active" : ""}`}
              onClick={() => setFilterType("today")}
            >
              <i className="ti ti-calendar-today" /> Today
            </button>
            <button
              className={`ar__tab ${filterType === "month" ? "ar__tab--active" : ""}`}
              onClick={() => setFilterType("month")}
            >
              <i className="ti ti-calendar-month" /> Month
            </button>
            <button
              className={`ar__tab ${filterType === "range" ? "ar__tab--active" : ""}`}
              onClick={() => setFilterType("range")}
            >
              <i className="ti ti-calendar-event" /> Date Range
            </button>
            <button
              className={`ar__tab ${filterType === "year" ? "ar__tab--active" : ""}`}
              onClick={() => setFilterType("year")}
            >
              <i className="ti ti-calendar-stats" /> Year
            </button>
          </div>

          {filterType === "month" && (
            <div className="ar__range-inputs">
              <input
                type="month"
                value={monthInput}
                onChange={(e) => setMonthInput(e.target.value)}
                className="ar__date-input"
                max={new Date().toISOString().slice(0, 7)}
              />
              <button
                className="ar__apply-btn"
                onClick={() => { if (monthInput) setActiveMonth(monthInput); }}
              >
                Apply
              </button>
            </div>
          )}

          {filterType === "range" && (
            <div className="ar__range-inputs">
              <input type="date" value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="ar__date-input" />
              <span className="ar__date-sep">→</span>
              <input type="date" value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="ar__date-input" />
            </div>
          )}

          {filterType === "year" && (
            <div className="ar__range-inputs">
              <input
                type="number"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="ar__date-input ar__year-input"
                min="2020"
                max={new Date().getFullYear()}
                placeholder="e.g. 2026"
              />
              <button
                className="ar__apply-btn"
                onClick={() => {
                  const y = parseInt(yearInput);
                  if (!isNaN(y) && y >= 2020 && y <= new Date().getFullYear()) setActiveYear(y);
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="present-table-wrap">
          {loading ? (
            <p className="ar__loading">Loading records...</p>
          ) : displayRecords.length === 0 ? (
            <p className="ar__empty">No attendance records found.</p>
          ) : filterType === "month" ? (
            <div className="ar__groups">
              {monthGroups.map((group) => {
                const isOpen = expandedUsers.has(group.userId);
                return (
                  <div key={group.userId} className="ar__group">
                    <div
                      role="button"
                      tabIndex={0}
                      className={`ar__group-head ${isOpen ? "ar__group-head--open" : ""}`}
                      onClick={() => toggleExpanded(group.userId)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleExpanded(group.userId); }}
                    >
                      <i className={`ti ${isOpen ? "ti-chevron-down" : "ti-chevron-right"} ar__group-chevron`} />
                      <span className="ar__group-name">{group.name}</span>
                      <span className="ar__group-company">{group.company}</span>
                      <span className="ar__group-stats">
                        <span className="ar__group-stat ar__group-stat--present">{group.presentCount} present</span>
                        <span className="ar__group-stat ar__group-stat--half">{group.halfDayCount} half-day</span>
                        <span className="ar__group-stat">{fmtMins(group.totalMinutes)} total</span>
                      </span>
                      <button
                        type="button"
                        className="ar__group-export-btn"
                        onClick={(e) => { e.stopPropagation(); handleExportEmployee(group); }}
                        title={`Export ${group.name}'s attendance to Excel`}
                      >
                        <i className="ti ti-file-spreadsheet" />
                      </button>
                    </div>

                    {isOpen && (() => {
                      const sundayInfo = sundayStatusByUser[group.userId];
                      return (
                        <div className="ar__sunday-block">
                          <span className="ar__sunday-label">
                            <i className="ti ti-calendar-star" /> Sunday holiday (needs 4.5 of their shift-days that week
                            {sundayInfo?.sundays?.[0] ? ` — ${sundayInfo.sundays[0].requiredHours}h` : ""})
                          </span>
                          {!sundayInfo || sundayInfo.loading ? (
                            <span className="ar__sunday-loading">Checking…</span>
                          ) : sundayInfo.error ? (
                            <span className="ar__sunday-loading">Couldn't load.</span>
                          ) : sundayInfo.sundays.length === 0 ? (
                            <span className="ar__sunday-loading">No Sundays this month.</span>
                          ) : (
                            <div className="ar__sunday-chips">
                              {sundayInfo.sundays.map((s) => (
                                <span
                                  key={s.date}
                                  className={`ar__sunday-chip ${s.earned ? "ar__sunday-chip--earned" : "ar__sunday-chip--missed"}`}
                                  title={`${s.weekHours}h worked ${s.weekStart} to ${s.weekEnd} (needs ${s.requiredHours}h)`}
                                >
                                  <i className={`ti ${s.earned ? "ti-check" : "ti-x"}`} />
                                  {s.date.slice(8)} — {s.earned ? "earned" : "not earned"}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {isOpen && (
                      <table className="present-table ar__group-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Punch In</th>
                            <th>Punch Out</th>
                            <th>Total Hours</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.days.map((rec) => {
                            const rowClass =
                              rec.status === "present" ? "present-row" :
                              rec.status === "half-day" ? "half-day-row" : "absent-row";
                            return (
                              <tr key={rec._id} className={rowClass}>
                                <td>{rec.date}</td>
                                <td>{fmtTime(rec.punchIn)}</td>
                                <td>{fmtTime(rec.punchOut)}</td>
                                <td>{fmtMins(rec.totalMinutes)}</td>
                                <td className="ar__status-cell">
                                  <span className={`ar__status-badge ar__status-badge--${rec.status}`}>
                                    {rec.status === "present" ? "Present" : rec.status === "half-day" ? "Half Day" : "Absent"}
                                  </span>
                                  {rec.regularized && (
                                    <span
                                      className="ar__reg-dot"
                                      title={`Regularized by ${rec.regularizedBy?.name || "a manager"}${rec.regularizationNote ? ` — ${rec.regularizationNote}` : ""}`}
                                    >
                                      <i className="ti ti-pencil" />
                                    </span>
                                  )}
                                </td>
                                <td className="ar__actions-cell">
                                  <div className="ar__actions-inner">
                                    <button className="ar__loc-btn ar__loc-btn--labeled" onClick={() => setSelectedRec(rec)} title="View punch location on map">
                                      <i className="ti ti-map-pin" /> Location
                                    </button>
                                    <button className="ar__loc-btn" onClick={() => setRegularizingRec(rec)} title="Regularize attendance">
                                      <i className="ti ti-pencil" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <table className="present-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Date</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRecords.map((rec, i) => {
                  const rowClass =
                    rec.status === "present" ? "present-row" :
                    rec.status === "half-day" ? "half-day-row" : "absent-row";

                  return (
                    <tr key={rec._id} className={rowClass}>
                      <td>{i + 1}</td>
                      <td className="ar__name-cell">{rec.userId?.name || rec.userId?.phone || "—"}</td>
                      <td>{rec.company || "—"}</td>
                      <td>{rec.date}</td>
                      <td>{fmtTime(rec.punchIn)}</td>
                      <td>{fmtTime(rec.punchOut)}</td>
                      <td>{fmtMins(rec.totalMinutes)}</td>
                      <td className="ar__status-cell">
                        <span className={`ar__status-badge ar__status-badge--${rec.status}`}>
                          {rec.status === "present" ? "Present" : rec.status === "half-day" ? "Half Day" : "Absent"}
                        </span>
                        {rec.regularized && (
                          <span
                            className="ar__reg-dot"
                            title={`Regularized by ${rec.regularizedBy?.name || "a manager"}${rec.regularizationNote ? ` — ${rec.regularizationNote}` : ""}`}
                          >
                            <i className="ti ti-pencil" />
                          </span>
                        )}
                      </td>
                      <td className="ar__actions-cell">
                        <div className="ar__actions-inner">
                          <button className="ar__loc-btn ar__loc-btn--labeled" onClick={() => setSelectedRec(rec)} title="View punch location on map">
                            <i className="ti ti-map-pin" /> Location
                          </button>
                          <button className="ar__loc-btn" onClick={() => setRegularizingRec(rec)} title="Regularize attendance">
                            <i className="ti ti-pencil" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedRec && (
        <LocationModal
          rec={selectedRec}
          onClose={() => setSelectedRec(null)}
          onLogged={handleLocationLogged}
        />
      )}

      {regularizingRec && (
        <RegularizeModal
          rec={regularizingRec}
          onClose={() => setRegularizingRec(null)}
          onUpdated={handleRegularized}
        />
      )}
    </div>
  );
};

export default AttendanceRecords;
