"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { printTemplatesApi } from "@/lib/api/print-templates";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function VariablesPage() {
  const [selectedType, setSelectedType] = useState("invoice");
  const [editModal, setEditModal] = useState(false);
  const [editingVar, setEditingVar] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: variables, isLoading } = useQuery({
    queryKey: ["print-variables-all", selectedType],
    queryFn: () => printTemplatesApi.getAllVariables(selectedType),
  });

  const deleteMutation = useMutation({
    mutationFn: printTemplatesApi.deleteVariable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-variables-all"] });
      toast.success("Đã xóa biến");
    },
  });

  const handleDelete = (id: number) => {
    if (!confirm("Xác nhận xóa biến này?")) return;
    deleteMutation.mutate(id);
  };

  const groupedVars = (variables || []).reduce((acc: any, v: any) => {
    if (!acc[v.group]) acc[v.group] = [];
    acc[v.group].push(v);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Quản lý biến mẫu in</h1>
        <button
          onClick={() => {
            setEditingVar(null);
            setEditModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg">
          <Plus className="w-4 h-4" />
          Thêm biến
        </button>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="border-b p-4">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border rounded px-3 py-2">
            <option value="invoice">Hóa đơn</option>
            <option value="order">Đơn hàng</option>
            <option value="purchase_order">Phiếu nhập hàng</option>
          </select>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            Object.entries(groupedVars).map(([group, vars]: any) => (
              <div key={group} className="mb-6">
                <h3 className="font-medium mb-3">{group}</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Key</th>
                      <th className="px-4 py-2 text-left">Label</th>
                      <th className="px-4 py-2 text-left">Mô tả</th>
                      <th className="px-4 py-2 text-center">Thứ tự</th>
                      <th className="px-4 py-2 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vars.map((v: any) => (
                      <tr key={v.id} className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">{v.key}</td>
                        <td className="px-4 py-2">{v.label}</td>
                        <td className="px-4 py-2 text-gray-500">
                          {v.description || "-"}
                        </td>
                        <td className="px-4 py-2 text-center">{v.sortOrder}</td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingVar(v);
                                setEditModal(true);
                              }}
                              className="p-1 hover:bg-gray-100 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="p-1 hover:bg-red-100 rounded text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </div>

      {editModal && (
        <VariableEditModal
          variable={editingVar}
          templateFor={selectedType}
          onClose={() => setEditModal(false)}
        />
      )}
    </div>
  );
}

function VariableEditModal({ variable, templateFor, onClose }: any) {
  const [formData, setFormData] = useState({
    templateFor: variable?.templateFor || templateFor,
    key: variable?.key || "",
    label: variable?.label || "",
    group: variable?.group || "",
    description: variable?.description || "",
    sortOrder: variable?.sortOrder || 0,
  });
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      variable
        ? printTemplatesApi.updateVariable(variable.id, data)
        : printTemplatesApi.createVariable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-variables-all"] });
      toast.success(variable ? "Đã cập nhật biến" : "Đã tạo biến");
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">
          {variable ? "Sửa biến" : "Thêm biến mới"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Key</label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) =>
                setFormData({ ...formData, key: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              disabled={!!variable}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) =>
                setFormData({ ...formData, label: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nhóm</label>
            <input
              type="text"
              value={formData.group}
              onChange={(e) =>
                setFormData({ ...formData, group: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Thứ tự</label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) =>
                setFormData({ ...formData, sortOrder: +e.target.value })
              }
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Hủy
          </button>
          <button
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg">
            {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
