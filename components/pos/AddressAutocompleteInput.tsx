"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import {
  autocompleteAddress,
  TrackAsiaPrediction,
} from "@/lib/api/trackasia";

interface Props {
  value: string;
  /** Cập nhật khi người dùng gõ tay (giữ đồng bộ với form.address) */
  onChange: (text: string) => void;
  /** Người dùng chọn 1 gợi ý từ dropdown */
  onSelect: (prediction: TrackAsiaPrediction) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Ô nhập địa chỉ chi tiết kèm gợi ý autocomplete từ TrackAsia.
 * - Debounce 300ms, huỷ request cũ bằng AbortController.
 * - Chỉ gọi API khi đã gõ >= 2 ký tự.
 * - Lỗi mạng -> không gợi ý, người dùng vẫn nhập tay bình thường.
 */
export function AddressAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}: Props) {
  const [predictions, setPredictions] = useState<TrackAsiaPrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Bỏ qua lần fetch ngay sau khi vừa chọn 1 gợi ý (tránh mở lại dropdown).
  const skipNextFetch = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce + abort theo value
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    const q = (value || "").trim();
    if (q.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      const result = await autocompleteAddress(q, controller.signal);
      if (controller.signal.aborted) return;
      setPredictions(result);
      setIsOpen(result.length > 0);
      setLoading(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  // Click ngoài -> đóng dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (p: TrackAsiaPrediction) => {
    skipNextFetch.current = true;
    setIsOpen(false);
    setPredictions([]);
    onSelect(p);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (predictions.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />

      {loading && (
        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
      )}

      {isOpen && predictions.length > 0 && (
        <div className="absolute z-[10000] left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-start gap-2 transition-colors border-b last:border-b-0">
              <MapPin className="w-4 h-4 text-brand mt-0.5 shrink-0" />
              <span className="flex flex-col">
                <span className="text-sm text-gray-900">
                  {p.structured_formatting?.main_text || p.description}
                </span>
                <span className="text-xs text-gray-500">
                  {p.formatted_address || p.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
