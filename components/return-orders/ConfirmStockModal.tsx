"use client";

import { useState, useEffect } from "react";
import { X, Camera, ChevronDown, ChevronUp, Printer } from "lucide-react";
import { useReturnOrder } from "@/lib/hooks/useReturnOrders";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth";
import { API_URL } from "@/lib/config/api";
import { useCan } from "@/lib/hooks/useCan";
import { printEntity } from "@/lib/utils/print";
import Swal from "sweetalert2";

interface ConfirmStockModalProps {
  returnOrderId: number;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

interface ConfirmItem {
  detailId: number;
  productCode: string;
  productName: string;
  requestQuantity: number;
  goodQuantity: number;
  damagedQuantity: number;
  nearExpiryQuantity: number;
  returnPrice: number;
  saleGoodQuantity: number;
  saleDamagedQuantity: number;
  saleNearExpiryQuantity: number;
}

export function ConfirmStockModal({
  returnOrderId,
  onClose,
  onSubmit,
}: ConfirmStockModalProps) {
  const { data: returnOrder, isLoading } = useReturnOrder(returnOrderId);
  const canPrint = useCan("print_templates", "view");
  const [isPrinting, setIsPrinting] = useState(false);
  const [confirmItems, setConfirmItems] = useState<ConfirmItem[]>([]);
  const [note, setNote] = useState("");
  const [stockImages, setStockImages] = useState<
    { file?: File; preview: string; url?: string }[]
  >([]);
  const [showStep1Images, setShowStep1Images] = useState(false);
  const [displays, setDisplays] = useState<Record<string, string>>({});

  // Parse step 1 images
  const step1Images: string[] = (() => {
    try {
      return returnOrder?.images ? JSON.parse(returnOrder.images) : [];
    } catch {
      return [];
    }
  })();

  useEffect(() => {
    if (returnOrder?.details) {
      setConfirmItems(
        returnOrder.details.map((d: any) => {
          const hasSaleData =
            Number(d.saleGoodQuantity || 0) > 0 ||
            Number(d.saleDamagedQuantity || 0) > 0 ||
            Number(d.saleNearExpiryQuantity || 0) > 0;
          const hasKhoData =
            Number(d.goodQuantity || 0) > 0 ||
            Number(d.damagedQuantity || 0) > 0 ||
            Number(d.nearExpiryQuantity || 0) > 0;

          let goodQty: number, damagedQty: number, nearExpiryQty: number;

          if (returnOrder.status === 6 && hasKhoData) {
            // Đã có draft kho → dùng giá trị đã lưu
            goodQty = Number(d.goodQuantity);
            damagedQty = Number(d.damagedQuantity);
            nearExpiryQty = Number(d.nearExpiryQuantity);
          } else if (hasSaleData) {
            // Mới từ Step 1 → default kho = sale values
            goodQty = Number(d.saleGoodQuantity);
            damagedQty = Number(d.saleDamagedQuantity);
            nearExpiryQty = Number(d.saleNearExpiryQuantity);
          } else {
            // Fallback
            goodQty = Number(d.requestQuantity);
            damagedQty = 0;
            nearExpiryQty = 0;
          }

          return {
            detailId: d.id,
            productCode: d.productCode,
            productName: d.productName,
            requestQuantity: Number(d.requestQuantity),
            goodQuantity: goodQty,
            damagedQuantity: damagedQty,
            nearExpiryQuantity: nearExpiryQty,
            returnPrice: Number(d.returnPrice),
            saleGoodQuantity: Number(d.saleGoodQuantity || 0),
            saleDamagedQuantity: Number(d.saleDamagedQuantity || 0),
            saleNearExpiryQuantity: Number(d.saleNearExpiryQuantity || 0),
          };
        })
      );
      setNote(returnOrder.note || "");

      // Load saved stock images (draft)
      try {
        const saved = returnOrder.stockImages
          ? JSON.parse(returnOrder.stockImages)
          : [];
        if (saved.length > 0) {
          setStockImages(saved.map((url: string) => ({ preview: url, url })));
        }
      } catch {}
    }
  }, [returnOrder]);

  const updateItem = (
    index: number,
    field: "goodQuantity" | "damagedQuantity" | "nearExpiryQuantity",
    value: number
  ) => {
    setConfirmItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: Math.max(0, value) };
        const total =
          updated.goodQuantity +
          updated.damagedQuantity +
          updated.nearExpiryQuantity;
        // Giới hạn tổng không vượt requestQuantity
        if (total > item.requestQuantity) {
          return item; // Không cho phép vượt
        }
        return updated;
      })
    );
  };

  const getTotalConfirmed = (item: ConfirmItem) =>
    item.goodQuantity + item.damagedQuantity + item.nearExpiryQuantity;

  const totalRefund = confirmItems.reduce(
    (sum, item) => sum + getTotalConfirmed(item) * item.returnPrice,
    0
  );

  // Image upload
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = useAuthStore.getState().token;
    const res = await fetch(`${API_URL}/upload/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    const result = await res.json();
    return result.url;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) continue;
      const reader = new FileReader();
      reader.onloadend = () => {
        setStockImages((prev) => [
          ...prev,
          { file, preview: reader.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeStockImage = (index: number) => {
    setStockImages((prev) => prev.filter((_, i) => i !== index));
  };

  const getDisplay = (index: number, field: string, value: number): string => {
    const key = `${index}_${field}`;
    if (displays[key] !== undefined) return displays[key];
    return value === 0 ? "" : String(value);
  };

  const handleFieldChange = (
    index: number,
    field: "goodQuantity" | "damagedQuantity" | "nearExpiryQuantity",
    rawValue: string
  ) => {
    const key = `${index}_${field}`;
    const onlyNumbers = rawValue.replace(/[^\d]/g, "");
    setDisplays((prev) => ({ ...prev, [key]: onlyNumbers }));
    const parsed = onlyNumbers === "" ? 0 : parseInt(onlyNumbers, 10);
    updateItem(index, field, parsed);
  };

  const handleFieldBlur = (index: number, field: string) => {
    const key = `${index}_${field}`;
    setDisplays((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const buildSubmitData = async (isDraft: boolean) => {
    // Upload new images
    const uploadedUrls: string[] = [];
    for (const img of stockImages) {
      if (img.file) {
        const url = await uploadFile(img.file);
        uploadedUrls.push(url);
      } else if (img.url) {
        uploadedUrls.push(img.url);
      }
    }

    return {
      isDraft,
      stockImages: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      details: confirmItems.map((item) => ({
        detailId: item.detailId,
        confirmedQuantity: getTotalConfirmed(item),
        goodQuantity: item.goodQuantity,
        damagedQuantity: item.damagedQuantity,
        nearExpiryQuantity: item.nearExpiryQuantity,
      })),
      note,
    };
  };

  const handleSaveDraft = async () => {
    const data = await buildSubmitData(true);
    onSubmit(data);
  };

  const handleComplete = async () => {
    const data = await buildSubmitData(false);
    onSubmit(data);
  };

  const handlePrint = async () => {
    if (!returnOrder) return;
    setIsPrinting(true);
    try {
      await printEntity("return_order", returnOrder.id);
    } catch (e: any) {
      Swal.fire("Lỗi", e?.message || "In thất bại", "error");
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">Đang tải...</div>
      </div>
    );
  }

  const isDraft = returnOrder?.status === 6;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[1100px] min-h-[70vh] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">
              Nhập hàng trả - {returnOrder?.code}
            </h2>
            {isDraft && (
              <span className="text-xs text-orange-600 font-medium">
                (Phiếu tạm)
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Info */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-gray-500">Hóa đơn:</span>{" "}
                {returnOrder?.invoice?.code}
              </div>
              <div>
                <span className="text-gray-500">Khách hàng:</span>{" "}
                {returnOrder?.customer?.name || "Khách lẻ"}
              </div>
              <div>
                <span className="text-gray-500">Người tạo:</span>{" "}
                {returnOrder?.createdByName}
              </div>
            </div>
          </div>

          {/* Hình ảnh bước 1 */}
          {step1Images.length > 0 && (
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowStep1Images(!showStep1Images)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <span>Ảnh từ sale ({step1Images.length} ảnh)</span>
                {showStep1Images ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showStep1Images && (
                <div className="px-3 pb-3 flex flex-wrap gap-2">
                  {step1Images.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`Ảnh sale ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded border hover:opacity-80"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bảng sản phẩm */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left">Sản phẩm</th>
                  <th className="px-2 py-2 text-right w-20">SL yêu cầu</th>
                  <th className="px-2 py-2 text-center w-28">Hàng tốt</th>
                  <th className="px-2 py-2 text-center w-28">Bục rách</th>
                  <th className="px-2 py-2 text-center w-28">Cận date</th>
                  <th className="px-2 py-2 text-right w-24">Tổng thực nhận</th>
                  <th className="px-2 py-2 text-right w-24">Giá nhập lại</th>
                  <th className="px-2 py-2 text-right w-28">Thành tiền</th>
                  <th className="px-2 py-2 text-center w-16">So sánh</th>
                </tr>
              </thead>
              <tbody>
                {confirmItems.map((item, idx) => {
                  const totalConfirmed = getTotalConfirmed(item);
                  return (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-2">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-gray-500">
                          {item.productCode}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {item.requestQuantity}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs text-gray-400 w-6 text-right">
                            {item.saleGoodQuantity}
                          </span>
                          <span className="text-gray-300">|</span>
                          <input
                            type="text"
                            value={getDisplay(
                              idx,
                              "goodQuantity",
                              item.goodQuantity
                            )}
                            onChange={(e) =>
                              handleFieldChange(
                                idx,
                                "goodQuantity",
                                e.target.value
                              )
                            }
                            onBlur={() => handleFieldBlur(idx, "goodQuantity")}
                            className="w-14 px-1 py-1 border rounded text-right text-sm"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs text-gray-400 w-6 text-right">
                            {item.saleDamagedQuantity}
                          </span>
                          <span className="text-gray-300">|</span>
                          <input
                            type="text"
                            value={getDisplay(
                              idx,
                              "damagedQuantity",
                              item.damagedQuantity
                            )}
                            onChange={(e) =>
                              handleFieldChange(
                                idx,
                                "damagedQuantity",
                                e.target.value
                              )
                            }
                            onBlur={() =>
                              handleFieldBlur(idx, "damagedQuantity")
                            }
                            className="w-14 px-1 py-1 border rounded text-right text-sm"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs text-gray-400 w-6 text-right">
                            {item.saleNearExpiryQuantity}
                          </span>
                          <span className="text-gray-300">|</span>
                          <input
                            type="text"
                            value={getDisplay(
                              idx,
                              "nearExpiryQuantity",
                              item.nearExpiryQuantity
                            )}
                            onChange={(e) =>
                              handleFieldChange(
                                idx,
                                "nearExpiryQuantity",
                                e.target.value
                              )
                            }
                            onBlur={() =>
                              handleFieldBlur(idx, "nearExpiryQuantity")
                            }
                            className="w-14 px-1 py-1 border rounded text-right text-sm"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        {totalConfirmed}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {formatCurrency(item.returnPrice)}
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        {formatCurrency(totalConfirmed * item.returnPrice)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {totalConfirmed !== item.requestQuantity ? (
                          <span className="text-orange-500 text-lg">⚠</span>
                        ) : (
                          <span className="text-green-500 text-lg">✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Hình ảnh kho (bước 2) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Hình ảnh kiểm hàng (kho)
            </label>
            <div className="flex flex-wrap gap-3">
              {stockImages.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20">
                  <img
                    src={img.preview}
                    alt=""
                    className="w-full h-full object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeStockImage(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    ✕
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 text-gray-400">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Camera className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Thêm ảnh</span>
              </label>
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg resize-none text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50 shrink-0 rounded-b-xl">
          <div className="text-sm">
            <span className="text-gray-500">Tổng hoàn tiền: </span>
            <span className="text-lg font-bold text-red-600">
              {formatCurrency(totalRefund)}
            </span>
          </div>
          <div className="flex gap-2">
            {canPrint && (
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                title="In phiếu trả hàng"
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100 flex items-center gap-1.5 disabled:opacity-50">
                <Printer className="w-4 h-4" />
                {isPrinting ? "Đang in..." : "In"}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">
              Hủy
            </button>
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-orange-400 text-orange-600 rounded-lg text-sm hover:bg-orange-50">
              Lưu phiếu tạm
            </button>
            <button
              onClick={handleComplete}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              Xác nhận nhập hàng trả
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
