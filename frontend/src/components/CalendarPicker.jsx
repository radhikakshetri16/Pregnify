import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dateKey, localDateKey } from "../utils/dates";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function monthFromDate(value) {
  const key = dateKey(Array.isArray(value) ? value[0] : value);
  if (!key) return null;
  const parsed = new Date(`${key}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return { year: parsed.getFullYear(), month: parsed.getMonth() };
}

export default function CalendarPicker({
  selectedDate,
  onSelectDate,
  availableDates = null,
  highlightedDates = [],
  badgeMap = {},
  minDate = localDateKey(),
  subtitle = "Click a date to view or set time slots",
  availableLabel = "Available Date",
}) {
  const initial = monthFromDate(selectedDate) || monthFromDate(highlightedDates) || monthFromDate(availableDates);
  const [currentYear, setCurrentYear] = useState(initial?.year ?? new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initial?.month ?? new Date().getMonth());

  useEffect(() => {
    const next = monthFromDate(selectedDate);
    if (!next) return;
    setCurrentYear(next.year);
    setCurrentMonth(next.month);
  }, [selectedDate]);

  const availableSet = useMemo(
    () => new Set((availableDates || []).map(dateKey).filter(Boolean)),
    [availableDates]
  );
  const highlightedSet = useMemo(
    () => new Set((highlightedDates || []).map(dateKey).filter(Boolean)),
    [highlightedDates]
  );
  const badges = useMemo(() => {
    const next = {};
    Object.entries(badgeMap || {}).forEach(([key, count]) => {
      next[dateKey(key)] = count;
    });
    return next;
  }, [badgeMap]);

  const restrictToAvailable = Array.isArray(availableDates);
  const minDateKey = dateKey(minDate) || localDateKey();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysArray = [];
  for (let i = 0; i < firstDayOfWeek; i++) daysArray.push(null);
  for (let d = 1; d <= totalDaysInMonth; d++) daysArray.push(d);

  const isSelected = (value) => {
    if (Array.isArray(selectedDate)) {
      return selectedDate.map(dateKey).includes(value);
    }
    return dateKey(selectedDate) === value;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs select-none">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-bold text-gray-800">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          <p className="text-[10px] text-gray-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {WEEKDAY_NAMES.map((w, idx) => (
          <span
            key={w}
            className={`text-[11px] font-bold py-1 ${
              idx === 0 || idx === 6 ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-11" />;
          }

          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isPast = dateStr < minDateKey;
          const isAvailable = restrictToAvailable ? availableSet.has(dateStr) : true;
          const isLocked = isPast || !isAvailable;
          const selected = isSelected(dateStr);
          const slotCount = Number(badges[dateStr] || 0);
          const isScheduled = highlightedSet.has(dateStr) || slotCount > 0;

          if (isLocked) {
            return (
              <div
                key={dateStr}
                title={isPast ? "Past date" : "No doctor appointments on this date"}
                className="h-11 flex flex-col items-center justify-center rounded-xl bg-gray-50 text-gray-300 text-xs font-medium cursor-not-allowed border border-transparent"
              >
                <span>{day}</span>
              </div>
            );
          }

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`h-11 flex flex-col items-center justify-center rounded-xl text-xs font-semibold transition cursor-pointer relative ${
                selected
                  ? "bg-pink-600 text-white shadow-xs ring-2 ring-pink-300 scale-105 z-10"
                  : isScheduled
                  ? "bg-pink-50 text-pink-700 border border-pink-300 hover:bg-pink-100 font-bold"
                  : "bg-white text-gray-700 hover:bg-pink-50 hover:text-pink-600 border border-gray-100"
              }`}
            >
              <span>{day}</span>
              {isScheduled && (
                <span
                  className={`text-[9px] font-bold px-1 rounded-full leading-none ${
                    selected ? "text-pink-100" : "text-pink-600"
                  }`}
                >
                  {slotCount > 0 ? `${slotCount} ${slotCount === 1 ? "slot" : "slots"}` : "open"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-md bg-pink-100 border border-pink-300" />
          <span>{highlightedSet.size > 0 || restrictToAvailable ? availableLabel : "Selectable"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-md bg-gray-100" />
          <span className="text-gray-400">Locked / Empty</span>
        </div>
      </div>
    </div>
  );
}
