"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Check } from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";

interface SelectBranchModalProps {
  onClose: () => void;
  onConfirm: (sourceBranchId: number, destinationBranchId: number) => void;
}

// ── BranchDropdown ─────────────────────────────────────────────────────────────
function BranchDropdown({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: { value: number; label: string }[];
  value: number | null;
  placeholder: string;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-colors ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
            : "border-gray-200 hover:border-gray-300"
        } bg-white`}>
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                opt.value === value
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              <span className="truncate">{opt.label}</span>
              {opt.value === value && (
                <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function SelectBranchModal({
  onClose,
  onConfirm,
}: SelectBranchModalProps) {
  const { data: branchesData } = useBranches();
  const branches = (branchesData || []).filter((b) => b.isActive);
  const branchOptions = branches.map((b) => ({ value: b.id, label: b.name }));

  const [sourceBranchId, setSourceBranchId] = useState<number | null>(null);
  const [destinationBranchId, setDestinationBranchId] = useState<number | null>(
    null
  );

  const handleConfirm = () => {
    if (!sourceBranchId || !destinationBranchId) {
      alert("Vui lòng chọn chi nhánh đầu vào và chi nhánh đầu ra");
      return;
    }
    onConfirm(sourceBranchId, destinationBranchId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Chọn kho hàng</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Bạn cần chọn kho trước khi tạo phiếu
          </p>

          <div>
            <label className="block text-sm font-medium mb-1">
              Chi nhánh đầu vào
            </label>
            <BranchDropdown
              options={branchOptions}
              value={sourceBranchId}
              placeholder="Chọn kho"
              onChange={setSourceBranchId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Chi nhánh đầu ra
            </label>
            <BranchDropdown
              options={branchOptions}
              value={destinationBranchId}
              placeholder="Chọn kho"
              onChange={setDestinationBranchId}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
