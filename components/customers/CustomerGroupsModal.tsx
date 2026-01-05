"use client";

import { X } from "lucide-react";

interface CustomerGroup {
  id: number;
  customerGroupId: number;
  customerGroup: {
    id: number;
    name: string;
  };
}

interface CustomerGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerGroups: CustomerGroup[];
  customerName: string;
}

export function CustomerGroupsModal({
  isOpen,
  onClose,
  customerGroups,
  customerName,
}: CustomerGroupsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            Nhóm khách hàng - {customerName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {customerGroups.length > 0 ? (
            <div className="space-y-3">
              {customerGroups.map((group) => (
                <div
                  key={group.id}
                  className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="font-medium">{group.customerGroup.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Khách hàng chưa thuộc nhóm nào
            </div>
          )}
        </div>

        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
