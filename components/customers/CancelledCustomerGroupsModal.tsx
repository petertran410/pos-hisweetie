"use client";

import { X } from "lucide-react";
import Swal from "sweetalert2";
import {
  useCancelledCustomerGroups,
  useRestoreCustomerGroup,
} from "@/lib/hooks/useCustomerGroups";
import { useCan } from "@/lib/hooks/useCan";
import type { CancelledCustomerGroup } from "@/lib/api/customer-groups";

interface CancelledCustomerGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Danh sách nhóm khách hàng đã hủy (dữ liệu vẫn được giữ lại) + khôi phục.
export function CancelledCustomerGroupsModal({
  isOpen,
  onClose,
}: CancelledCustomerGroupsModalProps) {
  const { data, isLoading } = useCancelledCustomerGroups(isOpen);
  const restoreGroup = useRestoreCustomerGroup();
  const canRestore = useCan("customer_groups", "update");
  const groups = data?.data || [];

  if (!isOpen) return null;

  const handleRestore = async (group: CancelledCustomerGroup) => {
    const res = await Swal.fire({
      title: `Khôi phục nhóm "${group.name}"?`,
      text: "Nhóm sẽ dùng lại được nhưng không tự thêm lại khách đã gỡ.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Khôi phục",
      cancelButtonText: "Không làm gì",
    });
    if (res.isConfirmed) restoreGroup.mutate(group.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Nhóm khách hàng đã hủy</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {isLoading ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Đang tải...
            </p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Chưa có nhóm nào bị hủy
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3 font-medium">Tên nhóm</th>
                  <th className="py-2 pr-3 font-medium">Mô tả</th>
                  <th className="py-2 pr-3 font-medium whitespace-nowrap">
                    Ngày tạo
                  </th>
                  {canRestore && <th className="py-2" />}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 text-gray-700">{group.name}</td>
                    <td className="py-2 pr-3 text-gray-500">
                      {group.description || "—"}
                    </td>
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                      {new Date(group.createdAt).toLocaleDateString("vi-VN")}
                      {group.creator?.name ? ` · ${group.creator.name}` : ""}
                    </td>
                    {canRestore && (
                      <td className="py-2 text-right">
                        <button
                          onClick={() => handleRestore(group)}
                          disabled={restoreGroup.isPending}
                          className="px-3 py-1 text-brand border border-brand rounded hover:bg-brand-soft disabled:opacity-50 whitespace-nowrap">
                          Khôi phục
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="border-t px-6 py-3 text-xs text-gray-500">
          Ai hủy, lúc nào và danh sách khách đã gỡ: xem Cài đặt → Lịch sử thao
          tác (mục Khách hàng).
        </p>
      </div>
    </div>
  );
}
