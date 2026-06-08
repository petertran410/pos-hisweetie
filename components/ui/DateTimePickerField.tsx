"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";

const formatDateTime = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const parseDateTime = (value: string): Date | null => {
  const parts = value.trim().split(" ");
  if (parts.length !== 2) return null;

  const dateParts = parts[0].split("/");
  const timeParts = parts[1].split(":");

  if (dateParts.length !== 3 || timeParts.length !== 2) return null;

  const day = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1;
  const year = parseInt(dateParts[2]);
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);

  if (
    isNaN(day) ||
    isNaN(month) ||
    isNaN(year) ||
    isNaN(hours) ||
    isNaN(minutes)
  ) {
    return null;
  }

  const result = new Date(year, month, day, hours, minutes);
  if (isNaN(result.getTime())) return null;
  return result;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

interface DateTimePickerFieldProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  min?: Date | null;
}

export function DateTimePickerField({
  value,
  onChange,
  placeholder,
  className,
  min,
}: DateTimePickerFieldProps) {
  const [typedValue, setTypedValue] = useState(
    value ? formatDateTime(value) : ""
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentDate = value ?? new Date();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
        setShowTimePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setTypedValue(value ? formatDateTime(value) : "");
  }, [value]);

  const handleBlur = () => {
    const trimmed = typedValue.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }
    const parsed = parseDateTime(trimmed);
    if (!parsed) {
      setTypedValue(value ? formatDateTime(value) : "");
      return;
    }
    if (min && parsed < min) {
      setTypedValue(value ? formatDateTime(value) : "");
      return;
    }
    onChange(parsed);
  };

  const handleDateSelect = (date: Date) => {
    const newDateTime = new Date(currentDate);
    newDateTime.setFullYear(date.getFullYear());
    newDateTime.setMonth(date.getMonth());
    newDateTime.setDate(date.getDate());
    onChange(newDateTime);
    setShowDatePicker(false);
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    const newDateTime = new Date(currentDate);
    newDateTime.setHours(hours);
    newDateTime.setMinutes(minutes);
    onChange(newDateTime);
    setShowTimePicker(false);
  };

  const minDay = min ? startOfDay(min) : null;

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <input
        type="text"
        value={typedValue}
        onChange={(e) => setTypedValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder ?? "DD/MM/YYYY HH:mm"}
        className="w-full px-3 py-2 border rounded-lg pr-20 text-gray-900 placeholder:text-gray-400"
      />
      <div className="absolute right-3 top-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setShowDatePicker((v) => !v);
            setShowTimePicker(false);
          }}>
          <Calendar className="w-4 h-4 text-gray-400 cursor-pointer" />
        </button>
        <button
          type="button"
          onClick={() => {
            setShowTimePicker((v) => !v);
            setShowDatePicker(false);
          }}>
          <Clock className="w-4 h-4 text-gray-400 cursor-pointer" />
        </button>
      </div>

      {showDatePicker && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-4 z-50">
          <div className="text-center mb-2">
            <select
              value={currentDate.getMonth()}
              onChange={(e) => {
                const newDate = new Date(currentDate);
                newDate.setMonth(Number(e.target.value));
                onChange(newDate);
              }}
              className="border rounded px-2 py-1 mr-2">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  Tháng {i + 1}
                </option>
              ))}
            </select>
            <select
              value={currentDate.getFullYear()}
              onChange={(e) => {
                const newDate = new Date(currentDate);
                newDate.setFullYear(Number(e.target.value));
                onChange(newDate);
              }}
              className="border rounded px-2 py-1">
              {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() - 5 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 42 }, (_, i) => {
              const firstDay = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                1
              );
              const startDay = firstDay.getDay();
              const dayNumber = i - startDay + 1;
              const daysInMonth = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1,
                0
              ).getDate();

              if (dayNumber < 1 || dayNumber > daysInMonth) {
                return <div key={i} className="w-8 h-8" />;
              }

              const candidate = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                dayNumber
              );
              const isDisabled = !!minDay && candidate < minDay;
              const isSelected =
                value !== null &&
                dayNumber === currentDate.getDate() &&
                value.getMonth() === currentDate.getMonth() &&
                value.getFullYear() === currentDate.getFullYear();

              return (
                <button
                  key={i}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    handleDateSelect(candidate);
                  }}
                  className={`w-8 h-8 rounded ${
                    isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "hover:bg-brand-soft"
                  } ${isSelected ? "bg-brand text-white" : ""}`}>
                  {dayNumber}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showTimePicker && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-4 z-50 w-64">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2">Giờ</label>
              <div className="h-40 overflow-y-auto border rounded">
                {Array.from({ length: 24 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      handleTimeSelect(i, currentDate.getMinutes())
                    }
                    className={`w-full px-2 py-1 text-left hover:bg-brand-soft ${
                      value !== null && i === currentDate.getHours()
                        ? "bg-brand text-white"
                        : ""
                    }`}>
                    {String(i).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2">Phút</label>
              <div className="h-40 overflow-y-auto border rounded">
                {Array.from({ length: 60 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTimeSelect(currentDate.getHours(), i)}
                    className={`w-full px-2 py-1 text-left hover:bg-brand-soft ${
                      value !== null && i === currentDate.getMinutes()
                        ? "bg-brand text-white"
                        : ""
                    }`}>
                    {String(i).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
