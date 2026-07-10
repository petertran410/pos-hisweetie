"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Pencil, Power, PowerOff } from "lucide-react";
import Swal from "sweetalert2";
import {
  useContractSigners,
  useCreateSigner,
  useUpdateSigner,
  useDeleteSigner,
} from "@/lib/hooks/useContracts";
import { usePermission } from "@/lib/hooks/usePermissions";
import SignerEditModal from "@/components/contracts/SignerEditModal";
import type { ContractSigner } from "@/lib/types/contract";

export default function ContractSignersPage() {
  const canManage = usePermission("contracts", "manage_signers");

  const [search, setSearch] = useState("");
  const { data: signers, isLoading } = useContractSigners(canManage);
  const createMutation = useCreateSigner();
  const updateMutation = useUpdateSigner();
  const deleteMutation = useDeleteSigner();

  const filtered = useMemo(() => {
    if (!signers) return [];
    const kw = search.trim().toLowerCase();
    if (!kw) return signers;
    return signers.filter(
      (s: ContractSigner) =>
        (s.name || "").toLowerCase().includes(kw) ||
        s.documensoEmail.toLowerCase().includes(kw) ||
        (s.department || "").toLowerCase().includes(kw) ||
        (s.code || "").toLowerCase().includes(kw),
    );
  }, [signers, search]);

  if (!canManage) return null;

  async function handleAdd() {
    await SignerEditModal.fire({
      initial: {
        documensoEmail: "",
        name: "",
        department: "",
        code: "",
        isActive: true,
      },
      isEdit: false,
      createMutation,
      updateMutation,
      deleteMutation,
    });
  }

  async function handleEdit(s: ContractSigner) {
    await SignerEditModal.fire({
      initial: {
        documensoEmail: s.documensoEmail,
        name: s.name || "",
        department: s.department || "",
        code: s.code || "",
        isActive: s.isActive,
      },
      isEdit: true,
      editId: s.id,
      createMutation,
      updateMutation,
      deleteMutation,
    });
  }

  async function handleToggle(s: ContractSigner) {
    const next = !s.isActive;
    const label = s.name || s.documensoEmail;
    const confirm = await Swal.fire({
      title: next ? "Bật lại người ký?" : "Ẩn người ký này?",
      text: next
        ? `${label} sẽ xuất hiện lại trong dropdown ký.`
        : `${label} sẽ bị ẩn khỏi dropdown ký (không xóa hoàn toàn).`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: next ? "Bật lại" : "Ẩn",
      cancelButtonText: "Huỷ",
    });
    if (!confirm.isConfirmed) return;
    updateMutation.mutate({ id: s.id, data: { isActive: next } });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Người ký hợp đồng</h1>
            <p className="text-gray-600 mt-1">
              Danh sách nhân viên được phép ký thay công ty (BÊN A) khi tạo hợp
              đồng 2 bên trên Documenso. Email ở đây phải trùng với tài khoản
              Documenso của nhân viên đó — Documenso sẽ gửi mail kèm link ký
              cho đúng email này.
            </p>
          </div>
          <button
            onClick={handleAdd}
            disabled={createMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Thêm người ký
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, phòng ban, mã..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  Họ tên
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  Email Documenso
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  Phòng ban
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  Mã
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  Trạng thái
                </th>
                <th className="w-28 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    {signers?.length === 0
                      ? "Chưa có người ký nào. Bấm 'Thêm người ký' để bắt đầu."
                      : "Không tìm thấy người ký phù hợp."}
                  </td>
                </tr>
              )}
              {!isLoading &&
                filtered.map((s: ContractSigner) => (
                  <tr
                    key={s.id}
                    className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium align-top">
                      {s.name || (
                        <span className="text-gray-400 italic">(chưa đặt)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 align-top">
                      {s.documensoEmail}
                    </td>
                    <td className="px-4 py-3 text-gray-600 align-top">
                      {s.department || (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 align-top">
                      {s.code || (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-600"
                        }`}>
                        {s.isActive ? "Đang ký" : "Đã ẩn"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleEdit(s)}
                          disabled={
                            updateMutation.isPending ||
                            deleteMutation.isPending
                          }
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 disabled:opacity-40"
                          title="Sửa">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(s)}
                          disabled={
                            updateMutation.isPending ||
                            deleteMutation.isPending
                          }
                          className={`p-1.5 rounded disabled:opacity-40 ${
                            s.isActive
                              ? "hover:bg-orange-50 text-orange-600"
                              : "hover:bg-green-50 text-green-600"
                          }`}
                          title={s.isActive ? "Ẩn" : "Bật lại"}>
                          {s.isActive ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}