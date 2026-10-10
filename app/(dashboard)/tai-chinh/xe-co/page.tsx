"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CarFront,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import Swal from "sweetalert2";
import { VehicleFinanceForm } from "@/components/internal-finance/VehicleFinanceForm";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import {
  VehicleEntrySidebar,
  type VehicleEntryFilters,
} from "@/components/vehicles/VehicleEntrySidebar";
import { VehicleEntryTable } from "@/components/vehicles/VehicleEntryTable";
import { VehicleListModal } from "@/components/vehicles/VehicleListModal";
import { WarehouseCashAttachmentsModal } from "@/components/warehouse-cash/WarehouseCashAttachmentsModal";
import type {
  VehicleEntry,
  VehicleEntryKind,
  VehicleEntryQuery,
} from "@/lib/api/internal-finance";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCancelVehicleEntry,
  useVehicleEntries,
} from "@/lib/hooks/useInternalFinance";
import { useVehicles } from "@/lib/hooks/useVehicles";
import {
  VEHICLE_BRANCH_IDS,
  canVehicle,
  isExpenseOpenForEdit,
} from "@/lib/internal-finance/vehicle-constants";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { formatCurrency } from "@/lib/utils";

const PAGE_SIZE = 50;
const BRANCH_FALLBACK: Record<number, string> = {
  6: "Kho Hà Nội",
  1: "Kho Sài Gòn",
};
const TABS: Array<{ kind: VehicleEntryKind; label: string }> = [
  { kind: "FUEL", label: "Xăng dầu" },
  { kind: "VEHICLE_CARE", label: "Chăm sóc xe" },
];
const VEHICLE_PAGE_PERMISSIONS = ["view", "create"].flatMap((action) =>
  ["hn", "sg"].map((scope) => ({
    resource: "vehicles",
    action: `${action}_${scope}`,
  })),
);

function VehicleScreen() {
  const { user } = useAuthStore();
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const { data: branchData } = useBranches();
  const [kind, setKind] = useState<VehicleEntryKind>("FUEL");
  const [filters, setFilters] = useState<VehicleEntryFilters>({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showVehicles, setShowVehicles] = useState(false);
  const [editing, setEditing] = useState<VehicleEntry | null>(null);
  const [attachmentRow, setAttachmentRow] = useState<VehicleEntry | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const cancelEntry = useCancelVehicleEntry();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const branchName = useMemo(() => {
    const payload = branchData as
      | { data?: Array<{ id: number; name: string }> }
      | Array<{ id: number; name: string }>
      | undefined;
    const rows = Array.isArray(payload) ? payload : payload?.data || [];
    return (id: number) =>
      rows.find((branch) => branch.id === id)?.name || BRANCH_FALLBACK[id];
  }, [branchData]);
  const branchesFor = (action: "view" | "create" | "manage") =>
    VEHICLE_BRANCH_IDS.filter((id) => canVehicle(user, action, id)).map(
      (id) => ({ id, name: branchName(id) }),
    );
  const viewBranches = branchesFor("view");
  const createBranches = branchesFor("create");
  const allBranches = VEHICLE_BRANCH_IDS.filter(
    (id) =>
      canVehicle(user, "view", id) ||
      canVehicle(user, "create", id) ||
      canVehicle(user, "manage", id),
  ).map((id) => ({ id, name: branchName(id) }));
  const canView = viewBranches.length > 0;
  const defaultBranchId =
    filters.branchId ||
    (selectedBranch && VEHICLE_BRANCH_IDS.includes(selectedBranch.id)
      ? selectedBranch.id
      : createBranches[0]?.id || viewBranches[0]?.id || 6);

  const query = useMemo<VehicleEntryQuery>(
    () => ({
      category: kind,
      branchId: filters.branchId,
      vehicleId: filters.vehicleId,
      serviceType: kind === "VEHICLE_CARE" ? filters.serviceType : undefined,
      check: kind === "FUEL" ? filters.check : undefined,
      status: filters.status,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      search: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [debouncedSearch, filters, kind, page],
  );
  const entries = useVehicleEntries(query, canView);
  const vehicles = useVehicles({ includeInactive: true }, allBranches.length > 0);
  const rows = entries.data?.data || [];
  const total = entries.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageAmount = rows.reduce(
    (sum, row) => sum + (row.status === "CANCELLED" ? 0 : Number(row.amount || 0)),
    0,
  );

  const changeFilters = (patch: Partial<VehicleEntryFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const handleCancel = async (row: VehicleEntry) => {
    const result = await Swal.fire({
      title: "Hủy phiếu xe?",
      text: `${row.vehicle?.label || row.vehicleName || row.code} – ${formatCurrency(row.amount)} đ. Phiếu đã hủy không được tổng hợp tuần.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hủy phiếu",
      cancelButtonText: "Giữ lại",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    setCancellingId(row.id);
    cancelEntry.mutate(row.id, { onSettled: () => setCancellingId(null) });
  };

  return (
    <PagePermissionGuard permissions={VEHICLE_PAGE_PERMISSIONS}>
      <div className="flex h-full min-h-0 overflow-hidden border-t bg-gray-50">
        {canView && (
          <VehicleEntrySidebar
            kind={kind}
            filters={filters}
            branches={viewBranches}
            vehicles={vehicles.data || []}
            mobileOpen={showFilters}
            onMobileClose={() => setShowFilters(false)}
            onChange={changeFilters}
            onClear={() => {
              setFilters({});
              setPage(1);
            }}
          />
        )}
        <main className="m-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white shadow-sm md:m-4 md:ml-0">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 md:px-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2 md:gap-3">
              <div className="flex items-center gap-2">
                <CarFront className="h-5 w-5 text-brand" />
                <h1 className="whitespace-nowrap text-base font-semibold text-gray-900">
                  Xe cộ
                </h1>
              </div>
              <div className="flex rounded-lg border p-0.5">
                {TABS.map((tab) => (
                  <button
                    key={tab.kind}
                    type="button"
                    onClick={() => {
                      setKind(tab.kind);
                      setPage(1);
                    }}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      kind === tab.kind
                        ? "bg-brand text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              {canView && (
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm xe, địa điểm, ghi chú, mã phiếu..."
                  className="h-9 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand sm:w-64"
                />
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canView && (
                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 md:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                  Bộ lọc
                </button>
              )}
              {allBranches.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowVehicles(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <ListChecks className="h-4 w-4" />
                  Danh sách xe
                </button>
              )}
              {createBranches.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                  <Plus className="h-4 w-4" />
                  Tạo phiếu xe
                </button>
              )}
            </div>
          </div>

          {!canView ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500">
              Tài khoản chỉ có quyền tạo phiếu xe. Bấm “Tạo phiếu xe” để nhập
              phiếu xăng dầu hoặc chăm sóc xe.
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-end gap-4 border-b px-4 py-2 text-sm">
                <span className="text-gray-500">
                  Số phiếu: <strong className="text-gray-900">{total}</strong>
                </span>
                <span className="text-gray-500">
                  Tổng tiền trang:{" "}
                  <strong className="text-red-600">
                    {formatCurrency(pageAmount)}
                  </strong>
                </span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {entries.isError ? (
                  <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-red-600">
                    {entries.error instanceof Error
                      ? entries.error.message
                      : "Không tải được dữ liệu"}
                  </div>
                ) : (
                  <VehicleEntryTable
                    kind={kind}
                    rows={rows}
                    isLoading={entries.isLoading}
                    canEdit={(row) =>
                      ["FUEL", "VEHICLE_CARE"].includes(row.sourceType) &&
                      isExpenseOpenForEdit(row) &&
                      canVehicle(user, "update", row.branchId)
                    }
                    cancellingId={cancellingId}
                    onOpenAttachments={setAttachmentRow}
                    onEdit={setEditing}
                    onCancel={handleCancel}
                  />
                )}
                <div className="flex shrink-0 items-center justify-between border-t px-4 py-3 text-sm">
                  <span className="text-gray-500">
                    Trang {page}/{totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Trang trước"
                      disabled={page <= 1}
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                      className="rounded border p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Trang sau"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                      className="rounded border p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {showForm && (
        <VehicleFinanceForm
          kind={kind}
          branchId={defaultBranchId}
          onClose={() => setShowForm(false)}
        />
      )}
      {editing && (
        <VehicleFinanceForm
          kind={editing.category as VehicleEntryKind}
          branchId={editing.branchId}
          entry={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {showVehicles && (
        <VehicleListModal
          branches={allBranches}
          defaultBranchId={defaultBranchId}
          onClose={() => setShowVehicles(false)}
        />
      )}
      {attachmentRow && (
        <WarehouseCashAttachmentsModal
          attachments={attachmentRow.attachments || []}
          title={
            attachmentRow.vehicle?.label ||
            attachmentRow.vehicleName ||
            attachmentRow.code
          }
          onClose={() => setAttachmentRow(null)}
        />
      )}
    </PagePermissionGuard>
  );
}

export default function XeCoPage() {
  return <VehicleScreen />;
}
