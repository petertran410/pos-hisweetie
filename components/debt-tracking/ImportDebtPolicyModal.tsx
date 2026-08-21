"use client";

import { useState, useRef } from "react";
import {
  X,
  Loader2,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import {
  PolicyImportPreview,
  describeDebtPolicy,
} from "@/lib/api/debt-tracking";
import {
  usePreviewDebtPolicyImport,
  useCommitDebtPolicyImport,
  useDownloadDebtPolicyTemplate,
} from "@/lib/hooks/useDebtTracking";

const fmt = (n: number | null) =>
  n === null || n === undefined ? "—" : Math.round(n).toLocaleString("vi-VN");

export function ImportDebtPolicyModal({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PolicyImportPreview | null>(null);
  const [tab, setTab] = useState<"error" | "warning" | "ok">("error");

  const previewMut = usePreviewDebtPolicyImport();
  const commitMut = useCommitDebtPolicyImport();
  const templateMut = useDownloadDebtPolicyTemplate();

  const pickFile = (f: File | null) => {
    setFile(f);
    setPreview(null);
    if (!f) return;
    previewMut.mutate(f, {
      onSuccess: (res) => {
        setPreview(res);
        setTab(res.invalid > 0 ? "error" : res.warningCount > 0 ? "warning" : "ok");
      },
    });
  };

  const handleCommit = () => {
    if (!file) return;
    commitMut.mutate(file, { onSuccess: onClose });
  };

  const errorRows = preview?.rows.filter((r) => r.errors.length) ?? [];
  const warningRows =
    preview?.rows.filter((r) => !r.errors.length && r.warnings.length) ?? [];
  const okRows = preview?.rows.filter((r) => !r.errors.length) ?? [];

  const shownRows =
    tab === "error" ? errorRows : tab === "warning" ? warningRows : okRows;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h3 className="font-semibold">Import thiết lập công nợ</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Thiết lập hàng loạt từ file Excel — chỉ ghi vào thiết lập công
              nợ, không đụng tới số nợ hay sổ quỹ.
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-auto flex-1">
          {/* Chọn file */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded hover:bg-gray-50"
            >
              <Upload className="w-4 h-4" />
              Chọn file Excel
            </button>
            <button
              onClick={() => templateMut.mutate()}
              disabled={templateMut.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {templateMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Tải file mẫu
            </button>

            {file && (
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 ml-1">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                {file.name}
              </span>
            )}
          </div>

          {previewMut.isPending && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang kiểm tra file…
            </div>
          )}

          {previewMut.isError && !preview && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {previewMut.error instanceof Error
                ? previewMut.error.message
                : "Không đọc được file"}
            </div>
          )}

          {preview && (
            <>
              {/* Tổng quan */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                <Stat label="Tổng dòng" value={preview.total} />
                <Stat
                  label="Hợp lệ"
                  value={preview.valid}
                  tone="text-green-600"
                />
                <Stat
                  label="Lỗi"
                  value={preview.invalid}
                  tone={preview.invalid > 0 ? "text-red-600" : "text-gray-400"}
                />
                <Stat label="Tạo mới" value={preview.create} />
                <Stat label="Ghi đè" value={preview.update} />
              </div>

              {preview.invalid > 0 ? (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-800">
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Còn <b>{preview.invalid}</b> dòng lỗi nên chưa import được.
                    Hãy sửa trong Excel theo danh sách bên dưới rồi chọn lại
                    file.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-800">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    File hợp lệ. Sẽ tạo mới <b>{preview.create}</b> và ghi đè{" "}
                    <b>{preview.update}</b> thiết lập.
                  </span>
                </div>
              )}

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b">
                <TabBtn
                  active={tab === "error"}
                  onClick={() => setTab("error")}
                  label={`Lỗi (${errorRows.length})`}
                  tone="text-red-600"
                />
                <TabBtn
                  active={tab === "warning"}
                  onClick={() => setTab("warning")}
                  label={`Cảnh báo (${warningRows.length})`}
                  tone="text-amber-600"
                />
                <TabBtn
                  active={tab === "ok"}
                  onClick={() => setTab("ok")}
                  label={`Hợp lệ (${okRows.length})`}
                  tone="text-green-600"
                />
              </div>

              {/* Bảng chi tiết */}
              <div className="border rounded overflow-auto max-h-[320px]">
                {shownRows.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    Không có dòng nào
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 text-xs text-gray-600 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium w-16">
                          Dòng
                        </th>
                        <th className="text-left px-3 py-2 font-medium">
                          Mã khách
                        </th>
                        {tab === "ok" ? (
                          <>
                            <th className="text-left px-3 py-2 font-medium">
                              Tên khách
                            </th>
                            <th className="text-left px-3 py-2 font-medium">
                              Thiết lập
                            </th>
                            <th className="text-right px-3 py-2 font-medium">
                              Hạn mức
                            </th>
                            <th className="text-left px-3 py-2 font-medium w-24">
                              Thao tác
                            </th>
                          </>
                        ) : (
                          <th className="text-left px-3 py-2 font-medium">
                            {tab === "error" ? "Lỗi" : "Cảnh báo"}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {shownRows.map((r) => (
                        <tr key={r.row} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400 tabular-nums">
                            {r.row}
                          </td>
                          <td className="px-3 py-2 font-medium max-w-[180px] truncate">
                            {r.code || (
                              <span className="text-gray-300">(trống)</span>
                            )}
                          </td>
                          {tab === "ok" ? (
                            <>
                              <td className="px-3 py-2 max-w-[220px] truncate">
                                {r.customerName ?? "—"}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {describeDebtPolicy({
                                  hasCreditLimit: r.hasCreditLimit,
                                  hasTermDays: r.hasTermDays,
                                  termDays: r.termDays,
                                  paymentFrequency: r.paymentFrequency,
                                  creditLimit: r.creditLimitValue,
                                  debtForm: r.debtFormValue,
                                  salePic: null,
                                  accountantPic: null,
                                })}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-xs">
                                {fmt(r.creditLimitValue)}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full border ${
                                    r.action === "update"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  }`}
                                >
                                  {r.action === "update" ? "Ghi đè" : "Tạo mới"}
                                </span>
                              </td>
                            </>
                          ) : (
                            <td className="px-3 py-2 text-xs">
                              {(tab === "error" ? r.errors : r.warnings).map(
                                (m, i) => (
                                  <div
                                    key={i}
                                    className={
                                      tab === "error"
                                        ? "text-red-600"
                                        : "text-amber-700"
                                    }
                                  >
                                    {m}
                                  </div>
                                )
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {warningRows.length > 0 && tab !== "warning" && (
                <div className="flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {warningRows.length} dòng có cảnh báo nhưng vẫn import được.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t">
          <span className="text-xs text-gray-400">
            Mỗi dòng đúng 1 mã khách. Khách đã có thiết lập sẽ bị ghi đè.
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
            >
              Đóng
            </button>
            <button
              onClick={handleCommit}
              disabled={!preview?.canCommit || commitMut.isPending}
              className="px-4 py-2 text-sm bg-brand text-white rounded hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-2"
            >
              {commitMut.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Import {preview?.valid ? `(${preview.valid} dòng)` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-gray-800",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="border rounded px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? `border-brand ${tone}` : "border-transparent text-gray-500"
      }`}
    >
      {label}
    </button>
  );
}
