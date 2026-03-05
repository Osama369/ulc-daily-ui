export const REPORT_TYPE_OPTIONS = [
  { value: "DAILY BILL", label: "Daily Bill" },
  { value: "LEDGER", label: "Ledger" },
  { value: "VOUCHER", label: "Voucher" },
];

export const normalizeReportType = (type) => String(type || "").trim().toUpperCase();

export const runReportExportByType = async ({ type, handlers }) => {
  const normalizedType = normalizeReportType(type);
  const handler = handlers?.[normalizedType];
  if (typeof handler !== "function") {
    const err = new Error(`Unsupported report type: ${type}`);
    err.code = "UNSUPPORTED_REPORT_TYPE";
    throw err;
  }
  return handler();
};

