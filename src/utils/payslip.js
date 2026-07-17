import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmtMoney = (n) => (n == null ? "0" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }));

const fmtMonthLabel = (monthStr) => {
  if (!monthStr) return "";
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { year: "numeric", month: "long" });
};

// Whole-rupee amount -> words, Indian numbering (lakh/crore).
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const threeDigits = (n) => {
  let str = "";
  if (n >= 100) { str += `${ONES[Math.floor(n / 100)]} Hundred `; n %= 100; }
  if (n >= 20) { str += `${TENS[Math.floor(n / 10)]} `; n %= 10; }
  if (n > 0) str += `${ONES[n]} `;
  return str.trim();
};

const numberToWords = (num) => {
  num = Math.round(num || 0);
  if (num === 0) return "Zero";
  let str = "";
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const rest = num;
  if (crore) str += `${threeDigits(crore)} Crore `;
  if (lakh) str += `${threeDigits(lakh)} Lakh `;
  if (thousand) str += `${threeDigits(thousand)} Thousand `;
  if (rest) str += threeDigits(rest);
  return str.trim();
};

const GREEN_DARK = [21, 128, 61];
const GREEN_MID = [34, 197, 94];
const GREEN_SOFT = [240, 253, 244];
const INK = [20, 83, 45];
const MUTED = [107, 143, 110];

// Builds and downloads a one-page payslip PDF for a single employee/month,
// from the same figures already shown in the Payroll/Employees UI.
export const downloadPayslip = ({ user, payroll, month, bankAccount }) => {
  const p = payroll || {};
  const gross = p.monthlySalary ?? user.monthlySalary ?? 0;
  const netAmount = p.finalNetSalary ?? p.netSalary ?? gross;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header band
  doc.setFillColor(...GREEN_DARK);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(user.company || "Company", margin, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Salary Slip", margin, 19);
  doc.setFontSize(9);
  doc.text(`For the month of ${fmtMonthLabel(month)}`, margin, 25);

  doc.setFontSize(9);
  doc.text("NET PAY", pageWidth - margin, 12, { align: "right" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${fmtMoney(netAmount)}`, pageWidth - margin, 20, { align: "right" });

  // Employee info
  let y = 38;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(user.name || user.phone || "Employee", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${user.department || "—"}  ·  ${user.role === "manager" ? "Manager" : "Employee"}`, margin, y + 6);

  const infoRight = pageWidth - margin;
  doc.text(`Phone: ${user.countryCode || ""} ${user.phone || "—"}`, infoRight, 38, { align: "right" });
  doc.text(
    `Bank: ${bankAccount ? `${bankAccount.accountNumberMasked} (${bankAccount.ifsc})` : "Not on file"}`,
    infoRight,
    44,
    { align: "right" }
  );

  // Attendance summary strip
  y += 10;
  doc.setDrawColor(...GREEN_MID);
  doc.setFillColor(...GREEN_SOFT);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 2, 2, "FD");
  const stats = [
    ["Working Days", p.workingDaysInMonth ?? "—"],
    ["Present", p.presentDays ?? "—"],
    ["Half Day", p.halfDays ?? "—"],
    ["Absent", p.absentDays ?? "—"],
    ["Paid Leave", p.paidLeaveDays ?? "—"],
    ["Unpaid Leave", p.unpaidLeaveDays ?? "—"],
  ];
  const colWidth = (pageWidth - margin * 2) / stats.length;
  stats.forEach(([label, val], i) => {
    const cx = margin + colWidth * i + colWidth / 2;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GREEN_DARK);
    doc.text(String(val), cx, y + 7, { align: "center" });
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(label, cx, y + 12, { align: "center" });
  });

  // Earnings / deductions table
  y += 24;
  const earnings = [["Basic / CTC", fmtMoney(gross)]];
  const deductions = [];
  if (p.deduction) deductions.push(["Attendance Deduction", fmtMoney(p.deduction)]);
  if (p.esi) deductions.push(["ESI", fmtMoney(p.esi)]);
  if (p.pf) deductions.push(["PF", fmtMoney(p.pf)]);
  if (p.bonus) deductions.push(["Bonus", fmtMoney(p.bonus)]);
  if (p.gratuity) deductions.push(["Gratuity", fmtMoney(p.gratuity)]);
  if (deductions.length === 0) deductions.push(["—", "0"]);

  const rowCount = Math.max(earnings.length, deductions.length);
  const bodyRows = [];
  for (let i = 0; i < rowCount; i++) {
    bodyRows.push([
      earnings[i]?.[0] || "", earnings[i]?.[1] || "",
      deductions[i]?.[0] || "", deductions[i]?.[1] || "",
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [["Earnings", "Amount (Rs.)", "Deductions", "Amount (Rs.)"]],
    body: bodyRows,
    theme: "grid",
    headStyles: { fillColor: GREEN_DARK, textColor: 255, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 9, textColor: INK },
    columnStyles: { 1: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 3,
    body: [[
      "Gross Earnings", fmtMoney(gross),
      "Total Deductions", fmtMoney(gross - netAmount),
    ]],
    theme: "grid",
    bodyStyles: { fontSize: 9, fontStyle: "bold", fillColor: GREEN_SOFT, textColor: INK },
    columnStyles: { 1: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  let afterY = doc.lastAutoTable.finalY + 8;

  // Net pay highlight box
  doc.setFillColor(...GREEN_DARK);
  doc.roundedRect(margin, afterY, pageWidth - margin * 2, 18, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("NET SALARY PAYABLE", margin + 5, afterY + 7);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${fmtMoney(netAmount)}`, pageWidth - margin - 5, afterY + 7, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(`(Rupees ${numberToWords(netAmount)} Only)`, margin + 5, afterY + 14);

  afterY += 26;

  if (p.paid) {
    doc.setTextColor(...GREEN_DARK);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const via = p.payoutMode === "razorpayx" ? "bank transfer" : "manual payment";
    const dateStr = p.paidAt
      ? new Date(p.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "";
    doc.text(`Paid via ${via}${dateStr ? ` on ${dateStr}` : ""}`, margin, afterY);
  }

  // Footer
  doc.setTextColor(...MUTED);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.text("This is a computer-generated payslip and does not require a signature.", margin, 285);
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
    pageWidth - margin,
    285,
    { align: "right" }
  );

  const safeName = (user.name || user.phone || "Employee").replace(/\s+/g, "_");
  doc.save(`Payslip_${safeName}_${month || "current"}.pdf`);
};
