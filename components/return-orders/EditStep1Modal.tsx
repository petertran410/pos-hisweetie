"use client";

import { useState, useEffect } from "react";
import { X, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { useReturnOrder } from "@/lib/hooks/useReturnOrders";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth";
import { API_URL } from "@/lib/config/api";

interface EditStep1ModalProps {
  returnOrderId: number;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

interface Step1Item {
  detailId: number;
  productCode: string;
  productName: string;
  invoiceQuantity: number;
  requestQuantity: number;
  returnPrice: number;
  saleGoodQuantity: number;
  saleDamagedQuantity: number;
  saleNearExpiryQuantity: number;
  note: string;
}

export function EditStep1Modal({
  returnOrderId,
  onClose,
  onSubmit,
}: EditStep1ModalProps) {
  const { data: returnOrder, isLoading } = useReturnOrder(returnOrderId);
  const [items, setItems] = useState<Step1Item[]>([]);
  const [note, setNote] = useState("");
  const [images, setImages] = useState<
    { file?: File; preview: string; url?: string }[]
  >([]);

  useEffect(() => {
    if (returnOrder?.details) {
      setItems(
        returnOrder.details.map((d: any) => ({
          detailId: d.id,
          productCode: d.productCode,
          productName: d.productName,
          invoiceQuantity: Number(d.invoiceQuantity),
          requestQuantity: Number(d.requestQuantity),
          returnPrice: Number(d.returnPrice),
          saleGoodQuantity: Number(d.saleGoodQuantity || d.requestQuantity),
          saleDamagedQuantity: Number(d.saleDamagedQuantity || 0),
          saleNearExpiryQuantity: Number(d.saleNearExpiryQuantity || 0),
          note: d.note || "",
        }))
      );
      setNote(returnOrder.note || "");

      // Load saved images
      try {
        const saved = returnOrder.images ? JSON.parse(returnOrder.images) : [];
        if (saved.length > 0) {
          setImages(saved.map((url: string) => ({ preview: url, url })));
        }
      } catch {}
    }
  }, [returnOrder]);

  const updateItem = (
    index: number,
    field: keyof Step1Item,
    value: number | string
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };

        if (field === "requestQuantity") {
          updated.requestQuantity = Math.min(
            Math.max(0, Number(value)),
            item.invoiceQuantity
          );
          const remaining =
            updated.requestQuantity -
            updated.saleDamagedQuantity -
            updated.saleNearExpiryQuantity;
          updated.saleGoodQuantity = Math.max(0, remaining);
        }

        if (
          field === "saleGoodQuantity" ||
          field === "saleDamagedQuantity" ||
          field === "saleNearExpiryQuantity"
        ) {
          updated[field] = Math.max(0, Number(value));
          const total =
            updated.saleGoodQuantity +
            updated.saleDamagedQuantity +
            updated.saleNearExpiryQuantity;
          if (total > updated.requestQuantity) return item;
        }

        return updated;
      })
    );
  };

  const getSaleTotal = (item: Step1Item) =>
    item.saleGoodQuantity +
    item.saleDamagedQuantity +
    item.saleNearExpiryQuantity;

  const totalRefund = items.reduce(
    (sum, item) => sum + item.requestQuantity * item.returnPrice,
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
      if (file.size > 10 * 1024 * 1024) continue;
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [
          ...prev,
          { file, preview: reader.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const buildSubmitData = async (isDraft: boolean) => {
    const uploadedUrls: string[] = [];
    for (const img of images) {
      if (img.file) {
        const url = await uploadFile(img.file);
        uploadedUrls.push(url);
      } else if (img.url) {
        uploadedUrls.push(img.url);
      }
    }

    return {
      isDraft,
      images: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      details: items.map((item) => ({
        detailId: item.detailId,
        requestQuantity: item.requestQuantity,
        returnPrice: item.returnPrice,
        saleGoodQuantity: item.saleGoodQuantity,
        saleDamagedQuantity: item.saleDamagedQuantity,
        saleNearExpiryQuantity: item.saleNearExpiryQuantity,
        note: item.note,
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

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">Đang tải...</div>
      </div>
    );
  }

  const isDraft = returnOrder?.status === 7;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[1100px] min-h-[70vh] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">
              Phiếu trả hàng (Sale) - {returnOrder?.code}
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
                {returnOrder?.invoice?.code ||
                  [
                    ...new Set(
                      (returnOrder?.details || []).map(
                        (d: any) => d.invoiceCode
                      )
                    ),
                  ].join(", ")}
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

          {/* Bảng sản phẩm */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left">Sản phẩm</th>
                  <th className="px-2 py-2 text-right w-16">SL HĐ</th>
                  <th className="px-2 py-2 text-right w-20">SL trả</th>
                  <th className="px-2 py-2 text-right w-16">Hàng tốt</th>
                  <th className="px-2 py-2 text-right w-16">Loại B</th>
                  <th className="px-2 py-2 text-right w-16">Cận date</th>
                  <th className="px-2 py-2 text-right w-20">Tổng PL</th>
                  <th className="px-2 py-2 text-right w-24">Giá nhập lại</th>
                  <th className="px-2 py-2 text-right w-28">Thành tiền</th>
                  <th className="px-2 py-2 text-center w-12">✓</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const saleTotal = getSaleTotal(item);
                  return (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-2">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-gray-500">
                          {item.productCode}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {item.invoiceQuantity}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={item.invoiceQuantity}
                          value={item.requestQuantity}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "requestQuantity",
                              Number(e.target.value)
                            )
                          }
                          className="w-16 px-1 py-1 border rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={item.saleGoodQuantity}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "saleGoodQuantity",
                              Number(e.target.value)
                            )
                          }
                          className="w-14 px-1 py-1 border rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={item.saleDamagedQuantity}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "saleDamagedQuantity",
                              Number(e.target.value)
                            )
                          }
                          className="w-14 px-1 py-1 border rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={item.saleNearExpiryQuantity}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "saleNearExpiryQuantity",
                              Number(e.target.value)
                            )
                          }
                          className="w-14 px-1 py-1 border rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        {saleTotal}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={item.returnPrice}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "returnPrice",
                              Number(e.target.value)
                            )
                          }
                          className="w-20 px-1 py-1 border rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        {formatCurrency(
                          item.requestQuantity * item.returnPrice
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {saleTotal !== item.requestQuantity ? (
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

          {/* Hình ảnh */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Hình ảnh trả hàng (Sale)
            </label>
            <div className="flex flex-wrap gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20">
                  <img
                    src={img.preview}
                    alt=""
                    className="w-full h-full object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
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
              className="w-full border rounded px-3 py-2 text-sm resize-none"
              placeholder="Ghi chú..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50 shrink-0 rounded-b-xl">
          <div className="text-sm">
            <span className="text-gray-500">Tổng tiền trả: </span>
            <span className="text-lg font-bold text-red-600">
              {formatCurrency(totalRefund)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">
              Hủy
            </button>
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">
              Lưu phiếu tạm
            </button>
            <button
              onClick={handleComplete}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Hoàn thành bước 1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
