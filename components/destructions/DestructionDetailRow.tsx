"use client";

import { useState, useMemo, useEffect } from "react";
import { Destruction } from "@/lib/api/destructions";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  useCancelDestruction,
  useUpdateDestruction,
} from "@/lib/hooks/useDestructions";
import { useUsers } from "@/lib/hooks/useUsers";
import { toast } from "sonner";

interface DestructionDetailRowProps {
  destruction: Destruction;
  onClose: () => void;
}

const getStatusText = (status: number) => {
  switch (status) {
    case 1:
      return "Phiếu tạm";
    case 2:
      return "Hoàn thành";
    case 3:
      return "Đã hủy";
    default:
      return "Không xác định";
  }
};

const getStatusColor = (status: number) => {
  switch (status) {
    case 1:
      return "text-gray-600 bg-gray-100";
    case 2:
      return "text-green-600 bg-green-100";
    case 3:
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

export function DestructionDetailRow({
  destruction,
  onClose,
}: DestructionDetailRowProps) {
  const router = useRouter();
  const cancelDestruction = useCancelDestruction();
  const updateDestruction = useUpdateDestruction();
  const { data: users } = useUsers();

  const [searchCode, setSearchCode] = useState("");
  const [searchName, setSearchName] = useState("");
  const [note, setNote] = useState(destruction.note || "");
  const [createdById, setCreatedById] = useState(destruction.createdById);
  const [destructionDate, setDestructionDate] = useState(
    destruction.destructionDate
      ? new Date(destruction.destructionDate).toISOString().slice(0, 16)
      : ""
  );

  useEffect(() => {
    setNote(destruction.note || "");
    setCreatedById(destruction.createdById);
    setDestructionDate(
      destruction.destructionDate
        ? new Date(destruction.destructionDate).toISOString().slice(0, 16)
        : ""
    );
  }, [destruction]);

  const filteredDetails = useMemo(() => {
    return destruction.details.filter((detail) => {
      const matchCode = searchCode
        ? detail.productCode.toLowerCase().includes(searchCode.toLowerCase())
        : true;
      const matchName = searchName
        ? detail.productName.toLowerCase().includes(searchName.toLowerCase())
        : true;
      return matchCode && matchName;
    });
  }, [destruction.details, searchCode, searchName]);

  const handleCancel = async () => {
    if (!confirm("Bạn có chắc chắn muốn hủy phiếu xuất hủy này?")) {
      return;
    }

    try {
      await cancelDestruction.mutateAsync({
        id: destruction.id,
        data: {},
      });
      toast.success("Đã hủy phiếu xuất hủy");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra khi hủy phiếu");
    }
  };

  const handleOpenEdit = () => {
    router.push(`/san-pham/xuat-huy/${destruction.id}`);
  };

  const handleSave = async () => {
    try {
      const updateData: any = {
        note: note,
        createdById: createdById,
      };

      if (destructionDate) {
        updateData.destructionDate = new Date(destructionDate).toISOString();
      }

      await updateDestruction.mutateAsync({
        id: destruction.id,
        data: updateData,
      });
      toast.success("Đã lưu thông tin phiếu xuất hủy");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra khi lưu phiếu");
    }
  };

  const showCancelButton = destruction.status === 1 || destruction.status === 2;
  const showOpenButton = destruction.status === 1;
  const showSaveButton = true;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sm:max-w-[640px] md:max-w-[768px] lg:max-w-[830px] xl:max-w-[1090px] 2xl:max-w-[1520px]">
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-4">Thông tin chi tiết</h3>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-md text-gray-600 mb-1">Mã phiếu</p>
            <p className="text-md font-medium">{destruction.code}</p>
          </div>
          <div>
            <p className="text-md text-gray-600 mb-1">Chi nhánh</p>
            <p className="text-md">{destruction.branchName}</p>
          </div>
          <div>
            <p className="text-md text-gray-600 mb-1">Người xuất hủy</p>
            <select
              value={createdById}
              onChange={(e) => setCreatedById(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {users?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-md text-gray-600 mb-1">Ngày xuất hủy</p>
            <input
              type="datetime-local"
              value={destructionDate}
              onChange={(e) => setDestructionDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <p className="text-md text-gray-600 mb-1">Trạng thái</p>
            <span
              className={`px-2 py-1 rounded text-md font-medium ${getStatusColor(
                destruction.status
              )}`}>
              {getStatusText(destruction.status)}
            </span>
          </div>
          <div className="col-span-2">
            <p className="text-md text-gray-600 mb-1">Ghi chú</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập ghi chú..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Mã hàng</label>
            <input
              type="text"
              placeholder="Tìm mã hàng"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tên hàng</label>
            <input
              type="text"
              placeholder="Tìm tên hàng"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-md font-semibold text-gray-700">
                  Mã hàng
                </th>
                <th className="px-4 py-3 text-left text-md font-semibold text-gray-700">
                  Tên hàng
                </th>
                <th className="px-4 py-3 text-center text-md font-semibold text-gray-700">
                  SL hủy
                </th>
                <th className="px-4 py-3 text-right text-md font-semibold text-gray-700">
                  Giá vốn
                </th>
                <th className="px-4 py-3 text-right text-md font-semibold text-gray-700">
                  Giá trị hủy
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDetails.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500">
                    Không tìm thấy sản phẩm
                  </td>
                </tr>
              ) : (
                filteredDetails.map((detail, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-md text-blue-600 font-medium">
                      {detail.productCode}
                    </td>
                    <td className="px-4 py-3 text-md">{detail.productName}</td>
                    <td className="px-4 py-3 text-center text-md">
                      {detail.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-md">
                      {formatCurrency(Number(detail.price))}
                    </td>
                    <td className="px-4 py-3 text-right text-md font-medium">
                      {formatCurrency(Number(detail.totalValue))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-4 border-t flex justify-between items-center">
          <div>
            {showCancelButton && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50 text-md">
                Hủy
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {showOpenButton && (
              <button
                onClick={handleOpenEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-md">
                Mở phiếu
              </button>
            )}
            {showSaveButton && (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-md">
                Lưu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
