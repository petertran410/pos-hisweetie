"use client";

interface ColumnVisibilityModalProps {
  visibleColumns: { [key: string]: boolean };
  onToggle: (column: string) => void;
  onClose: () => void;
}

const COLUMNS = [
  { key: "code", label: "Mã nhà cung cấp" },
  { key: "name", label: "Tên nhà cung cấp" },
  { key: "contactNumber", label: "Điện thoại" },
  { key: "groupName", label: "Nhóm nhà cung cấp" },
  { key: "email", label: "Email" },
  { key: "address", label: "Địa chỉ" },
  { key: "location", label: "Khu vực" },
  { key: "wardName", label: "Phường/Xã" },
  { key: "totalDebt", label: "Nợ hiện tại" },
  { key: "totalInvoiced", label: "Tổng mua" },
  { key: "totalInvoicedWithoutReturn", label: "Tổng mua trừ trả hàng" },
  { key: "taxCode", label: "Mã số thuế" },
  { key: "contactPerson", label: "Người liên hệ" },
  { key: "createdAt", label: "Ngày tạo" },
  { key: "updatedAt", label: "Ngày cập nhật" },
  { key: "isActive", label: "Trạng thái" },
];

export function ColumnVisibilityModal({
  visibleColumns,
  onToggle,
  onClose,
}: ColumnVisibilityModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Ẩn/hiện cột</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {COLUMNS.map((column) => (
            <label
              key={column.key}
              className="flex items-center gap-2 py-2 cursor-pointer hover:bg-gray-50 px-2 rounded">
              <input
                type="checkbox"
                checked={visibleColumns[column.key]}
                onChange={() => onToggle(column.key)}
                className="w-4 h-4"
              />
              <span className="text-sm">{column.label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
