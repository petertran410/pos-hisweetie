"use client";

import { Edit, CheckCircle, XCircle } from "lucide-react";
import { ActionGuard } from "@/components/permissions/ActionGuard";

interface BranchesTableProps {
  branches: any[];
  isLoading: boolean;
  onEdit: (branch: any) => void;
}

export function BranchesTable({
  branches,
  isLoading,
  onEdit,
}: BranchesTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Tên chi nhánh
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">Mã</th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Số điện thoại
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Địa chỉ
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold">
              Trạng thái
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {branches.map((branch) => (
            <tr key={branch.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-medium">{branch.name}</td>
              <td className="px-6 py-4 text-sm">{branch.code || "-"}</td>
              <td className="px-6 py-4 text-sm">
                {branch.contactNumber || "-"}
              </td>
              <td className="px-6 py-4 text-sm">{branch.email || "-"}</td>
              <td className="px-6 py-4 text-sm">{branch.address || "-"}</td>
              <td className="px-6 py-4 text-center">
                {branch.isActive ? (
                  <CheckCircle className="w-5 h-5 text-green-600 inline" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 inline" />
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-2">
                  <ActionGuard
                    resource="branches"
                    itemData={branch}
                    actionType="edit">
                    <button
                      onClick={() => onEdit(branch)}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Sửa">
                      <Edit className="w-4 h-4" />
                    </button>
                  </ActionGuard>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {branches.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Chưa có chi nhánh nào
        </div>
      )}
    </div>
  );
}
