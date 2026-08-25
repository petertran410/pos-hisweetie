"use client";

import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { FactorySelect } from "@/components/factories/FactorySelect";

/** Một dòng nhà máy trên form sản phẩm. */
export interface FactoryMappingDraft {
  factoryId: number | null;
  role: "primary" | "backup";
}

/**
 * Chuyển state form → payload gửi backend.
 *
 * Bỏ dòng chưa chọn nhà máy, khử trùng (một nhà máy chỉ giữ một vai trò), và
 * đánh `priority` theo thứ tự hiển thị **trong từng nhóm** (0 = ưu tiên nhất).
 */
export function buildFactoryMappingsPayload(rows: FactoryMappingDraft[]) {
  const seen = new Set<number>();
  const counters: Record<"primary" | "backup", number> = {
    primary: 0,
    backup: 0,
  };

  return rows.flatMap((item) => {
    if (item.factoryId == null || seen.has(item.factoryId)) return [];
    seen.add(item.factoryId);
    return [
      {
        factoryId: item.factoryId,
        role: item.role,
        priority: counters[item.role]++,
      },
    ];
  });
}

interface ProductFactoryMappingsProps {
  value: FactoryMappingDraft[];
  onChange: (next: FactoryMappingDraft[]) => void;
  disabled?: boolean;
}

const ROLES: Array<{ role: "primary" | "backup"; title: string; hint: string }> =
  [
    {
      role: "primary",
      title: "Nhà máy chính",
      hint: "Nhà máy thường xuyên gia công. Thứ tự trên xuống là thứ tự ưu tiên.",
    },
    {
      role: "backup",
      title: "Nhà máy backup",
      hint: "Nhà máy dự phòng khi cần chuyển đổi.",
    },
  ];

/**
 * Gắn nhiều nhà máy cho một sản phẩm, chia theo vai trò chính/backup.
 *
 * Một nhà máy chỉ được xuất hiện **một lần** trên toàn bộ form (kể cả giữa hai
 * nhóm) — trùng với ràng buộc `@@unique([factoryId, productId])` ở DB.
 *
 * Thứ tự dòng trong mỗi nhóm chính là `priority` gửi xuống backend (0 = cao nhất).
 * Giá / MOQ / leadtime không sửa ở đây mà thuộc trang nhà máy.
 */
export function ProductFactoryMappings({
  value,
  onChange,
  disabled = false,
}: ProductFactoryMappingsProps) {
  const usedIds = value
    .map((item) => item.factoryId)
    .filter((id): id is number => id != null);

  const rowsOf = (role: "primary" | "backup") =>
    value
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.role === role);

  const addRow = (role: "primary" | "backup") => {
    onChange([...value, { factoryId: null, role }]);
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const setFactory = (index: number, factoryId: number | null) => {
    onChange(
      value.map((item, i) => (i === index ? { ...item, factoryId } : item))
    );
  };

  /** Đổi chỗ 2 dòng cùng nhóm để chỉnh thứ tự ưu tiên. */
  const swapRows = (indexA: number, indexB: number) => {
    const next = [...value];
    [next[indexA], next[indexB]] = [next[indexB], next[indexA]];
    onChange(next);
  };

  return (
    <div className="space-y-5">
      {ROLES.map(({ role, title, hint }) => {
        const rows = rowsOf(role);
        return (
          <div key={role}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {title}
                {rows.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-gray-400">
                    ({rows.length})
                  </span>
                )}
              </label>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => addRow(role)}
                  className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Thêm nhà máy
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-2">{hint}</p>

            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-400 text-center">
                Chưa gắn nhà máy nào
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map(({ item, index }, position) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="mt-2.5 w-5 text-xs text-gray-400 text-right shrink-0">
                      {position + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <FactorySelect
                        value={item.factoryId}
                        onChange={(factoryId) => setFactory(index, factoryId)}
                        excludeFactoryIds={usedIds}
                        placeholder="— Chọn nhà máy —"
                        disabled={disabled}
                      />
                    </div>
                    {!disabled && (
                      <div className="flex items-center gap-0.5 mt-1">
                        <button
                          type="button"
                          disabled={position === 0}
                          onClick={() =>
                            swapRows(index, rows[position - 1].index)
                          }
                          title="Tăng ưu tiên"
                          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={position === rows.length - 1}
                          onClick={() =>
                            swapRows(index, rows[position + 1].index)
                          }
                          title="Giảm ưu tiên"
                          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          title="Bỏ gắn"
                          className="p-1.5 rounded text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
