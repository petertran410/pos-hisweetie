"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  useCreateCustomerGroup,
  useUpdateCustomerGroup,
  useDeleteCustomerGroup,
} from "@/lib/hooks/useCustomerGroups";
import { useBranchStore } from "@/lib/store/branch";

interface CustomerGroupFormProps {
  isOpen: boolean;
  onClose: () => void;
  group?: {
    id: number;
    name: string;
    discount?: number;
    description?: string;
  };
}

export function CustomerGroupForm({
  isOpen,
  onClose,
  group,
}: CustomerGroupFormProps) {
  const [name, setName] = useState("");
  const [discount, setDiscount] = useState("");
  const [description, setDescription] = useState("");
  const { selectedBranch } = useBranchStore();

  console.log(selectedBranch);

  const createGroup = useCreateCustomerGroup();
  const updateGroup = useUpdateCustomerGroup();
  const deleteGroup = useDeleteCustomerGroup();

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDiscount(group.discount ? String(group.discount) : "");
      setDescription(group.description || "");
    } else {
      setName("");
      setDiscount("");
      setDescription("");
    }
  }, [group, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    const data = {
      name: name.trim(),
      discount: discount ? Number(discount) : undefined,
      description: description.trim() || undefined,
    };

    if (group) {
      updateGroup.mutate(
        { id: group.id, data },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      createGroup.mutate(data, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  const handleDelete = () => {
    if (!group) return;

    if (
      confirm(
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[960px]">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {group ? "Chỉnh sửa nhóm khách hàng" : "Thêm nhóm khách hàng"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                Cho phép khách hàng thuộc nhóm này được giảm giá trên đơn hàng
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ghi chú</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập ghi chú"
              className="w-full border rounded-xl px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
            />
          </div>

          <div className="flex justify-between pt-4">
            {group ? (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50">
                  Xóa
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border rounded hover:bg-gray-50">
                    Bỏ qua
                  </button>
                  <button
                    type="submit"
                    disabled={createGroup.isPending || updateGroup.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                    {updateGroup.isPending ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border rounded hover:bg-gray-50">
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  disabled={createGroup.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                  {createGroup.isPending ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
