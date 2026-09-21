"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { customerDemandApi } from "@/lib/api/customer-demand";
import { useCommitCustomerDemandLarkSync } from "@/lib/hooks/useCustomerDemand";
import type {
  CustomerDemandLarkSyncPreview,
  CustomerDemandLarkSyncResult,
  CustomerDemandLarkVoucherSplitPreview,
  CustomerDemandLarkVoucherSplitResult,
} from "@/lib/types/customer-demand";
import {
  DemandButton,
  DemandModalShell,
  formatDemandMonth,
  formatDemandQty,
} from "./DemandUi";

export function CustomerDemandLarkSyncModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const commit = useCommitCustomerDemandLarkSync();
  const requestIdRef = useRef(0);
  const [previewData, setPreviewData] =
    useState<CustomerDemandLarkSyncPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(true);
  const [voucherSplitPreview, setVoucherSplitPreview] =
    useState<CustomerDemandLarkVoucherSplitPreview | null>(null);
  const [voucherSplitResult, setVoucherSplitResult] =
    useState<CustomerDemandLarkVoucherSplitResult | null>(null);
  const [isVoucherSplitPreviewing, setIsVoucherSplitPreviewing] =
    useState(false);
  const [isSplittingVouchers, setIsSplittingVouchers] = useState(false);
  const result: CustomerDemandLarkSyncResult | null = commit.data ?? null;

  const loadPreview = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsPreviewing(true);
    setPreviewError(null);
    setVoucherSplitPreview(null);

    try {
      const data = await customerDemandApi.previewLarkSync();
      if (requestIdRef.current !== requestId) return;
      setPreviewData(data);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setPreviewData(null);
      setPreviewError(
        error instanceof Error
          ? error.message
          : "Không đọc được dữ liệu LarkBase"
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setIsPreviewing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadPreview();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadPreview]);

  const startPreview = () => {
    commit.reset();
    setVoucherSplitPreview(null);
    setVoucherSplitResult(null);
    void loadPreview();
  };

  const confirmSync = () => {
    commit.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(
          `Đã đồng bộ ${data.syncedRecords.toLocaleString("vi-VN")} record Lark`
        );
      },
      onError: (error: Error) => {
        toast.error(error.message || "Đồng bộ LarkBase thất bại");
      },
    });
  };

  const loadVoucherSplitPreview = async () => {
    setIsVoucherSplitPreviewing(true);
    setVoucherSplitResult(null);
    try {
      setVoucherSplitPreview(await customerDemandApi.previewLarkVoucherSplit());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không kiểm tra được phiếu Lark cũ"
      );
    } finally {
      setIsVoucherSplitPreviewing(false);
    }
  };

  const confirmVoucherSplit = async () => {
    setIsSplittingVouchers(true);
    try {
      const data = await customerDemandApi.splitLarkVouchers();
      setVoucherSplitResult(data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer-demand"] }),
        queryClient.invalidateQueries({ queryKey: ["purchasing-planning"] }),
      ]);
      toast.success(
        `Đã tách ${data.vouchersSplit.toLocaleString("vi-VN")} phiếu Lark`
      );
      await loadPreview();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Tách phiếu Lark thất bại"
      );
    } finally {
      setIsSplittingVouchers(false);
    }
  };

  const issueRows = previewData?.issues.slice(0, 100) ?? [];
  const canCommit =
    !!previewData &&
    !isPreviewing &&
    !commit.isPending &&
    previewData.totalRecords > 0 &&
    previewData.legacyVouchers === 0;

  return (
    <DemandModalShell
      open
      onClose={onClose}
      size="sync"
      closeOnOverlay={false}
      title="Đồng bộ Demand từ LarkBase"
      subtitle="Mỗi record Lark hợp lệ là một phiếu POS gồm một tháng và một dòng sản phẩm. Đồng bộ không xóa dữ liệu hiện có."
      footer={
        result ? (
          <>
            <DemandButton type="button" variant="ghost" onClick={startPreview}>
              Kiểm tra lại
            </DemandButton>
            <DemandButton type="button" onClick={onClose}>
              Đóng
            </DemandButton>
          </>
        ) : (
          <>
            <DemandButton type="button" variant="ghost" onClick={onClose}>
              Bỏ qua
            </DemandButton>
            <DemandButton
              type="button"
              disabled={!canCommit}
              icon={
                commit.isPending ? (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    strokeWidth={1.5}
                  />
                ) : (
                  <CloudDownload className="h-3.5 w-3.5" strokeWidth={1.5} />
                )
              }
              onClick={confirmSync}>
              {commit.isPending ? "Đang đồng bộ..." : "Xác nhận đồng bộ"}
            </DemandButton>
          </>
        )
      }>
      <div className="space-y-4 px-5 py-4">
        {result ? (
          <SyncResult result={result} />
        ) : isPreviewing ? (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <Loader2
                className="mx-auto h-7 w-7 animate-spin text-[var(--cd-cyan)]"
                strokeWidth={1.5}
              />
              <p className="mt-3 text-sm font-medium text-[var(--cd-text)]">
                Đang đọc dữ liệu LarkBase...
              </p>
              <p className="cd-subtitle mt-1">
                Hệ thống chưa ghi gì vào cơ sở dữ liệu.
              </p>
              <p className="cd-subtitle mt-1">
                Đọc 984 record thường mất khoảng 5–15 giây.
              </p>
            </div>
          </div>
        ) : previewError ? (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <AlertTriangle
                className="mx-auto h-7 w-7 text-[#9b2c2c]"
                strokeWidth={1.5}
              />
              <p className="mt-3 text-sm font-medium text-[#9b2c2c]">
                Không đọc được dữ liệu LarkBase
              </p>
              <p className="cd-subtitle mt-1 max-w-lg">
                {previewError}
              </p>
              <DemandButton
                type="button"
                variant="ghost"
                className="mt-4"
                icon={<RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
                onClick={startPreview}>
                Thử lại
              </DemandButton>
            </div>
          </div>
        ) : previewData ? (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
              <Kpi label="Record Lark" value={previewData.totalRecords} />
              <Kpi label="Hợp lệ" value={previewData.validRecords} />
              <Kpi label="Phiếu mới" value={previewData.demandsToCreate} />
              <Kpi label="Phiếu cập nhật" value={previewData.updatedLines} />
              <Kpi label="Dòng mới" value={previewData.newLines} />
              <Kpi label="Dòng cập nhật" value={previewData.updatedLines} />
              <Kpi
                label="Thiếu ngày nguồn"
                value={previewData.invalidTimestampRecords ?? 0}
                tone={previewData.invalidTimestampRecords ? "warning" : "normal"}
              />
              <Kpi
                label="Dòng bổ sung ngày"
                value={previewData.sourceDatesToRestore ?? 0}
              />
              <Kpi
                label="Phiếu Lark cần tách"
                value={previewData.legacyVouchers}
                tone={previewData.legacyVouchers ? "warning" : "normal"}
              />
              <Kpi
                label="Record trong phiếu cũ"
                value={previewData.legacyVoucherRecords}
                tone={previewData.legacyVoucherRecords ? "warning" : "normal"}
              />
              <Kpi label="Tháng sẽ tạo" value={previewData.monthsToCreate} />
              <Kpi
                label="Chưa map"
                value={previewData.pendingRecords}
                tone={previewData.pendingRecords ? "warning" : "normal"}
              />
              <Kpi
                label="Conflict"
                value={previewData.conflictedRecords}
                tone={previewData.conflictedRecords ? "danger" : "normal"}
              />
            </div>

            <div className="space-y-2">
              {previewData.pendingRecords > 0 && (
                <Notice tone="warning">
                  Có {previewData.pendingRecords.toLocaleString("vi-VN")} record
                  chưa map được khách hàng hoặc sản phẩm. Các record này vẫn
                  được lưu ở trạng thái chờ map để retry sau.
                </Notice>
              )}
              {previewData.invalidTimestampRecords > 0 && (
                <Notice tone="warning">
                  Có {previewData.invalidTimestampRecords.toLocaleString("vi-VN")} record
                  thiếu ngày tạo hoặc ngày cập nhật hợp lệ. Các dòng hiện có
                  được giữ nguyên; không thay ngày nguồn bằng thời điểm đồng bộ.
                </Notice>
              )}
              {previewData.conflictedRecords > 0 && (
                <Notice tone="danger">
                  Có {previewData.conflictedRecords.toLocaleString("vi-VN")}{" "}
                  record conflict. Hệ thống không sửa các dòng POS mơ hồ; các
                  record này được lưu lỗi để xử lý thủ công.
                </Notice>
              )}
              {previewData.legacyVouchers > 0 && (
                <Notice tone="warning">
                  Có {previewData.legacyVouchers.toLocaleString("vi-VN")} phiếu
                  Lark cũ đang chứa nhiều record. Cần tách thành một record một
                  phiếu trước khi đồng bộ tiếp.
                </Notice>
              )}
              <Notice tone="success">
                Dữ liệu hợp lệ sẽ vào trạng thái <b>Đã duyệt</b>. Đồng bộ không
                xóa hoặc hủy dữ liệu POS hiện có.
              </Notice>
            </div>

            {previewData.legacyVouchers > 0 && (
              <div className="rounded-[16px] bg-[var(--cd-bg)] px-4 py-3 shadow-[inset_0_0_0_1px_var(--cd-hairline)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Tách phiếu Lark đã gộp
                    </p>
                    <p className="cd-subtitle mt-1">
                      Giữ nguyên ID dòng và số lượng; mỗi dòng được chuyển vào
                      một phiếu, một tháng riêng.
                    </p>
                  </div>
                  <DemandButton
                    type="button"
                    variant="ghost"
                    size="tiny"
                    disabled={
                      isVoucherSplitPreviewing || isSplittingVouchers
                    }
                    icon={
                      isVoucherSplitPreviewing ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <RefreshCw
                          className="h-3.5 w-3.5"
                          strokeWidth={1.5}
                        />
                      )
                    }
                    onClick={loadVoucherSplitPreview}>
                    {isVoucherSplitPreviewing ? "Đang kiểm tra..." : "Kiểm tra"}
                  </DemandButton>
                </div>

                {voucherSplitPreview && (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--cd-secondary)]">
                      <span>
                        Phiếu có thể tách:{" "}
                        <b className="cd-mono">
                          {voucherSplitPreview.readyVouchers}
                        </b>
                      </span>
                      <span>
                        Phiếu sẽ tạo:{" "}
                        <b className="cd-mono">
                          {voucherSplitPreview.vouchersToCreate}
                        </b>
                      </span>
                      <span>
                        Dòng sẽ chuyển:{" "}
                        <b className="cd-mono">
                          {voucherSplitPreview.linesToMove}
                        </b>
                      </span>
                      <span>
                        Conflict:{" "}
                        <b className="cd-mono">
                          {voucherSplitPreview.conflictedVouchers}
                        </b>
                      </span>
                      <span>
                        SL quy đổi:{" "}
                        <b className="cd-mono">
                          {formatDemandQty(voucherSplitPreview.quantityBaseBefore)}
                          {" -> "}
                          {formatDemandQty(voucherSplitPreview.quantityBaseAfter)}
                        </b>
                      </span>
                    </div>
                    {voucherSplitPreview.issues.length > 0 && (
                      <div className="space-y-1 text-xs text-[#8a6a1f]">
                        {voucherSplitPreview.issues.slice(0, 5).map((issue) => (
                          <p key={issue.demandId}>
                            Phiếu #{issue.demandId}: {issue.message}
                          </p>
                        ))}
                      </div>
                    )}
                    {voucherSplitResult && (
                      <Notice tone="success">
                        Đã tách {voucherSplitResult.vouchersSplit} phiếu và tạo{" "}
                        {voucherSplitResult.vouchersCreated} phiếu mới.
                      </Notice>
                    )}
                    <div className="flex justify-end">
                      <DemandButton
                        type="button"
                        size="tiny"
                        disabled={
                          isSplittingVouchers ||
                          voucherSplitPreview.readyVouchers === 0
                        }
                        icon={
                          isSplittingVouchers ? (
                            <Loader2
                              className="h-3.5 w-3.5 animate-spin"
                              strokeWidth={1.5}
                            />
                          ) : undefined
                        }
                        onClick={confirmVoucherSplit}>
                        {isSplittingVouchers
                          ? "Đang tách..."
                          : `Tách ${voucherSplitPreview.readyVouchers} phiếu`}
                      </DemandButton>
                    </div>
                  </div>
                )}
              </div>
            )}

            {issueRows.length > 0 && (
              <div className="overflow-hidden rounded-[16px] shadow-[inset_0_0_0_1px_var(--cd-hairline)]">
                <div className="flex items-center justify-between gap-3 bg-[#eef7f8] px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-[var(--cd-secondary)]">
                      Record cần xử lý
                    </p>
                    <p className="cd-subtitle">
                      Hiển thị tối đa 100 dòng trong tổng{" "}
                      {previewData.issues.length.toLocaleString("vi-VN")} dòng lỗi
                      preview.
                    </p>
                  </div>
                  {previewData.truncatedIssues && (
                    <span className="cd-chip cd-chip-draft">
                      Còn record lỗi khác
                    </span>
                  )}
                </div>
                <div className="max-h-80 overflow-auto bg-white">
                  <table className="cd-table w-full text-sm">
                    <thead>
                      <tr>
                        <th>Record</th>
                        <th>Khách hàng</th>
                        <th>Sản phẩm</th>
                        <th>Tháng</th>
                        <th className="text-right">SL</th>
                        <th>Lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issueRows.map((issue) => (
                        <tr key={`${issue.sourceRecordId}-${issue.code}`}>
                          <td className="cd-mono text-xs">
                            {issue.sourceRecordId}
                          </td>
                          <td>
                            {issue.customerName ||
                              issue.customerCode ||
                              "Không xác định"}
                          </td>
                          <td>
                            {issue.productName ||
                              issue.productCode ||
                              "Không xác định"}
                          </td>
                          <td>
                            {issue.month
                              ? formatDemandMonth(issue.month)
                              : "-"}
                          </td>
                          <td className="cd-mono text-right">
                            {issue.quantity == null
                              ? "-"
                              : formatDemandQty(issue.quantity)}
                          </td>
                          <td>
                            <span
                              className={
                                issue.code === "LINE_CONFLICT"
                                  ? "text-xs text-[#9b2c2c]"
                                  : "text-xs text-[#8a6a1f]"
                              }>
                              {issue.message}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </DemandModalShell>
  );
}

function Kpi({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: number;
  tone?: "normal" | "warning" | "danger";
}) {
  return (
    <div
      className={`cd-kpi ${
        tone === "danger"
          ? "cd-kpi-danger"
          : tone === "warning"
            ? "cd-kpi-warning"
            : ""
      }`}>
      <p>{label}</p>
      <p className="cd-mono">{value.toLocaleString("vi-VN")}</p>
    </div>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "info" | "warning" | "danger" | "success";
  children: ReactNode;
}) {
  const icon =
    tone === "warning" || tone === "danger" ? (
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
    ) : (
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
    );
  return (
    <div className={`cd-sync-notice is-${tone}`}>
      {icon}
      <div>{children}</div>
    </div>
  );
}

function SyncResult({ result }: { result: CustomerDemandLarkSyncResult }) {
  return (
    <div className="space-y-4 py-4">
      <div className="text-center">
        <div className="cd-empty-icon mx-auto">
          <CheckCircle2 className="h-7 w-7" strokeWidth={1.4} />
        </div>
        <p className="mt-3 text-[16px] font-semibold">Đồng bộ hoàn tất</p>
        <p className="cd-subtitle mx-auto mt-1 max-w-xl">
          Đã ghi {result.syncedRecords.toLocaleString("vi-VN")} record thành{" "}
          {result.syncedDemands.toLocaleString("vi-VN")} phiếu Demand riêng.
          Dữ liệu Demand và Dự kiến đặt hàng đã được làm mới.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi label="Record đã sync" value={result.syncedRecords} />
        <Kpi label="Phiếu Demand" value={result.syncedDemands} />
        <Kpi label="Dòng Demand" value={result.syncedLines} />
        <Kpi
          label="Chưa map"
          value={result.unmappedRecords}
          tone={result.unmappedRecords ? "warning" : "normal"}
        />
        <Kpi
          label="Thiếu ngày nguồn"
          value={result.invalidTimestampRecords ?? 0}
          tone={result.invalidTimestampRecords ? "warning" : "normal"}
        />
        <Kpi
          label="Conflict"
          value={result.conflictedRecords}
          tone={result.conflictedRecords ? "danger" : "normal"}
        />
        <Kpi label="Record gộp" value={result.mergedRecords} />
        <Kpi label="Dòng mới" value={result.newLines} />
        <Kpi label="Dòng cập nhật" value={result.updatedLines} />
        <Kpi label="Orphaned" value={result.orphanedRecords} />
      </div>
    </div>
  );
}
