"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { productQualityApi } from "@/lib/api/product-quality";
import {
  useProductQualityImportPreview,
  useProductQualityImportCommit,
  useImportLarkQualityTickets,
} from "@/lib/hooks/useProductQuality";
import type {
  QualityImportPreviewResult,
  QualityImportCommitResult,
} from "@/lib/api/product-quality";

interface ProductQualityImportModalProps {
  onClose: () => void;
}

export function ProductQualityImportModal({ onClose }: ProductQualityImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"excel" | "lark">("excel");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<QualityImportPreviewResult | null>(null);
  const [result, setResult] = useState<QualityImportCommitResult | null>(null);
  const [larkResult, setLarkResult] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  const previewMutation = useProductQualityImportPreview();
  const commitMutation = useProductQualityImportCommit();
  const larkMutation = useImportLarkQualityTickets();

  const handleSelectFile = (selected?: File | null) => {
    if (!selected) return;
    const name = selected.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      toast.error("Chỉ hỗ trợ file Excel (.xlsx hoặc .xls)");
      return;
    }
    setFile(selected);
    setPreview(null);
    setResult(null);

    previewMutation.mutate(selected, {
      onSuccess: (data) => setPreview(data),
    });
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      await productQualityApi.downloadTemplate();
      toast.success("Đã tải xuống file mẫu import sự cố chất lượng");
    } catch (err: any) {
      toast.error(err.message || "Không thể tải file mẫu");
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canCommit =
    !!file &&
    !!preview &&
    preview.invalid === 0 &&
    preview.valid > 0 &&
    !commitMutation.isPending;

  const handleCommit = () => {
    if (!file) return;
    commitMutation.mutate(file, {
      onSuccess: (data) => {
        setResult(data);
      },
    });
  };

  // Ưu tiên hiển thị các dòng có lỗi lên đầu
  const displayRows = preview
    ? [
        ...preview.rows.filter((r) => r.errors.length > 0),
        ...preview.rows.filter((r) => r.errors.length === 0),
      ].slice(0, 100)
    : [];

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl h-[92dvh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Nhập dữ liệu sự cố chất lượng
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Đồng bộ trực tiếp từ LarkBase hoặc import qua file Excel
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b px-6 pt-2 bg-gray-50/70 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("excel")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "excel"
                ? "border-brand text-brand bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Import từ File Excel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("lark")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "lark"
                ? "border-brand text-brand bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Đồng bộ trực tiếp từ LarkBase
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "lark" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1">
                <p className="font-semibold text-blue-900">
                  Kết nối trực tiếp bảng LarkBase (tblF032Qb8D2dcyd):
                </p>
                <p>• Hệ thống sẽ đọc toàn bộ 1.057+ bản ghi từ Base và tự động ánh xạ với khách hàng, sản phẩm, hóa đơn trên POS.</p>
                <p>• Hình ảnh và video minh chứng sẽ được tự động tải về thư mục máy chủ <code className="bg-blue-100 px-1 rounded">uploads/product-quality/</code>.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={larkMutation.isPending}
                  onClick={() => {
                    larkMutation.mutate(
                      { downloadMedia: false },
                      { onSuccess: (data) => setLarkResult(data) }
                    );
                  }}
                  className="p-4 border border-gray-200 rounded-xl text-left hover:border-brand hover:bg-brand-soft/20 transition-all">
                  <div className="font-bold text-sm text-gray-800 flex items-center gap-2">
                    {larkMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
                    1. Đồng bộ nhanh (Chỉ dữ liệu text)
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Chạy trong ~5-10 giây. Đồng bộ toàn bộ phiếu sự cố, người xử lý, khách hàng, sản phẩm và bỏ qua tải hình ảnh.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={larkMutation.isPending}
                  onClick={() => {
                    larkMutation.mutate(
                      { downloadMedia: true },
                      { onSuccess: (data) => setLarkResult(data) }
                    );
                  }}
                  className="p-4 border border-brand bg-brand-soft/30 rounded-xl text-left hover:bg-brand-soft/50 transition-all">
                  <div className="font-bold text-sm text-brand-dark flex items-center gap-2">
                    {larkMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
                    2. Đồng bộ toàn diện (Kèm tải hình ảnh & video)
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Đồng bộ dữ liệu và tải toàn bộ hình ảnh về thư mục <code className="bg-white/60 px-1 rounded">uploads/product-quality/</code>. Tự động bỏ qua các ảnh đã có.
                  </p>
                </button>
              </div>

              {larkResult && (
                <div className="border rounded-xl p-4 bg-gray-50 space-y-3 mt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-sm text-gray-900">
                      Kết quả đồng bộ từ LarkBase
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-3 rounded-lg border">
                      <span className="text-gray-400 block">Tổng bản ghi Lark</span>
                      <span className="text-base font-bold text-gray-800">{larkResult.totalFetched}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <span className="text-gray-400 block">Tạo mới / Cập nhật</span>
                      <span className="text-base font-bold text-emerald-600">
                        {larkResult.importedCount} mới / {larkResult.updatedCount || 0} sửa
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <span className="text-gray-400 block">Ảnh đã tải về POS</span>
                      <span className="text-base font-bold text-blue-600">
                        {larkResult.mediaStats?.downloaded || 0} file
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <span className="text-gray-400 block">Ảnh đã có sẵn</span>
                      <span className="text-base font-bold text-gray-600">
                        {larkResult.mediaStats?.skippedExisting || 0} file
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "excel" && (!result ? (
            <>
              {/* Template download & guide */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 border rounded-xl p-4 text-xs text-gray-600">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-800">
                    Quy tắc đọc dữ liệu:
                  </p>
                  <p>
                    • Có thể dùng file xuất từ LarkBase (bảng Chất Lượng Sản Phẩm) hoặc file mẫu POS.
                  </p>
                  <p>
                    • Bản ghi có mã cũ / Record ID đã có trên POS sẽ được <b>Cập nhật</b>; bản ghi mới sẽ được <b>Tạo mới</b>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloading}
                  className="px-3 py-2 border border-brand/40 bg-white hover:bg-brand-soft text-brand rounded-lg font-medium flex items-center gap-1.5 transition-colors shrink-0">
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />
                  ) : (
                    <Download className="w-4 h-4 text-brand" />
                  )}
                  <span>Tải file mẫu Excel</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-brand hover:bg-brand-soft/20 transition-all cursor-pointer">
                {file ? (
                  <>
                    <FileSpreadsheet className="w-9 h-9 text-brand" />
                    <span className="text-sm font-semibold text-gray-800">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      Bấm để chọn file khác
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-9 h-9 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      Bấm để tải lên hoặc kéo thả file Excel (.xlsx, .xls)
                    </span>
                    <span className="text-xs text-gray-400">
                      Dung lượng tối đa 15MB
                    </span>
                  </>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => handleSelectFile(e.target.files?.[0])}
              />

              {/* Loading preview state */}
              {previewMutation.isPending && (
                <div className="py-10 text-center space-y-2 text-gray-500">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto text-brand" />
                  <p className="text-sm font-medium">
                    Đang đọc dữ liệu và đối chiếu với khách hàng, sản phẩm, hóa đơn...
                  </p>
                </div>
              )}

              {/* Preview results */}
              {preview && (
                <div className="space-y-4">
                  {/* Summary metric cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="border rounded-xl p-3 bg-white">
                      <span className="text-xs text-gray-400 block">Tổng số dòng</span>
                      <span className="text-lg font-bold text-gray-800">
                        {preview.total}
                      </span>
                    </div>

                    <div className="border rounded-xl p-3 bg-white">
                      <span className="text-xs text-gray-400 block">Tạo mới</span>
                      <span className="text-lg font-bold text-emerald-600">
                        {preview.create}
                      </span>
                    </div>

                    <div className="border rounded-xl p-3 bg-white">
                      <span className="text-xs text-gray-400 block">Cập nhật</span>
                      <span className="text-lg font-bold text-blue-600">
                        {preview.update}
                      </span>
                    </div>

                    <div className="border rounded-xl p-3 bg-white">
                      <span className="text-xs text-gray-400 block">Dòng lỗi</span>
                      <span className="text-lg font-bold text-red-600">
                        {preview.invalid}
                      </span>
                    </div>
                  </div>

                  {/* Warning banner when error rows exist */}
                  {preview.invalid > 0 && (
                    <div className="border border-red-200 bg-red-50 rounded-xl p-3 text-xs text-red-700 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Còn {preview.invalid} dòng bị lỗi dữ liệu.</strong> Vui lòng sửa lại các dòng lỗi trong file Excel rồi tải lại. Hệ thống chỉ ghi dữ liệu khi tất cả các dòng đều hợp lệ.
                      </div>
                    </div>
                  )}

                  {/* Preview table */}
                  <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between text-xs text-gray-600">
                      <span className="font-semibold">
                        Chi tiết dòng kiểm tra (hiển thị tối đa 100 dòng):
                      </span>
                      <span>
                        Khớp: {preview.matchedCustomers} khách, {preview.matchedProducts} SP, {preview.matchedInvoices} HĐ
                      </span>
                    </div>

                    <div className="max-h-64 overflow-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0">
                          <tr>
                            <th className="px-3 py-2 w-12 text-center">Dòng</th>
                            <th className="px-3 py-2">Mã phiếu</th>
                            <th className="px-3 py-2">Khách hàng</th>
                            <th className="px-3 py-2">Sản phẩm</th>
                            <th className="px-3 py-2 w-16 text-right">SL</th>
                            <th className="px-3 py-2">Phân loại</th>
                            <th className="px-3 py-2">Người phụ trách</th>
                            <th className="px-3 py-2">Trạng thái</th>
                            <th className="px-3 py-2">Kết quả</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {displayRows.map((row) => (
                            <tr
                              key={row.row}
                              className={
                                row.errors.length > 0
                                  ? "bg-red-50/60 hover:bg-red-50"
                                  : "hover:bg-gray-50"
                              }>
                              <td className="px-3 py-2 text-center text-gray-400 font-mono">
                                {row.row}
                              </td>
                              <td className="px-3 py-2 font-mono text-brand">
                                {row.legacyCode || "—"}
                              </td>
                              <td className="px-3 py-2 max-w-[140px] truncate" title={row.customerName}>
                                {row.customerName}
                              </td>
                              <td className="px-3 py-2 max-w-[160px] truncate" title={row.productName}>
                                {row.productName}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {row.quantity}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                                {row.initialClassification}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                                {row.decisionMakerName || "—"}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {row.errors.length > 0 ? (
                                  <span className="text-red-600 font-medium">
                                    {row.errors.join("; ")}
                                  </span>
                                ) : row.action === "update" ? (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    Cập nhật
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Tạo mới
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Success confirmation card */
            <div className="py-12 text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">
                  Import dữ liệu thành công!
                </h3>
                <p className="text-sm text-gray-600">
                  Đã ghi <b>{result.importedCount} phiếu tạo mới</b> và{" "}
                  <b>{result.updatedCount} phiếu cập nhật</b> trên tổng số{" "}
                  {result.total} dòng.
                </p>
                <p className="text-xs text-gray-400">
                  Đối chiếu: {result.matchedCustomers} khách hàng, {result.matchedProducts} sản phẩm, {result.matchedInvoices} hóa đơn.
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="border-t px-6 py-4 flex items-center justify-end gap-3 bg-gray-50">
          {activeTab === "lark" ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors shadow-sm">
              Đóng
            </button>
          ) : result ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors">
                Import file khác
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors shadow-sm">
                Đóng
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors">
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCommit}
                disabled={!canCommit}
                className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm">
                {commitMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                <span>
                  {commitMutation.isPending
                    ? "Đang ghi vào hệ thống..."
                    : preview
                    ? `Bắt đầu Import ${preview.valid} phiếu`
                    : "Import"}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
