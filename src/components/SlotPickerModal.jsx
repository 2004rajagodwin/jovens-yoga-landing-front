import { useState, useEffect, useMemo, useRef } from "react";
import {
  MONTH_NAMES,
  WEEKDAY_SHORT,
  parseDateParts,
  formatDateDisplay,
  formatSlotTimeRange,
} from "../lib/slotUtils.js";
import { getActiveBatches, getBookingWindow } from "../services/slotApi.js";

/**
 * JOVENS YOGA – SLOT PICKER V2
 * Batch-First Selection + Date Calendar + Admin-Controlled Booking Window
 * (Recurring Daily Batch Availability Architecture)
 *
 * Flow:
 * 1. Customer selects Batch on the LEFT SIDE.
 * 2. Calendar on the RIGHT SIDE shows all dates inside the booking window available for that batch.
 * 3. Customer selects an available Date.
 * 4. Switching batch retains the selected date if inside booking window.
 * 5. Customer clicks "Confirm Slot".
 */
export default function SlotPickerModal({
  isOpen,
  onClose,
  slots = [],
  selectedSlot = null,
  selectedSlotId = null,
  onSelectSlot,
  customerLocation = null,
  resolvedTimezone = null,
}) {
  const [batches, setBatches] = useState([]);
  const [batchesStatus, setBatchesStatus] = useState("loading");
  const [bookingWindowWeeks, setBookingWindowWeeks] = useState(2);

  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [tempSelectedDate, setTempSelectedDate] = useState(null);
  const [tempSelectedSlot, setTempSelectedSlot] = useState(null);

  // Customer local today's date string in YYYY-MM-DD based on customer location timezone
  const todayStr = useMemo(() => {
    const tz = resolvedTimezone?.timezoneId;
    if (tz) {
      try {
        const formatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        return formatter.format(new Date());
      } catch {}
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [resolvedTimezone?.timezoneId]);

  // Max selectable date based on configured booking window starting from customerLocalToday
  const maxDateStr = useMemo(() => {
    const parts = parseDateParts(todayStr);
    if (!parts) return todayStr;
    const base = new Date(parts.year, parts.month - 1, parts.day);
    base.setDate(base.getDate() + bookingWindowWeeks * 7);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, "0");
    const d = String(base.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [todayStr, bookingWindowWeeks]);

  // Current calendar view month & year initialized from customerLocalToday
  const [viewYear, setViewYear] = useState(() => {
    const parts = parseDateParts(todayStr);
    return parts ? parts.year : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const parts = parseDateParts(todayStr);
    return parts ? parts.month - 1 : new Date().getMonth();
  });

  const prevIsOpenRef = useRef(false);
  const batchesRequestIdRef = useRef(0);

  // Load active batches, booking window, and initialize selection ONCE per modal open
  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }

    const isFirstOpen = !prevIsOpenRef.current;
    prevIsOpenRef.current = true;

    if (isFirstOpen) {
      const currentRequestId = ++batchesRequestIdRef.current;
      if (batches.length === 0) {
        setBatchesStatus("loading");
      }

      getActiveBatches()
        .then((data) => {
          if (batchesRequestIdRef.current !== currentRequestId) return;
          const list = Array.isArray(data) ? data : [];
          setBatches(list);
          setBatchesStatus("success");
          setSelectedBatchId((prev) => prev || (list.length > 0 ? list[0].id : null));
        })
        .catch(() => {
          if (batchesRequestIdRef.current !== currentRequestId) return;
          // Fallback: derive unique active batches from slots if endpoint fails
          const map = {};
          (slots || []).forEach((s) => {
            if (!s.active) return;
            const bId = s.batchId || s.id;
            const bName = s.batchName || s.label || "Regular Batch";
            if (!map[bId]) {
              map[bId] = {
                id: bId,
                name: bName,
                startTime: s.startTime,
                endTime: s.endTime,
                active: true,
              };
            }
          });
          const list = Object.values(map);
          setBatches(list);
          setBatchesStatus("success");
          setSelectedBatchId((prev) => prev || (list.length > 0 ? list[0].id : null));
        });

      getBookingWindow()
        .then((res) => {
          if (res && res.bookingWindowWeeks) {
            setBookingWindowWeeks(res.bookingWindowWeeks);
          }
        })
        .catch(() => {});

      // Initialize selection on open
      if (selectedSlot) {
        setTempSelectedSlot(selectedSlot);
        const slotDate = selectedSlot.slotDate || selectedSlot.date;
        setTempSelectedDate(slotDate);
        if (selectedSlot.batchId) {
          setSelectedBatchId(selectedSlot.batchId);
        }
        if (slotDate) {
          const parts = parseDateParts(slotDate);
          if (parts) {
            setViewYear(parts.year);
            setViewMonth(parts.month - 1);
          }
        }
      } else if (selectedSlotId) {
        const current = (slots || []).find((s) => s.id === selectedSlotId && s.active);
        if (current) {
          setTempSelectedSlot(current);
          const slotDate = current.slotDate || current.date;
          setTempSelectedDate(slotDate);
          if (current.batchId) {
            setSelectedBatchId(current.batchId);
          }
          if (slotDate) {
            const parts = parseDateParts(slotDate);
            if (parts) {
              setViewYear(parts.year);
              setViewMonth(parts.month - 1);
            }
          }
        }
      } else {
        setTempSelectedSlot(null);
        setTempSelectedDate(null);
        const parts = parseDateParts(todayStr);
        if (parts) {
          setViewYear(parts.year);
          setViewMonth(parts.month - 1);
        }
        if (batches.length > 0) {
          setSelectedBatchId(batches[0].id);
        }
      }
    }
  }, [isOpen]);

  const locationDisplayText = useMemo(() => {
    const city = resolvedTimezone?.city || customerLocation?.city || "";
    const state = resolvedTimezone?.state || customerLocation?.state || "";
    const country = resolvedTimezone?.country || customerLocation?.countryRegion || "";
    const parts = [city, state, country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Customer Location";
  }, [resolvedTimezone, customerLocation]);

  const activeBatch = useMemo(() => {
    return batches.find((b) => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  // Handle batch selection change (Section 4):
  // When customer changes batch (e.g. Morning -> Evening), calendar remains available.
  // The selected date remains selected if it is still inside the booking window.
  const handleSelectBatch = (batchId) => {
    setSelectedBatchId(batchId);
    const targetBatch = batches.find((b) => b.id === batchId);

    if (!targetBatch || !targetBatch.active) {
      setTempSelectedDate(null);
      setTempSelectedSlot(null);
      return;
    }

    if (tempSelectedDate && tempSelectedDate >= todayStr && tempSelectedDate <= maxDateStr) {
      const existingSlot = (slots || []).find(
        (s) =>
          (s.batchId === targetBatch.id || (s.batchName || s.label) === targetBatch.name) &&
          (s.slotDate === tempSelectedDate || s.date === tempSelectedDate)
      );

      setTempSelectedSlot({
        id: existingSlot?.id || null,
        batchId: targetBatch.id,
        batchName: targetBatch.name,
        slotDate: tempSelectedDate,
        date: tempSelectedDate,
        startTime: targetBatch.startTime,
        endTime: targetBatch.endTime,
        label: targetBatch.name,
        active: true,
      });
    }
  };

  // Handle date click on calendar (Section 3):
  // Any date inside [todayStr, maxDateStr] is available for an active batch
  const handleDateSelect = (dateStr) => {
    if (!activeBatch || !activeBatch.active) return;
    if (dateStr < todayStr || dateStr > maxDateStr) return;

    const existingSlot = (slots || []).find(
      (s) =>
        (s.batchId === activeBatch.id || (s.batchName || s.label) === activeBatch.name) &&
        (s.slotDate === dateStr || s.date === dateStr)
    );

    const slotObj = {
      id: existingSlot?.id || null,
      batchId: activeBatch.id,
      batchName: activeBatch.name,
      slotDate: dateStr,
      date: dateStr,
      startTime: activeBatch.startTime,
      endTime: activeBatch.endTime,
      label: activeBatch.name,
      active: true,
    };

    setTempSelectedDate(dateStr);
    setTempSelectedSlot(slotObj);
  };

  // Month navigation boundary
  const { minYearMonth, maxYearMonth } = useMemo(() => {
    const partsToday = parseDateParts(todayStr);
    const partsMax = parseDateParts(maxDateStr);
    const minYM = partsToday ? partsToday.year * 12 + (partsToday.month - 1) : 0;
    const maxYM = partsMax ? partsMax.year * 12 + (partsMax.month - 1) : minYM + 2;
    return { minYearMonth: minYM, maxYearMonth: maxYM };
  }, [todayStr, maxDateStr]);

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

  const handleConfirm = () => {
    if (!tempSelectedSlot) return;
    const finalSlot = {
      ...tempSelectedSlot,
      timezoneId: resolvedTimezone?.timezoneId || null,
      timezoneName: resolvedTimezone?.timezoneName || null,
      utcOffset: resolvedTimezone?.utcOffset || null,
      displayOffset: resolvedTimezone?.displayOffset || null,
    };
    onSelectSlot(finalSlot);
    onClose();
  };

  if (!isOpen) return null;

  // Calendar days generation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

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
          maxWidth: 780,
          padding: "24px 24px 20px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            paddingBottom: 12,
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
              Select your batch, then choose your class date.
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

        {/* Modal Body: 2-Column Responsive (Left: Batch Selection, Right: Calendar) */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            scrollbarGutter: "stable",
            paddingRight: 4,
            boxSizing: "border-box",
          }}
        >
          {/* LOCATION & TIMEZONE BANNER */}
          {resolvedTimezone && (
            <div
              id="slot-picker-timezone-banner"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#fff9f5",
                border: "1px solid #fed7aa",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#ea580c",
                    marginBottom: 2,
                  }}
                >
                  <i className="bi bi-geo-alt me-1"></i> Location
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                  {locationDisplayText}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#ea580c",
                    marginBottom: 2,
                  }}
                >
                  <i className="bi bi-clock me-1"></i> Time Zone
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                  {resolvedTimezone.timezoneName}{" "}
                  <span style={{ color: "#6b7280", fontWeight: 500 }}>({resolvedTimezone.displayOffset})</span>
                </div>
              </div>
            </div>
          )}

          <div className="row g-4">
            {/* LEFT COLUMN: SELECT BATCH */}
            <div className="col-12 col-md-5">
              <div
                style={{
                  background: "#faf8f5",
                  border: "1px solid #ece5da",
                  borderRadius: 14,
                  padding: "16px 14px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#9ca3af",
                    marginBottom: 12,
                  }}
                >
                  Step 1: Select Batch
                </div>

                {batchesStatus === "loading" && (
                  <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
                    Loading batches…
                  </div>
                )}

                {batchesStatus === "success" && batches.length === 0 && (
                  <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
                    No active batches available.
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {batches.map((batch) => {
                    const isSelected = selectedBatchId === batch.id;
                    return (
                      <div
                        key={batch.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectBatch(batch.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelectBatch(batch.id);
                          }
                        }}
                        style={{
                          boxSizing: "border-box",
                          display: "flex",
                          alignItems: "center",
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "2px solid",
                          borderColor: isSelected ? "#ff6b1b" : "#e5e7eb",
                          background: isSelected ? "#fff9f5" : "#fff",
                          cursor: "pointer",
                          transition: "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
                          boxShadow: isSelected ? "0 2px 8px rgba(255, 107, 27, 0.12)" : "none",
                        }}
                      >
                        {/* Radio indicator */}
                        <div
                          style={{
                            boxSizing: "border-box",
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            border: isSelected ? "5px solid #ff6b1b" : "2px solid #d1d5db",
                            marginRight: 12,
                            flexShrink: 0,
                            background: "#fff",
                            transition: "border 0.15s ease",
                          }}
                        />

                        {/* Batch Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                            {batch.name}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              marginTop: 2,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <i className="bi bi-clock" style={{ fontSize: 11 }}></i>
                            {formatSlotTimeRange(batch.startTime, batch.endTime)}
                          </div>
                        </div>

                        {isSelected && (
                          <span
                            style={{
                              flexShrink: 0,
                              background: "#ff6b1b",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "2px 7px",
                              borderRadius: 10,
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 14,
                    fontSize: 12,
                    color: "#9ca3af",
                    textAlign: "center",
                  }}
                >
                  <i className="bi bi-info-circle me-1"></i>
                  Booking window: {bookingWindowWeeks} week{bookingWindowWeeks > 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: SELECT DATE (CALENDAR) */}
            <div className="col-12 col-md-7">
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #ece5da",
                  borderRadius: 14,
                  padding: "16px 16px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#9ca3af",
                    }}
                  >
                    Step 2: Select Date ({activeBatch ? activeBatch.name : "Choose Batch First"})
                  </div>
                </div>

                {/* Calendar Month Navigation */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    padding: "4px 2px",
                  }}
                >
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={handlePrevMonth}
                    disabled={!canGoPrev}
                    style={{
                      background: canGoPrev ? "#faf8f5" : "transparent",
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
                      background: canGoNext ? "#faf8f5" : "transparent",
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
                        padding: "3px 0",
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
                  {/* Padding empty days */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} style={{ height: 38 }} />
                  ))}

                  {/* Month days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

                    const isPast = dateStr < todayStr;
                    const isOutsideWindow = dateStr > maxDateStr;
                    const isBatchActive = Boolean(activeBatch && activeBatch.active);
                    const isSelectable = !isPast && !isOutsideWindow && isBatchActive;
                    const isSelected = tempSelectedDate === dateStr;
                    const isToday = dateStr === todayStr;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => isSelectable && handleDateSelect(dateStr)}
                        disabled={!isSelectable}
                        title={
                          isPast
                            ? "Past date"
                            : isOutsideWindow
                            ? "Outside booking window"
                            : isBatchActive
                            ? `${activeBatch?.name || "Batch"} available`
                            : "Batch unavailable"
                        }
                        style={{
                          boxSizing: "border-box",
                          height: 38,
                          borderRadius: 8,
                          border: "2px solid",
                          borderColor: isSelected
                            ? "#ff6b1b"
                            : isToday && isSelectable
                            ? "#ff6b1b"
                            : isSelectable
                            ? "#ffd8c2"
                            : "transparent",
                          background: isSelected
                            ? "#ff6b1b"
                            : isSelectable
                            ? "#fff"
                            : "transparent",
                          color: isSelected
                            ? "#fff"
                            : isSelectable
                            ? "#1f2937"
                            : "#d1d5db",
                          fontWeight: isSelected ? 700 : isSelectable ? 600 : 400,
                          fontSize: 13,
                          cursor: isSelectable ? "pointer" : "default",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                          padding: 0,
                          transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                        }}
                      >
                        <span>{dayNum}</span>
                        {/* Dot indicator for available batch date */}
                        {isSelectable && (
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
                    borderTop: "1px solid #f0ece6",
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
                    Available for {activeBatch?.name || "Batch"}
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
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, color: "#6b7280", flex: 1, minWidth: 240 }}>
            {tempSelectedSlot ? (
              <span style={{ color: "#111827", fontWeight: 600 }}>
                Selected: {formatDateDisplay(tempSelectedSlot.slotDate || tempSelectedSlot.date)} •{" "}
                {tempSelectedSlot.batchName || tempSelectedSlot.label || activeBatch?.name || "Batch"} •{" "}
                {formatSlotTimeRange(tempSelectedSlot.startTime, tempSelectedSlot.endTime)}
                {resolvedTimezone?.displayOffset ? ` (${resolvedTimezone.displayOffset})` : ""}
              </span>
            ) : (
              <span style={{ color: "#6b7280" }}>
                {activeBatch
                  ? `Please select an available date for ${activeBatch.name}.`
                  : "Please select a batch and class date."}
              </span>
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
