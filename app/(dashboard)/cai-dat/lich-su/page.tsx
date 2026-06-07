"use client";

import { useState, useRef, useEffect } from "react";
import { AuditLogsTable } from "@/components/admin/AuditLogsTable";
import { useQuery } from "@tanstack/react-query";
import { auditLogsApi } from "@/lib/api/audit-logs";
import { Filter, X, Calendar, Search } from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { MiniCalendar } from "@/components/ui/MiniCalendar";

const CATEGORY_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "order", label: "Đơn hàng" },
  { value: "invoice", label: "Hóa đơn" },
  { value: "return_order", label: "Phiếu trả hàng" },
  { value: "payment", label: "Thanh toán" },
  { value: "product", label: "Sản phẩm" },
  { value: "customer", label: "Khách hàng" },
  { value: "supplier", label: "Nhà cung cấp" },
  { value: "transfer", label: "Chuyển kho" },
  { value: "purchase_order", label: "Nhập hàng" },
  { value: "order_supplier", label: "Đặt hàng NCC" },
  { value: "production", label: "Sản xuất" },
  { value: "destruction", label: "Xuất hủy" },
  { value: "packing", label: "Đóng hàng" },
  { value: "user", label: "Người dùng" },
  { value: "branch", label: "Chi nhánh" },
  { value: "setting", label: "Cài đặt" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "info", label: "Thông tin" },
  { value: "warning", label: "Cảnh báo" },
  { value: "critical", label: "Quan trọng" },
];

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    severity: "",
    search: "",
    startDate: "",
    endDate: "",
  });
  const [openCal, setOpenCal] = useState<"start" | "end" | null>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openCal) return;
    const handler = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setOpenCal(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openCal]);

  // Debounce ô tìm kiếm để tránh gọi API mỗi lần gõ
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // yyyy-mm-dd → ISO đầu/cuối ngày (local) để lọc trọn ngày, kể cả khi
  // chọn cùng một ngày cho "Từ ngày" và "Đến ngày".
  const startDateIso = filters.startDate
    ? new Date(`${filters.startDate}T00:00:00`).toISOString()
    : undefined;
  const endDateIso = filters.endDate
    ? new Date(`${filters.endDate}T23:59:59.999`).toISOString()
    : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", filters, page, limit],
    queryFn: () =>
      auditLogsApi.getAll({
        category: filters.category || undefined,
        severity: filters.severity || undefined,
        search: filters.search || undefined,
        startDate: startDateIso,
        endDate: endDateIso,
        page,
        limit,
      }),
  });

  const handleResetFilters = () => {
    setFilters({
      category: "",
      severity: "",
      search: "",
      startDate: "",
      endDate: "",
    });
    setSearchInput("");
    setPage(1);
  };

  return (
    <PagePermissionGuard resource="roles" action="view">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b bg-white">
          <div className="mb-4">
            <h1 className="text-xl font-semibold">Lịch sử thao tác</h1>
            <p className="text-gray-600 text-sm mt-1">
              Theo dõi tất cả thao tác của nhân viên trên hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 ${
                activeFilterCount > 0 ? "border-blue-500 text-blue-600" : ""
              }`}>
              <Filter className="w-4 h-4" />
              Lọc
              {activeFilterCount > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo nội dung, nhân viên, mã chứng từ..."
                className="w-full pl-9 pr-9 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
                <X className="w-3 h-3" />
                Xóa bộ lọc
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phân loại
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => {
                    setFilters({ ...filters, category: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mức độ
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => {
                    setFilters({ ...filters, severity: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div ref={dateRef} className="contents">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Từ ngày
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenCal(openCal === "start" ? null : "start")
                    }
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-all ${
                      filters.startDate
                        ? "border-blue-300 bg-blue-50 text-gray-800"
                        : "border-gray-300 text-gray-400"
                    } ${
                      openCal === "start"
                        ? "ring-2 ring-blue-100 border-blue-400"
                        : "hover:border-gray-400"
                    }`}>
                    <span>
                      {filters.startDate
                        ? new Date(
                            filters.startDate + "T00:00:00"
                          ).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "Chọn ngày"}
                    </span>
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                  {openCal === "start" && (
                    <div className="absolute z-50 top-full left-0 w-72">
                      <MiniCalendar
                        value={filters.startDate}
                        onChange={(d) => {
                          setFilters({ ...filters, startDate: d });
                          setPage(1);
                        }}
                        onClose={() => setOpenCal(null)}
                      />
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đến ngày
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenCal(openCal === "end" ? null : "end")
                    }
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-all ${
                      filters.endDate
                        ? "border-blue-300 bg-blue-50 text-gray-800"
                        : "border-gray-300 text-gray-400"
                    } ${
                      openCal === "end"
                        ? "ring-2 ring-blue-100 border-blue-400"
                        : "hover:border-gray-400"
                    }`}>
                    <span>
                      {filters.endDate
                        ? new Date(
                            filters.endDate + "T00:00:00"
                          ).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "Chọn ngày"}
                    </span>
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                  {openCal === "end" && (
                    <div className="absolute z-50 top-full left-0 w-72">
                      <MiniCalendar
                        value={filters.endDate}
                        onChange={(d) => {
                          setFilters({ ...filters, endDate: d });
                          setPage(1);
                        }}
                        onClose={() => setOpenCal(null)}
                        minDate={filters.startDate || undefined}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <AuditLogsTable
            logs={data?.data || []}
            isLoading={isLoading}
            total={data?.total || 0}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </div>
      </div>
    </PagePermissionGuard>
  );
}
