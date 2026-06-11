"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Plus, Pencil, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";
import {
  useBorderGates,
  useCreateBorderGate,
  useUpdateBorderGate,
  useDeleteBorderGate,
} from "@/lib/hooks/useBorderGates";

interface Props {
  value?: number;
  onChange: (id: number | undefined) => void;
}

/** Combobox chọn cửa khẩu + thêm/sửa/xóa inline (giống quản lý nhóm KH). */
export function BorderGateSelect({ value, onChange }: Props) {
  const { data: gates } = useBorderGates();
  const createMutation = useCreateBorderGate();
  const updateMutation = useUpdateBorderGate();
  const deleteMutation = useDeleteBorderGate();

  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = gates?.find((g) => g.id === value);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(
      { name },
      {
        onSuccess: (g) => {
          onChange(g.id);
          setNewName("");
          setAdding(false);
        },
      }
    );
  };

  const handleEdit = (id: number) => {
    const name = editName.trim();
    if (!name) return;
    updateMutation.mutate(
      { id, data: { name } },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const handleDelete = async (id: number, name: string) => {
    const res = await Swal.fire({
      title: "Xóa cửa khẩu?",
      text: `Cửa khẩu "${name}" sẽ bị xóa (hoặc ẩn nếu đang được dùng).`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc2626",
    });
    if (res.isConfirmed) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          if (value === id) onChange(undefined);
        },
      });
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm bg-white transition-colors ${
          open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"
        }`}>
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {selected ? selected.name : "Chọn cửa khẩu"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left ${
                !value
                  ? "bg-brand-soft text-brand-dark font-medium"
                  : "hover:bg-gray-50 text-gray-500"
              }`}>
              <span>Không chọn</span>
              {!value && <Check className="w-3.5 h-3.5 text-brand" />}
            </button>
            {(gates || []).map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-1 px-3 py-1.5 border-t border-gray-50 hover:bg-gray-50 group">
                {editingId === g.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEdit(g.id)}
                      className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    <button
                      type="button"
                      onClick={() => handleEdit(g.id)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(g.id);
                        setOpen(false);
                      }}
                      className="flex-1 flex items-center justify-between text-sm text-left">
                      <span
                        className={
                          value === g.id
                            ? "text-brand-dark font-medium"
                            : "text-gray-700"
                        }>
                        {g.name}
                      </span>
                      {value === g.id && (
                        <Check className="w-3.5 h-3.5 text-brand" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(g.id);
                        setEditName(g.name);
                      }}
                      className="p-1 text-gray-400 hover:text-brand opacity-0 group-hover:opacity-100">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(g.id, g.name)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 p-2">
            {adding ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Tên cửa khẩu mới"
                  className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="p-1 text-green-600 hover:bg-green-50 rounded">
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setNewName("");
                  }}
                  className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-brand hover:bg-brand-soft rounded">
                <Plus className="w-4 h-4" />
                Thêm cửa khẩu
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
