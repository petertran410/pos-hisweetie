"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { customerGroupsApi } from "@/lib/api/customer-groups";
import { usersApi } from "@/lib/api/users";
import { toast } from "sonner";

interface CustomerGroupFormProps {
  group?: any;
  onClose: () => void;
}

const CONDITION_FIELDS = [
  { value: "totalDebt", label: "Công nợ hiện tại" },
  { value: "birthMonth", label: "Tháng sinh" },
  { value: "age", label: "Tuổi" },
  { value: "gender", label: "Giới tính" },
  { value: "location", label: "Khu vực" },
  { value: "type", label: "Loại khách" },
];

const OPERATORS = [
  { value: ">", label: ">" },
  { value: ">=", label: ">=" },
  { value: "=", label: "=" },
  { value: "<", label: "<" },
  { value: "<=", label: "<=" },
];

export function CustomerGroupForm({ group, onClose }: CustomerGroupFormProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"info" | "advanced">("info");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(group?.name || "");
  const [discount, setDiscount] = useState(group?.discount?.toString() || "");
  const [description, setDescription] = useState(group?.description || "");

  const [conditions, setConditions] = useState<
    Array<{
      field: string;
      operator: string;
      value: string;
    }>
  >(group?.autoAddConditions || []);

  const [autoUpdateMode, setAutoUpdateMode] = useState<string>(
    group?.autoUpdateMode || "add_by_condition"
  );
  const [autoExecute, setAutoExecute] = useState(group?.autoExecute || false);

  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(
    group?.allowedUserIds || []
  );
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.getUsers(),
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createGroup = useMutation({
    mutationFn: customerGroupsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success("Tạo nhóm khách hàng thành công");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể tạo nhóm khách hàng");
    },
  });

  const updateGroup = useMutation({
    mutationFn: (data: any) => customerGroupsApi.update(group.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success("Cập nhật nhóm khách hàng thành công");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể cập nhật nhóm khách hàng");
    },
  });

  const deleteGroup = useMutation({
    mutationFn: customerGroupsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success("Xóa nhóm khách hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể xóa nhóm khách hàng");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Vui lòng nhập tên nhóm");
      return;
    }

    const data = {
      name: name.trim(),
      discount: discount ? parseFloat(discount) : undefined,
      description: description.trim() || undefined,
      allowedUserIds: selectedUserIds.length > 0 ? selectedUserIds : [],
      autoAddConditions: conditions.length > 0 ? conditions : undefined,
      autoUpdateMode: conditions.length > 0 ? autoUpdateMode : undefined,
      autoExecute: conditions.length > 0 ? autoExecute : false,
    };

    if (group) {
      updateGroup.mutate(data);
    } else {
      createGroup.mutate(data);
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        "Bạn có chắc chắn muốn xóa nhóm khách hàng này? Hành động này không thể hoàn tác!"
      )
    ) {
      deleteGroup.mutate(group.id, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: "totalDebt", operator: ">", value: "" },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[960px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold">
            {group ? "Chỉnh sửa nhóm khách hàng" : "Thêm nhóm khách hàng"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b flex-shrink-0">
          <div className="flex px-6">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "info"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}>
              Thông tin
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("advanced")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "advanced"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}>
              Nâng cao
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {activeTab === "info" && (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tên nhóm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập tên nhóm"
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Giảm giá (%)
                  </label>
                  <input
                    type="text"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cho phép khách hàng thuộc nhóm này được giảm giá trên đơn
                    hàng
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Ghi chú
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập ghi chú"
                  className="w-full border rounded-xl px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
              </div>
            </div>
          )}

          {activeTab === "advanced" && (
            <div className="p-6 space-y-6">
              {/* Phân quyền user */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Gắn user vào nhóm khách hàng
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Chỉ những user được chọn mới có thể xem và thao tác với khách
                  hàng thuộc nhóm này
                </p>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="w-full border rounded px-3 py-2 text-left flex items-center justify-between">
                    <span className="text-sm">
                      {selectedUserIds.length === 0
                        ? "Tất cả user (không giới hạn)"
                        : `${selectedUserIds.length} user được chọn`}
                    </span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {showUserDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 space-y-1">
                        {usersData?.map((user: any) => (
                          <label
                            key={user.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={() => toggleUser(user.id)}
                              className="cursor-pointer"
                            />
                            <span className="text-sm">{user.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Thiết lập điều kiện */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    Thiết lập điều kiện thêm khách hàng vào nhóm
                  </label>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    Thêm điều kiện
                  </button>
                </div>

                <div className="space-y-3">
                  {conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={condition.field}
                        onChange={(e) =>
                          updateCondition(index, "field", e.target.value)
                        }
                        className="flex-1 border rounded px-3 py-2 text-sm">
                        {CONDITION_FIELDS.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={condition.operator}
                        onChange={(e) =>
                          updateCondition(index, "operator", e.target.value)
                        }
                        className="border rounded px-3 py-2 text-sm w-20">
                        {OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={condition.value}
                        onChange={(e) =>
                          updateCondition(index, "value", e.target.value)
                        }
                        placeholder="Nhập giá trị"
                        className="flex-1 border rounded px-3 py-2 text-sm"
                      />

                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radio options - LUÔN HIỂN THỊ */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="autoUpdateMode"
                    value="add_by_condition"
                    checked={autoUpdateMode === "add_by_condition"}
                    onChange={(e) => setAutoUpdateMode(e.target.value)}
                  />
                  <span className="text-sm">
                    Thêm khách hàng vào nhóm theo điều kiện
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="autoUpdateMode"
                    value="refresh_by_condition"
                    checked={autoUpdateMode === "refresh_by_condition"}
                    onChange={(e) => setAutoUpdateMode(e.target.value)}
                  />
                  <span className="text-sm">
                    Cập nhật lại danh sách theo điều kiện
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="autoUpdateMode"
                    value="no_update"
                    checked={autoUpdateMode === "no_update"}
                    onChange={(e) => setAutoUpdateMode(e.target.value)}
                  />
                  <span className="text-sm">
                    Không cập nhật danh sách khách hàng
                  </span>
                </label>
              </div>

              {/* Checkbox tự động thực hiện - CHỈ HIỂN THỊ KHI CÓ ĐIỀU KIỆN */}
              {conditions.length > 0 && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoExecute}
                      onChange={(e) => setAutoExecute(e.target.checked)}
                    />
                    <span className="text-sm flex items-center gap-1">
                      Hệ thống thực hiện tự động
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-between border-t p-6 flex-shrink-0">
          {group ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteGroup.isPending}
                className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50">
                {deleteGroup.isPending ? "Đang xóa..." : "Xóa"}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border rounded hover:bg-gray-50">
                  Hủy
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={updateGroup.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  {updateGroup.isPending ? "Đang lưu..." : "Cập nhật"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded hover:bg-gray-50">
                Hủy
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={createGroup.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                {createGroup.isPending ? "Đang tạo..." : "Lưu"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
