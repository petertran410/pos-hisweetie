"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface TransferPlanningPaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export function TransferPlanningPagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
}: TransferPlanningPaginationProps) {
  const [jumpInput, setJumpInput] = useState("");
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const startRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(total, page * limit);

  // Generate page range around current page
  const getPageNumbers = () => {
    const delta = 2;
    const range: number[] = [];
    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    if (range[0] > 2) {
      pages.push("...");
    }

    range.forEach((p) => pages.push(p));

    if (range.length > 0 && range[range.length - 1] < totalPages - 1) {
      pages.push("...");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpInput.trim(), 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      onPageChange(target);
      setJumpInput("");
    }
  };

  return (
    <div
      className="px-4 py-3 border-t bg-white flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600"
      style={{ borderColor: "var(--dt-border)" }}>
      {/* 1. Trái: Hiển thị 25/50/100/200/trang */}
      <div className="flex items-center gap-2 text-xs">
        <span>Hiển thị:</span>
        <select
          value={limit}
          onChange={(e) => {
            onLimitChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-800 font-medium focus:outline-none focus:border-primary">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} / trang
            </option>
          ))}
        </select>
      </div>

      {/* 2. Giữa: Trang, nhảy đến trang */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {/* Đầu trang */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
            title="Trang đầu">
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Trang trước */}
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
            title="Trang trước">
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dãy số trang */}
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">
                  …
                </span>
              );
            }
            const isCurrent = p === page;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(Number(p))}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-colors ${
                  isCurrent
                    ? "bg-primary text-white shadow-sm font-semibold"
                    : "border hover:bg-gray-50 text-gray-700"
                }`}>
                {p}
              </button>
            );
          })}

          {/* Trang sau */}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
            title="Trang sau">
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Cuối trang */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
            title="Trang cuối">
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Nhảy đến trang */}
        <form onSubmit={handleJumpSubmit} className="flex items-center gap-1 ml-2">
          <span className="text-xs text-gray-500">Nhảy đến:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            placeholder={String(page)}
            className="w-12 h-7 px-1 text-center text-xs border border-gray-200 rounded focus:outline-none focus:border-primary"
          />
        </form>
      </div>

      {/* 3. Phải: Thông số trang hiện tại */}
      <div className="text-xs text-gray-500 font-mono text-right">
        Đang hiển thị <strong className="text-gray-800">{startRow}–{endRow}</strong> / {total} SKU
      </div>
    </div>
  );
}
