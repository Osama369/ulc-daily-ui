// Draw dates follow Pakistan time. Using toISOString() for "today" gives the
// UTC date, which is still yesterday between 00:00 and 05:00 PKT.
export const getPakistanISODate = (value = new Date()) => {
  const dateObj = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateObj.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateObj);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
};
