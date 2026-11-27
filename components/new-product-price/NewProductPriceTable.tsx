"use client";

import { Fragment, useEffect, useState } from "react";
import {
  ChevronDown,
  CloudDownload,
  Plus,
  Search,
  Settings2,
} from "lucide-react";
import {
  useNewProductPriceConfig,
  useNewProductPrices,
} from "@/lib/hooks/useNewProductPrice";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";
import { useCan } from "@/lib/hooks/useCan";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { TablePagination } from "@/components/shared/TablePagination";
import { CodeLink } from "@/components/shared/CodeLink";
import { JourneyStepper } from "@/components/journey/JourneyStepper";
import {
  NPP_STAGE_COLOR,
  NPP_STAGE_LABEL,
  NPP_STATUS_COLOR,
  NPP_STATUS_LABEL,
  fmtDate,
  fmtMoney,
} from "@/lib/new-product-price/constants";
import { stageMilestones } from "./stage-milestones";
import type { NppFilters, NppTicket } from "@/lib/types/new-product-price";
import { NewProductPriceDetailRow } from "./NewProductPriceDetailRow";

const DEFAULT_COLUMNS: ColumnConfig<NppTicket>[] = [
  {
    key: "code",
    label: "Mã phiếu",
    visible: true,
    width: "120px",
    render: (t) => <CodeLink entity="new-product-price" code={t.code} />,
  },
  {
    key: "productName",
    label: "Tên hàng hóa",
    visible: true,
    width: "240px",
    render: (t) => <span className="font-medium">{t.productName}</span>,
  },
  {
    key: "parentName",
    label: "Loại hàng",
    visible: true,
    width: "140px",
    render: (t) => t.parentName || "-",
  },
  {
    key: "tradeMark",
    label: "Thương hiệu",
    visible: true,
    width: "140px",
    render: (t) => t.tradeMarkName || "-",
  },
  {
    key: "childName",
    label: "Danh mục",
    visible: false,
    width: "160px",
    render: (t) => t.childName || "-",
  },
  {
    key: "stage",
    label: "Giai đoạn",
    visible: true,
    width: "150px",
    render: (t) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${NPP_STAGE_COLOR[t.stage]}`}>
        {NPP_STAGE_LABEL[t.stage]}
      </span>
    ),
  },
  {
    key: "progress",
    label: "Tiến trình",
    visible: true,
    width: "140px",
    render: (t) => <JourneyStepper compact milestones={stageMilestones(t)} />,
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "130px",
    render: (t) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${NPP_STATUS_COLOR[t.status]}`}>
        {NPP_STATUS_LABEL[t.status]}
      </span>
    ),
  },
  {
    key: "createdBy",
    label: "Người đề xuất",
    visible: true,
    width: "150px",
    render: (t) => t.createdByName || "-",
  },
  {
    key: "createdAt",
    label: "Ngày đề xuất",
    visible: true,
    width: "120px",
    render: (t) => fmtDate(t.createdAt),
  },
  {
    key: "cogsHn",
    label: "Giá vốn HN",
    visible: false,
    width: "120px",
    render: (t) => fmtMoney(t.cogsHn),
  },
  {
    key: "priceHnRetail",
    label: "HN - Giá Lẻ",
    visible: false,
    width: "120px",
    render: (t) => fmtMoney(t.priceHnRetail),
  },
  {
    key: "leadtime",
    label: "Leadtime",
    visible: true,
    width: "100px",
    render: (t) => `${t.leadtimeDays} ngày`,
  },
  {
    key: "product",
    label: "Sản phẩm",
    visible: true,
    width: "120px",
    render: (t) => <CodeLink entity="product" code={t.productCode} />,
  },
];

/** Bảng phiếu (khuôn InvoicesTable): bấm dòng mở chi tiết, phiếu mở sẵn khi có ?Code=. */
export function NewProductPriceTable({
  filters,
  initialQuery = "",
  openCode,
  openAction = false,
  onCreateClick,
  onConfigClick,
  onImportClick,
}: {
  filters: NppFilters;
  initialQuery?: string;
  openCode: string | null;
  /** Link có &open=1 → phiếu mở sẵn kèm modal thao tác chính. */
  openAction?: boolean;
  onCreateClick: () => void;
  onConfigClick: () => void;
  onImportClick: () => void;
}) {
  const canCreate = useCan("new_product_price", "create");
  const canConfig = useCan("new_product_price", "config");
  const canImport = useCan("new_product_price", "import");
  const { data: config } = useNewProductPriceConfig();
  const testing = (config?.testRecipients?.length ?? 0) > 0;
  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "newProductPriceColumns",
    DEFAULT_COLUMNS,
  );
  const [input, setInput] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);
  // Phiếu cần mở sẵn modal thao tác (chỉ một lần, đóng/mở lại dòng thì không mở nữa)
  const [autoActionId, setAutoActionId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);
  // Lọc / tìm đổi → về trang 1
  const [prevKey, setPrevKey] = useState("");
  const key = JSON.stringify([filters, search]);
  if (key !== prevKey) {
    setPrevKey(key);
    setPage(1);
  }

  const { data, isLoading } = useNewProductPrices({
    ...filters,
    search: search || undefined,
    page,
    limit,
  });
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  // +1 cột chevron mở rộng
  const colSpan = visibleColumns.length + 1;

  // Mở sẵn phiếu theo ?Code= khi dữ liệu về (chỉnh state ngay khi render)
  if (openCode && !autoOpened && rows.length) {
    const hit = rows.find(
      (r) => r.code.toLowerCase() === openCode.toLowerCase(),
    );
    setAutoOpened(true);
    if (hit) {
      setExpandedId(hit.id);
      if (openAction) setAutoActionId(hit.id);
    }
  }

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      {/* Toolbar */}
      <div className="border-b px-4 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 shrink-0">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
            Bảng giá sản phẩm mới
          </h2>
          {testing && (
            <span
              title="Mọi thông báo chỉ gửi tới danh sách gửi thử (Cấu hình duyệt)"
              className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 whitespace-nowrap">
              Đang gửi thử
            </span>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tìm theo mã phiếu, tên hàng, mã hàng"
              className="w-64 border rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <button
              onClick={onCreateClick}
              className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
              <Plus className="w-4 h-4" /> Tạo đề xuất
            </button>
          )}
          {canImport && (
            <button
              onClick={onImportClick}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
              <CloudDownload className="w-4 h-4" /> Nhập từ Lark
            </button>
          )}
          {canConfig && (
            <button
              onClick={onConfigClick}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
              <Settings2 className="w-4 h-4" /> Cấu hình duyệt
            </button>
          )}
          <ColumnToggle columns={columns} onToggle={toggleColumn} />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide"
                  style={{ width: col.width, minWidth: col.width }}>
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent" />
                    <span className="text-xs">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-20 text-center text-gray-400">
                  <div className="text-sm">Không có phiếu nào</div>
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const open = expandedId === t.id;
                return (
                  <Fragment key={t.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        open ? "bg-brand-soft" : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(t.id)}>
                      {visibleColumns.map((col, i) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 text-gray-700 ${
                            open
                              ? `border-t-2 border-brand ${i === 0 ? "border-l-2" : ""}`
                              : ""
                          }`}
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            maxWidth: col.width,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}>
                          {col.render(t)}
                        </td>
                      ))}
                      <td
                        className={`px-4 py-2.5 ${
                          open ? "border-t-2 border-r-2 border-brand" : ""
                        }`}>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {open && (
                      <NewProductPriceDetailRow
                        ticketId={t.id}
                        colSpan={colSpan}
                        autoOpen={autoActionId === t.id}
                        onAutoOpened={() => setAutoActionId(null)}
                      />
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / limit))}
        total={total}
        limit={limit}
        limitOptions={[10, 20, 50, 100]}
        unit="phiếu"
        onPageChange={setPage}
        onLimitChange={(n) => {
          setLimit(n);
          setPage(1);
        }}
      />
    </div>
  );
}
