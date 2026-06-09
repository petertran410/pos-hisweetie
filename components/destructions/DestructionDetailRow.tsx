"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  useCancelDestruction,
  useUpdateDestruction,
  useDestruction,
} from "@/lib/hooks/useDestructions";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { toast } from "sonner";
import Link from "next/link";
import { CodeLink } from "@/components/shared/CodeLink";

interface DestructionDetailRowProps {
  destructionId: number;
  colSpan: number;
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
      return "bg-gray-100 text-gray-700";
    case 2:
      return "bg-green-100 text-green-700";
    case 3:
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export function DestructionDetailRow({
  destructionId,
  colSpan,
  onClose,
}: DestructionDetailRowProps) {
  const router = useRouter();
  const cancelDestruction = useCancelDestruction();
  const updateDestruction = useUpdateDestruction();
  const { data: users } = useUsersForFilter();
  const { data: destruction, isLoading } = useDestruction(destructionId);

  const [searchCode, setSearchCode] = useState("");
  const [searchName, setSearchName] = useState("");
  const [note, setNote] = useState("");
  const [createdById, setCreatedById] = useState(0);
  const [destructionDate, setDestructionDate] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sticky width theo scroll container (giống OrderDetailRow)
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let scrollEl: HTMLElement | null = el.parentElement;
    while (scrollEl) {
      const ox = getComputedStyle(scrollEl).overflowX;
      if (ox === "auto" || ox === "scroll") break;
      scrollEl = scrollEl.parentElement;
    }
    if (!scrollEl) return;
    const update = () => {
      el.style.width = `${scrollEl!.clientWidth}px`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [destruction]);

  useEffect(() => {
    if (destruction) {
      setNote(destruction.note || "");
      setCreatedById(destruction.createdById);
      setDestructionDate(
        destruction.destructionDate
          ? new Date(destruction.destructionDate).toISOString().slice(0, 16)
          : ""
      );
    }
  }, [destruction]);

  const filteredDetails = useMemo(() => {
    if (!destruction) return [];
    return destruction.details.filter((detail) => {
      const matchCode = searchCode
        ? detail.productCode.toLowerCase().includes(searchCode.toLowerCase())
        : true;
      const matchName = searchName
        ? detail.productName.toLowerCase().includes(searchName.toLowerCase())
        : true;
      return matchCode && matchName;
    });
  }, [destruction?.details, searchCode, searchName]);

  const handleCancel = async () => {
    if (!confirm("Bạn có chắc chắn muốn hủy phiếu xuất hủy này?")) {
      return;
    }
    try {
      await cancelDestruction.mutateAsync({
        id: destructionId,
        data: {},
      });
      toast.success("Đã hủy phiếu xuất hủy");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra khi hủy phiếu");
    }
  };

  const handleOpenEdit = () => {
    router.push(`/san-pham/xuat-huy/${destructionId}`);
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
        id: destructionId,
        data: updateData,
      });
      toast.success("Đã lưu thông tin phiếu xuất hủy");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra khi lưu phiếu");
    }
  };

  if (isLoading) {
    return (
      <tr className="bg-brand-soft">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            <span className="text-gray-600">
              Đang tải thông tin phiếu xuất hủy...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  if (!destruction) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy thông tin phiếu xuất hủy
        </td>
      </tr>
    );
  }

  const showCancelButton = destruction.status === 1 || destruction.status === 2;
  const showOpenButton = destruction.status === 1;

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand bg-gray-50">
        <div
          ref={wrapperRef}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="p-4">
              {/* Header */}
              <div className="flex border-b pb-2 items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    <CodeLink
                      entity="destruction"
                      code={destruction.code}
                      className="text-lg font-bold text-brand hover:underline"
                    />
                  </span>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                      destruction.status
                    )}`}>
                    {getStatusText(destruction.status)}
                  </span>
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  {destruction.branchName || "-"}
                </span>
              </div>

              {/* Info grid — editable */}
              <div className="grid grid-cols-3 gap-x-8 gap-y-3 pb-4 mb-4 border-b border-gray-200">
                <div className="flex flex-col gap-1">
                  <label className="block text-sm text-gray-500">
                    Người xuất hủy:
                  </label>
                  <select
                    value={createdById}
                    onChange={(e) => setCreatedById(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand">
                    {users?.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-sm text-gray-500">
                    Ngày xuất hủy:
                  </label>
                  <input
                    type="datetime-local"
                    value={destructionDate}
                    onChange={(e) => setDestructionDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-sm text-gray-500">
                    Tổng giá trị hủy:
                  </label>
                  <span className="block text-sm font-semibold text-gray-900 py-1.5">
                    {formatCurrency(Number(destruction.totalValue))}
                  </span>
                </div>
              </div>

              {/* Product search */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Tìm theo mã
                  </label>
                  <input
                    type="text"
                    placeholder="Tìm theo mã"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Tìm theo tên
                  </label>
                  <input
                    type="text"
                    placeholder="Tìm theo tên"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand"
                  />
                </div>
              </div>

              {/* Product table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Danh sách sản phẩm
                  </h4>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-[10px] py-2 text-left text-sm font-semibold text-gray-700 tracking-wider">
                          Mã hàng
                        </th>
                        <th className="px-[10px] py-2 text-left text-sm font-semibold text-gray-700 tracking-wider">
                          Tên hàng
                        </th>
                        <th className="px-[10px] py-2 text-center text-sm font-semibold text-gray-700 tracking-wider">
                          Số lượng
                        </th>
                        <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider">
                          Giá vốn
                        </th>
                        <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider">
                          Giá trị hủy
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDetails.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-sm text-gray-400">
                            Không tìm thấy sản phẩm
                          </td>
                        </tr>
                      ) : (
                        filteredDetails.map((detail, index) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 transition-colors">
                            <td className="px-[10px] py-2">
                              {detail.productCode ? (
                                <Link
                                  href={`/san-pham/danh-sach?Code=${detail.productCode}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-brand hover:underline inline-flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}>
                                  {detail.productCode}
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              ) : (
                                <span className="text-sm">-</span>
                              )}
                            </td>
                            <td className="px-[10px] py-2 text-sm text-gray-900">
                              {detail.productName}
                            </td>
                            <td className="px-[10px] py-2 text-center text-sm font-medium text-gray-900">
                              {detail.quantity}
                            </td>
                            <td className="px-[10px] py-2 text-right text-sm text-gray-900">
                              {formatCurrency(Number(detail.price))}
                            </td>
                            <td className="px-[10px] py-2 text-right text-sm font-semibold text-brand">
                              {formatCurrency(Number(detail.totalValue))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Note */}
              <div className="mt-4">
                <label className="block text-sm text-gray-500 mb-1.5">
                  Ghi chú:
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                  maxLength={1000}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand"
                  placeholder="Nhập ghi chú..."
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  {showCancelButton && (
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors">
                      Hủy
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {showOpenButton && (
                    <button
                      onClick={handleOpenEdit}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-brand rounded-full hover:bg-brand-dark transition-colors">
                      Mở phiếu
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
