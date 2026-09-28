export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

/**
 * Parses a YYYY-MM-DD string into year, month (1-based), day numbers.
 * Safe from UTC-to-local timezone shifting.
 */
export function parseDateParts(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10), // 1-12
    day: parseInt(match[3], 10),
  };
}

/**
 * Formats a YYYY-MM-DD date into "02 Sep 2026".
 */
export function formatDateDisplay(dateStr) {
  const parts = parseDateParts(dateStr);
  if (!parts) return "";
  const dayStr = String(parts.day).padStart(2, "0");
  const monthStr = MONTH_SHORT[parts.month - 1] || "";
  return `${dayStr} ${monthStr} ${parts.year}`;
}

/**
 * Formats a YYYY-MM-DD date into "02 September 2026".
 */
export function formatDateLong(dateStr) {
  const parts = parseDateParts(dateStr);
  if (!parts) return "";
  const dayStr = String(parts.day).padStart(2, "0");
  const monthStr = MONTH_NAMES[parts.month - 1] || "";
  return `${dayStr} ${monthStr} ${parts.year}`;
}

/**
 * Formats a YYYY-MM-DD date with day of the week, e.g. "Wednesday, 02 Sep 2026".
 */
export function formatDateWithWeekday(dateStr) {
  const parts = parseDateParts(dateStr);
  if (!parts) return "";
  // Construct local Date without UTC conversion
  const d = new Date(parts.year, parts.month - 1, parts.day);
  const weekday = WEEKDAY_NAMES[d.getDay()] || "";
  return `${weekday}, ${formatDateDisplay(dateStr)}`;
}

/**
 * Formats HH:mm or HH:mm:ss into 12-hour format e.g. "7:00 AM" or "5:05 PM".
 */
export function formatTime12h(timeStr) {
  if (!timeStr) return "";
  const [hStr, mStr] = String(timeStr).split(":");
  let hour = parseInt(hStr, 10);
  if (isNaN(hour)) return timeStr;
  const minute = mStr ? mStr.padStart(2, "0") : "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

/**
 * Formats a slot's start and end times into a clean range e.g. "7:00 AM – 8:00 AM".
 */
export function formatSlotTimeRange(startTime, endTime) {
  const start = formatTime12h(startTime);
  if (!endTime) return start;
  const end = formatTime12h(endTime);
  if (start === end || !end) return start;
  return `${start} – ${end}`;
}

/**
 * Formats a complete slot summary for display in the main form input.
 * e.g. "02 Sep 2026 • Morning Batch • 7:00 AM – 8:00 AM" (or "02 Sep 2026 • Morning Batch • 7:00 AM")
 */
export function formatSlotSummary(slot) {
  if (!slot) return "";
  const dateFormatted = formatDateDisplay(slot.slotDate);
  const startTime = slot.startTime || slot.slotStartTime;
  const endTime = slot.endTime || slot.slotEndTime;
  const timeFormatted = formatSlotTimeRange(startTime, endTime);
  const label = slot.label ? slot.label.trim() : "Regular Batch";
  if (!dateFormatted) return `${label} • ${timeFormatted}`.trim();
  return `${dateFormatted} • ${label} • ${timeFormatted}`;
}

/**
 * Groups active slots by calendar date (YYYY-MM-DD) and sorts within each date by start time.
 */
export function groupSlotsByDate(slots) {
  if (!Array.isArray(slots)) return {};
  const map = {};

  slots.forEach((slot) => {
    // Only active slots
    if (slot.active === false || !slot.slotDate) return;
    const dateKey = String(slot.slotDate).trim();
    if (!map[dateKey]) {
      map[dateKey] = [];
    }
    map[dateKey].push(slot);
  });

  // Sort slots inside each date by start time and displayOrder
  Object.keys(map).forEach((dateKey) => {
    map[dateKey].sort((a, b) => {
      const timeA = a.startTime || a.slotStartTime || "";
      const timeB = b.startTime || b.slotStartTime || "";
      const timeComp = timeA.localeCompare(timeB);
      if (timeComp !== 0) return timeComp;
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
  });

  return map;
}
