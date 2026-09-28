import { useState, useEffect, useMemo } from "react";
import {
  MONTH_NAMES,
  MONTH_SHORT,
  WEEKDAY_SHORT,
  parseDateParts,
  formatDateDisplay,
  formatDateWithWeekday,
  formatSlotTimeRange,
  groupSlotsByDate,
} from "../lib/slotUtils.js";

/**
 * Interactive Calendar & Date-Specific Time Slot Picker Modal.
 *
 * Requirements fulfilled:
 * - Admin slot data is the source of truth (only active slots shown).
 * - Dates with >= 1 active slot are selectable; others disabled.
 * - Multi-month navigation across available slot range.
 * - Timezone-safe date rendering (no UTC shift).
 * - Date selection reveals available batches/time cards.
 * - Mobile and desktop responsive layouts.
 */
export default function SlotPickerModal({
  isOpen,
  onClose,
  slots = [],
  selectedSlotId = null,
  onSelectSlot,
}) {
  // Group active slots by date (YYYY-MM-DD)
  const slotsByDate = useMemo(() => groupSlotsByDate(slots), [slots]);
  const availableDates = useMemo(() => Object.keys(slotsByDate).sort(), [slotsByDate]);

  // Determine navigation boundary from available dates
  const { minYearMonth, maxYearMonth, initialYear, initialMonth } = useMemo(() => {
    const now = new Date();
    let minYM = now.getFullYear() * 12 + now.getMonth();
    let maxYM = minYM + 2; // default 2 months window
    let initY = now.getFullYear();
    let initM = now.getMonth();

    if (availableDates.length > 0) {
      const firstParts = parseDateParts(availableDates[0]);
      const lastParts = parseDateParts(availableDates[availableDates.length - 1]);
      if (firstParts && lastParts) {
        minYM = firstParts.year * 12 + (firstParts.month - 1);
        maxYM = Math.max(minYM, lastParts.year * 12 + (lastParts.month - 1));
        initY = firstParts.year;
        initM = firstParts.month - 1;
      }
    }

    return { minYearMonth: minYM, maxYearMonth: maxYM, initialYear: initY, initialMonth: initM };
  }, [availableDates]);

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth); // 0-11
  const [tempSelectedDate, setTempSelectedDate] = useState(null);
  const [tempSelectedSlot, setTempSelectedSlot] = useState(null);

  // Sync state whenever modal opens or active slot changes
  useEffect(() => {
    if (!isOpen) return;

    if (selectedSlotId) {
      const matched = slots.find((s) => s.id === selectedSlotId && s.active);
      if (matched && matched.slotDate) {
        const parts = parseDateParts(matched.slotDate);
        if (parts) {
          setViewYear(parts.year);
          setViewMonth(parts.month - 1);
          setTempSelectedDate(matched.slotDate);
          setTempSelectedSlot(matched);
          return;
        }
      }
    }

    // Default to the first available date if present
    if (availableDates.length > 0) {
      const firstDate = availableDates[0];
      const parts = parseDateParts(firstDate);
      if (parts) {
        setViewYear(parts.year);
        setViewMonth(parts.month - 1);
        setTempSelectedDate(firstDate);
        const daySlots = slotsByDate[firstDate] || [];
        setTempSelectedSlot(daySlots.length === 1 ? daySlots[0] : null);
      }
    } else {
      setViewYear(initialYear);
      setViewMonth(initialMonth);
      setTempSelectedDate(null);
      setTempSelectedSlot(null);
    }
  }, [isOpen, selectedSlotId, slots, availableDates, slotsByDate, initialYear, initialMonth]);

  if (!isOpen) return null;

  const currentYearMonth = viewYear * 12 + viewMonth;
  const canGoPrev = currentYearMonth > minYearMonth;
  const canGoNext = currentYearMonth < maxYearMonth;

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewYear((prev) => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) {
      setViewYear((prev) => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Days calculation for the active viewMonth
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...

  const handleDateSelect = (dateStr) => {
    setTempSelectedDate(dateStr);
    const daySlots = slotsByDate[dateStr] || [];
    if (daySlots.length === 1) {
      setTempSelectedSlot(daySlots[0]);
    } else if (tempSelectedSlot && daySlots.some((s) => s.id === tempSelectedSlot.id)) {
      // keep currently selected slot if it belongs to this date
    } else {
      setTempSelectedSlot(null);
    }
  };

  const handleConfirm = () => {
    if (!tempSelectedSlot) return;
    onSelectSlot(tempSelectedSlot);
    onClose();
  };

  const dateSlots = tempSelectedDate ? slotsByDate[tempSelectedDate] || [] : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-picker-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        padding: 16,
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: "relative",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
          width: "100%",
          maxWidth: 680,
          padding: "24px 24px 20px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          animation: "modalFadeIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
            paddingBottom: 14,
            borderBottom: "1px solid #f0ece6",
          }}
        >
          <div>
            <h2
              id="slot-picker-title"
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#1f2937",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className="bi bi-calendar3" style={{ color: "#ff6b1b", fontSize: 19 }}></i>
              Choose Class Slot
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#6b7280" }}>
              Select an available date, then pick your preferred batch time.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              lineHeight: 1,
              color: "#9ca3af",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
            }}
          >
            &times;
          </button>
        </div>

        {/* Modal Body: Responsive 2-column or stacked layout */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          <div className="row g-4">
            {/* Column 1: Calendar View */}
            <div className="col-12 col-md-6">
              <div
                style={{
                  background: "#faf8f5",
                  border: "1px solid #ece5da",
                  borderRadius: 14,
                  padding: "16px 14px",
                }}
              >
                {/* Month/Year Header with Navigation */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={handlePrevMonth}
                    disabled={!canGoPrev}
                    style={{
                      background: canGoPrev ? "#fff" : "transparent",
                      border: canGoPrev ? "1px solid #e5e7eb" : "none",
                      borderRadius: 8,
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: canGoPrev ? "pointer" : "default",
                      color: canGoPrev ? "#374151" : "#d1d5db",
                    }}
                  >
                    <i className="bi bi-chevron-left" style={{ fontSize: 13 }}></i>
                  </button>

                  <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>

                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={handleNextMonth}
                    disabled={!canGoNext}
                    style={{
                      background: canGoNext ? "#fff" : "transparent",
                      border: canGoNext ? "1px solid #e5e7eb" : "none",
                      borderRadius: 8,
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: canGoNext ? "pointer" : "default",
                      color: canGoNext ? "#374151" : "#d1d5db",
                    }}
                  >
                    <i className="bi bi-chevron-right" style={{ fontSize: 13 }}></i>
                  </button>
                </div>

                {/* Weekday Names Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  {WEEKDAY_SHORT.map((day) => (
                    <div
                      key={day}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        padding: "4px 0",
                      }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 4,
                  }}
                >
                  {/* Blank padding days */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} style={{ height: 36 }} />
                  ))}

                  {/* Month days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                    const hasSlots = Boolean(slotsByDate[dateStr] && slotsByDate[dateStr].length > 0);
                    const isSelected = tempSelectedDate === dateStr;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => hasSlots && handleDateSelect(dateStr)}
                        disabled={!hasSlots}
                        title={hasSlots ? `${slotsByDate[dateStr].length} slot(s) available` : "No slots available"}
                        style={{
                          height: 38,
                          borderRadius: 8,
                          border: isSelected
                            ? "2px solid #ff6b1b"
                            : hasSlots
                            ? "1px solid #ffd8c2"
                            : "1px solid transparent",
                          background: isSelected
                            ? "#ff6b1b"
                            : hasSlots
                            ? "#fff"
                            : "transparent",
                          color: isSelected
                            ? "#fff"
                            : hasSlots
                            ? "#1f2937"
                            : "#d1d5db",
                          fontWeight: isSelected ? 700 : hasSlots ? 600 : 400,
                          fontSize: 13,
                          cursor: hasSlots ? "pointer" : "default",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                          padding: 0,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{dayNum}</span>
                        {/* Dot indicator for available dates */}
                        {hasSlots && (
                          <span
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              background: isSelected ? "#fff" : "#ff6b1b",
                              marginTop: 1,
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 16,
                    marginTop: 14,
                    paddingTop: 10,
                    borderTop: "1px solid #ece5da",
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#ff6b1b",
                        display: "inline-block",
                      }}
                    />
                    Available
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#d1d5db",
                        display: "inline-block",
                      }}
                    />
                    Unavailable
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Date-Specific Time Slots Selection */}
            <div className="col-12 col-md-6 d-flex flex-column">
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #ece5da",
                  borderRadius: 14,
                  padding: "16px 18px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px" }}>
                    Selected Date
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginTop: 2 }}>
                    {tempSelectedDate ? formatDateWithWeekday(tempSelectedDate) : "None selected"}
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: "#4b5563", marginBottom: 10 }}>
                  Available Batch & Times
                </div>

                {/* Slots List for Selected Date */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {!tempSelectedDate ? (
                    <div
                      style={{
                        padding: "28px 16px",
                        textAlign: "center",
                        background: "#faf8f5",
                        borderRadius: 10,
                        border: "1px dashed #d1d5db",
                        color: "#6b7280",
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      <i className="bi bi-calendar-event d-block mb-2" style={{ fontSize: 24, color: "#ff6b1b" }}></i>
                      Please select an available date from the calendar to view batch times.
                    </div>
                  ) : dateSlots.length === 0 ? (
                    <div
                      style={{
                        padding: "24px 16px",
                        textAlign: "center",
                        background: "#fef2f2",
                        borderRadius: 10,
                        color: "#991b1b",
                        fontSize: 13,
                      }}
                    >
                      No active slots available for this date.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {dateSlots.map((slot) => {
                        const isSlotSelected = tempSelectedSlot?.id === slot.id;
                        return (
                          <div
                            key={slot.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setTempSelectedSlot(slot)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setTempSelectedSlot(slot);
                              }
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "12px 14px",
                              borderRadius: 10,
                              border: isSlotSelected ? "2px solid #ff6b1b" : "1px solid #e5e7eb",
                              background: isSlotSelected ? "#fff9f5" : "#fff",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              boxShadow: isSlotSelected ? "0 2px 8px rgba(255, 107, 27, 0.15)" : "none",
                            }}
                          >
                            {/* Custom Radio Circle */}
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                border: isSlotSelected ? "5px solid #ff6b1b" : "2px solid #d1d5db",
                                marginRight: 12,
                                flexShrink: 0,
                                background: "#fff",
                                transition: "all 0.15s ease",
                              }}
                            />

                            {/* Batch Info */}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                                {slot.label || "Regular Batch"}
                              </div>
                              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                <i className="bi bi-clock" style={{ fontSize: 11 }}></i>
                                {formatSlotTimeRange(slot.startTime, slot.endTime)}
                              </div>
                            </div>

                            {/* Selected Badge */}
                            {isSlotSelected && (
                              <span
                                style={{
                                  background: "#ff6b1b",
                                  color: "#fff",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "3px 8px",
                                  borderRadius: 12,
                                  flexShrink: 0,
                                }}
                              >
                                Selected
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid #f0ece6",
          }}
        >
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {tempSelectedSlot ? (
              <span style={{ color: "#111827", fontWeight: 500 }}>
                {formatDateDisplay(tempSelectedSlot.slotDate)} • {tempSelectedSlot.label || "Batch"} •{" "}
                {formatSlotTimeRange(tempSelectedSlot.startTime, tempSelectedSlot.endTime)}
              </span>
            ) : (
              <span>No slot selected yet</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{
                background: "#f3f4f6",
                color: "#374151",
                fontSize: 14,
                fontWeight: 500,
                padding: "8px 18px",
                borderRadius: 8,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!tempSelectedSlot}
              onClick={handleConfirm}
              className="btn"
              style={{
                background: tempSelectedSlot ? "#ff6b1b" : "#fca5a5",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                padding: "8px 22px",
                borderRadius: 8,
                cursor: tempSelectedSlot ? "pointer" : "not-allowed",
                boxShadow: tempSelectedSlot ? "0 2px 8px rgba(255, 107, 27, 0.25)" : "none",
              }}
            >
              Confirm Slot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
