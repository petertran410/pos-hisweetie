"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Download,
  Upload,
  Loader2,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useProductQualityTickets,
  useProductQualitySummary,
  useExportProductQualityTickets,
} from "@/lib/hooks/useProductQuality";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { usePermission } from "@/lib/hooks/usePermissions";
import { CodeLink } from "@/components/shared/CodeLink";
import { ProductQualityImportModal } from "./ProductQualityImportModal";
import {
  type ProductQualityTicket,
  type ProductQualityFilters,
  CLASSIFICATION_OPTIONS,
  FEEDBACK_TYPE_OPTIONS,
  SEVERITY_OPTIONS,
  DEPARTMENT_OPTIONS,
  QUALITY_STATUS_CONFIG,
} from "@/lib/types/product-quality";

export function ProductQualityTable() {
  const router = useRouter();
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();

  const canCreate = usePermission("product_quality", "create");
  const canExport = usePermission("product_quality", "export");
  const canImport = usePermission("product_quality", "import");

  const [search, setSearch] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [branchId, setBranchId] = useState<number | undefined>(selectedBranch?.id);
  const [classification, setClassification] = useState<string>("");
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const { exportToFile, exportDetailToFile, isExporting } =
    useExportProductQualityTickets();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, branchId, classification, feedbackType, severity, department]);

  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportMenu]);

  const filters: ProductQualityFilters = {
    page,
    limit,
    search: debouncedSearch || undefined,
    branchId: branchId || undefined,
    tab: activeTab !== "all" ? activeTab : undefined,
    initialClassification: classification || undefined,
    feedbackType: feedbackType || undefined,
    severity: severity || undefined,
    department: department || undefined,
  };

  const { data, isLoading, refetch } = useProductQualityTickets(filters);
  const { data: summary } = useProductQualitySummary({
    branchId: branchId || undefined,
  });

  const tickets = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const tabs = [
    { key: "all", label: "Tất cả", count: summary?.total ?? 0 },
    { key: "new", label: "Mới", count: summary?.newCount ?? 0 },
    {
      key: "processing",
      label: "Đang xử lý",
      count: (summary?.inProgressCount || 0) + (summary?.remediatingCount || 0),
    },
    {
      key: "overdue",
      label: "Quá hạn SLA",
      count: summary?.overdueCount ?? 0,
      alert: (summary?.overdueCount || 0) > 0,
    },
    { key: "completed", label: "Hoàn thành", count: summary?.completedCount ?? 0 },
    { key: "my", label: "Của tôi" },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 h-full overflow-hidden">
      {/* Top Header & Stat Cards */}
      <div className="bg-white border-b px-6 py-4 space-y-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Quản lý chất lượng sản phẩm
              {summary && summary.overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  <AlertTriangle className="w-3 h-3" /> {summary.overdueCount} quá hạn SLA
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Theo dõi sự cố chất lượng, phân công người xử lý và tiến độ các bộ phận
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canImport && (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-700">
                <Upload className="w-4 h-4 text-gray-500" />
                <span>Import Excel</span>
              </button>
            )}

            {canExport && (
              <div ref={exportMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu((v) => !v)}
                  disabled={isExporting}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-700 disabled:opacity-50">
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />
                  ) : (
                    <Download className="w-4 h-4 text-gray-500" />
                  )}
                  <span>Xuất file</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        exportToFile(filters);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Xuất tổng quan
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        exportDetailToFile(filters);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100">
                      Xuất chi tiết nhiệm vụ
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => refetch()}
              title="Tải lại dữ liệu"
              className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600">
              <RefreshCw className="w-4 h-4" />
            </button>

            {canCreate && (
              <Link
                href="/san-pham/chat-luong-hang-hoa/new"
                className="px-3.5 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark flex items-center gap-1.5 transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                Tạo phiếu sự cố
              </Link>
            )}
          </div>
        </div>

        {/* Summary Department Counters */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {DEPARTMENT_OPTIONS.map((dept) => {
              const pending = summary.departmentPending?.[dept] || 0;
              return (
                <button
                  key={dept}
                  onClick={() => setDepartment(department === dept ? "" : dept)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    department === dept
                      ? "border-brand bg-brand-soft ring-1 ring-brand"
                      : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                  }`}>
                  <div className="text-xs text-gray-500 font-medium truncate">{dept}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-bold text-gray-800">{pending}</span>
                    <span className="text-xs text-gray-400">chưa xong</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs & Filters Bar */}
      <div className="bg-white border-b px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "bg-brand text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : tab.alert
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-200 text-gray-700"
                    }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Branch */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã phiếu, khách, sản phẩm..."
              className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
            />
          </div>

          <select
            value={branchId || ""}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-2.5 py-1.5 border rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand">
            <option value="">Tất cả kho/chi nhánh</option>
            {branches?.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Secondary filter chips */}
      <div className="bg-gray-50/70 border-b px-6 py-2 flex flex-wrap items-center gap-2 text-xs shrink-0">
        <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 mr-1" />

        <select
          value={classification}
          onChange={(e) => setClassification(e.target.value)}
          className="px-2 py-1 border border-gray-200 rounded text-xs bg-white text-gray-600 focus:outline-none">
          <option value="">Phân loại ban đầu (Tất cả)</option>
          {CLASSIFICATION_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={feedbackType}
          onChange={(e) => setFeedbackType(e.target.value)}
          className="px-2 py-1 border border-gray-200 rounded text-xs bg-white text-gray-600 focus:outline-none">
          <option value="">Loại phản hồi (Tất cả)</option>
          {FEEDBACK_TYPE_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="px-2 py-1 border border-gray-200 rounded text-xs bg-white text-gray-600 focus:outline-none">
          <option value="">Mức độ nghiêm trọng (Tất cả)</option>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {department && (
          <span className="inline-flex items-center gap-1 bg-brand-soft text-brand px-2 py-0.5 rounded border border-brand/20">
            Bộ phận: {department}
            <button onClick={() => setDepartment("")} className="hover:text-red-600 font-bold ml-1">
              ×
            </button>
          </span>
        )}

        {(classification || feedbackType || severity || department) && (
          <button
            onClick={() => {
              setClassification("");
              setFeedbackType("");
              setSeverity("");
              setDepartment("");
            }}
            className="text-gray-500 hover:text-red-600 underline ml-1">
            Xóa lọc
          </button>
        )}
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 text-xs font-semibold sticky top-0 z-10 border-b">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Mã phiếu</th>
              <th className="px-4 py-3 whitespace-nowrap">Ngày tạo</th>
              <th className="px-4 py-3 whitespace-nowrap">Chi nhánh</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Số lượng</th>
              <th className="px-4 py-3 whitespace-nowrap">Sự cố & Phản hồi</th>
              <th className="px-4 py-3 whitespace-nowrap">Người xử lý</th>
              <th className="px-4 py-3 whitespace-nowrap">Hạn SLA</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Nhiệm vụ</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={11} className="py-20 text-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand mb-2" />
                  <span>Đang tải danh sách sự cố...</span>
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-24 text-center text-gray-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <div className="font-medium text-gray-600">Không có phiếu sự cố nào phù hợp</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Thử thay đổi bộ lọc hoặc tạo phiếu sự cố mới
                  </div>
                </td>
              </tr>
            ) : (
              tickets.map((t: ProductQualityTicket) => {
                const isOverdue =
                  t.status !== "COMPLETED" &&
                  t.status !== "ENDED" &&
                  t.dueAt &&
                  new Date(t.dueAt).getTime() < Date.now();

                const st = QUALITY_STATUS_CONFIG[t.status] || QUALITY_STATUS_CONFIG.NEW;

                return (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/san-pham/chat-luong-hang-hoa/${t.id}`)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors">
                    {/* Mã phiếu */}
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      <div className="flex items-center gap-1.5">
                        <CodeLink entity="product-quality" code={t.code} />
                        {t.legacyCode && t.legacyCode !== t.code && (
                          <span className="text-xs text-gray-400 font-mono" title="Mã từ LarkBase">
                            ({t.legacyCode.slice(0, 8)})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ngày tạo */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {new Date(t.createdAt).toLocaleString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Chi nhánh */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                      {t.branch?.name || t.branchName || "—"}
                    </td>

                    {/* Khách hàng */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 text-xs truncate max-w-[180px]">
                        {t.customer ? (
                          <CodeLink
                            entity="customer"
                            code={t.customer.code || ""}
                            label={t.customerName}
                          />
                        ) : (
                          t.customerName
                        )}
                      </div>
                      {t.invoiceCode && (
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <span>HĐ:</span>
                          <CodeLink entity="invoice" code={t.invoiceCode} />
                        </div>
                      )}
                    </td>

                    {/* Sản phẩm */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 text-xs truncate max-w-[220px]">
                        {t.product ? (
                          <CodeLink
                            entity="product"
                            code={t.product.code || ""}
                            label={t.productName}
                          />
                        ) : (
                          t.productName
                        )}
                      </div>
                      {t.factoryName && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          NM: {t.factoryName}
                        </div>
                      )}
                    </td>

                    {/* Số lượng */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-bold text-gray-800">{Number(t.quantity)}</span>{" "}
                      <span className="text-xs text-gray-500">{t.unit || ""}</span>
                    </td>

                    {/* Phân loại & Phản hồi */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-700">
                        {t.feedbackType}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {t.initialClassification}
                      </div>
                    </td>

                    {/* Người xử lý */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-800">
                        {t.decisionMakerName || "Chờ phân công"}
                      </div>
                      {t.handlingDirection && (
                        <div className="text-xs text-gray-500 truncate max-w-[140px] mt-0.5">
                          {t.handlingDirection}
                        </div>
                      )}
                    </td>

                    {/* Hạn SLA */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {t.dueAt ? (
                        <div
                          className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded ${
                            isOverdue
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "text-gray-600 bg-gray-100"
                          }`}>
                          {isOverdue && <AlertTriangle className="w-3 h-3 text-red-500" />}
                          <span>
                            {new Date(t.dueAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Tasks */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        {t.assignedDepartments.map((dept) => {
                          const task = t.tasks?.find((x) => x.department === dept);
                          const isDone = task?.isCompleted;
                          const short =
                            dept === "Kinh Doanh"
                              ? "KD"
                              : dept === "Kho + Logistics"
                              ? "Kho"
                              : dept === "Kế Toán Kho"
                              ? "KT"
                              : "TM";
                          return (
                            <span
                              key={dept}
                              title={`${dept}: ${isDone ? "Đã xong" : "Đang xử lý"}`}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${
                                isDone
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}>
                              {short}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${st.badgeCls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls}`} />
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-white border-t px-6 py-3 flex items-center justify-between gap-4 text-xs text-gray-600 shrink-0">
        <div>
          Tổng cộng: <strong className="text-gray-900">{total}</strong> phiếu sự cố
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span>Số dòng:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="border rounded px-2 py-1 bg-white">
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border rounded hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border rounded hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showImportModal && (
        <ProductQualityImportModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  );
}
