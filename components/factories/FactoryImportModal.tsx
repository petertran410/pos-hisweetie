"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_URL, getAuthHeaders } from "@/lib/config/api";
import { factoriesApi, FactoryImportPreview, FactoryImportResult } from "@/lib/api/factories";

export function FactoryImportModal({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<FactoryImportPreview | null>(null);
  const [result, setResult] = useState<FactoryImportResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const previewMutation = useMutation({ mutationFn: factoriesApi.importPreview, onSuccess: setPreview, onError: (error: Error) => toast.error(error.message || "Không đọc được file") });
  const commitMutation = useMutation({ mutationFn: factoriesApi.importCommit, onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ["factories"] }); toast.success(`Đã import: ${data.created} tạo mới, ${data.updated} cập nhật`); }, onError: (error: Error) => toast.error(error.message || "Import thất bại") });
  const errors = preview?.rows.filter((row) => row.errors.length) ?? [];
  const displayRows = errors.length ? errors : preview?.rows ?? [];

  const selectFile = (selected?: File | null) => {
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".xlsx")) { toast.error("Chỉ hỗ trợ file .xlsx"); return; }
    setFile(selected); setPreview(null); setResult(null); previewMutation.mutate(selected);
  };
  const downloadTemplate = async () => {
    setDownloading(true);
    try { const headers = getAuthHeaders(); delete headers["Content-Type"]; const response = await fetch(`${API_URL}${factoriesApi.importTemplateUrl}`, { headers }); if (!response.ok) throw new Error("Không tải được file mẫu"); const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = "mau-import-nha-may.xlsx"; link.click(); URL.revokeObjectURL(url); } catch (error) { toast.error(error instanceof Error ? error.message : "Không tải được file mẫu"); } finally { setDownloading(false); }
  };
  const reset = () => { setFile(null); setPreview(null); setResult(null); if (inputRef.current) inputRef.current.value = ""; };
  const canCommit = !!file && !!preview && preview.invalid === 0 && preview.valid > 0;

  return createPortal(<div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center" onMouseDown={onClose}><div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl h-[92dvh] sm:h-auto sm:max-h-[85vh] sm:m-4 flex flex-col overflow-hidden shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
    <div className="border-b px-5 py-4 flex justify-between"><div><h2 className="text-base font-semibold">Import nhà máy</h2><p className="text-sm text-gray-500">Có mã thì đối chiếu theo mã; thiếu mã thì đối chiếu theo tên và tự sinh mã mới.</p></div><button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{!result ? <><div className="flex justify-between gap-3 text-sm text-gray-600"><p>File cần cột <b>Tên nhà máy</b>. NCC trong file phải tồn tại trong hệ thống.</p><button type="button" onClick={downloadTemplate} disabled={downloading} className="border rounded-lg px-3 py-1.5 inline-flex gap-1.5 shrink-0">{downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}File mẫu</button></div>
      <button type="button" onClick={() => inputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-brand">{file ? <><FileSpreadsheet className="w-8 h-8 text-brand" /><span className="text-sm font-medium">{file.name}</span><span className="text-xs text-gray-500">Bấm để chọn file khác</span></> : <><Upload className="w-8 h-8 text-gray-400" /><span className="text-sm text-gray-600">Bấm để chọn file Excel (.xlsx)</span></>}</button><input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={(event) => selectFile(event.target.files?.[0])} />
      {previewMutation.isPending && <p className="py-8 text-center text-sm text-gray-500"><Loader2 className="inline w-4 h-4 animate-spin mr-2" />Đang kiểm tra file...</p>}
      {preview && <div className="space-y-3"><div className="grid grid-cols-4 gap-2">{[["Tổng dòng", preview.total, "text-gray-900"], ["Tạo mới", preview.create, "text-emerald-600"], ["Cập nhật", preview.update, "text-blue-600"], ["Lỗi", preview.invalid, "text-red-600"]].map(([label, value, tone]) => <div key={String(label)} className="border rounded-lg px-3 py-2"><p className="text-xs text-gray-500">{label}</p><p className={`text-lg font-semibold ${tone}`}>{value}</p></div>)}</div>{preview.invalid > 0 && <div className="border border-red-200 bg-red-50 rounded-lg px-3 py-2 text-sm text-red-700 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />Còn {preview.invalid} dòng lỗi. Sửa file rồi tải lại; hệ thống không ghi dữ liệu khi còn lỗi.</div>}<div className="border rounded-lg overflow-hidden"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs">Dòng</th><th className="px-3 py-2 text-left text-xs">Mã nhà máy</th><th className="px-3 py-2 text-left text-xs">Tên nhà máy</th><th className="px-3 py-2 text-left text-xs">Kết quả</th></tr></thead><tbody className="divide-y">{displayRows.slice(0, 100).map((row) => <tr key={row.row}><td className="px-3 py-2 text-gray-500">{row.row}</td><td className="px-3 py-2">{row.resolvedCode || row.code || "—"}</td><td className="px-3 py-2">{row.name || "—"}{row.supplier && <span className="block text-xs text-gray-500">NCC: {row.supplier.name}</span>}</td><td className="px-3 py-2">{row.errors.length ? <span className="text-xs text-red-600">{row.errors.join("; ")}</span> : <span className={`text-xs px-2 py-0.5 rounded ${row.action === "create" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{row.action === "create" ? "Tạo mới" : "Cập nhật"}</span>}</td></tr>)}</tbody></table></div></div>}</> : <div className="py-10 text-center space-y-2"><CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" /><p className="font-semibold">Import thành công</p><p className="text-sm text-gray-600">{result.created} tạo mới, {result.updated} cập nhật trên tổng {result.total} dòng.</p></div>}</div>
    <div className="border-t px-5 py-3 flex justify-end gap-2">{result ? <><button type="button" onClick={reset} className="px-4 py-2 border rounded-lg text-sm">Import file khác</button><button type="button" onClick={onClose} className="px-4 py-2 bg-brand text-white rounded-lg text-sm">Đóng</button></> : <><button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Bỏ qua</button><button type="button" disabled={!canCommit || commitMutation.isPending} onClick={() => file && commitMutation.mutate(file)} className="px-4 py-2 bg-brand text-white rounded-lg text-sm disabled:opacity-50">{commitMutation.isPending ? "Đang import..." : preview ? `Import ${preview.valid} dòng` : "Import"}</button></>}</div>
  </div></div>, document.body);
}
