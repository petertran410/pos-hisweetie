"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  PackageX,
} from "lucide-react";
import { CartItem } from "@/app/(dashboard)/ban-hang/page";
import { useNearExpiryLots } from "@/lib/hooks/useProducts";
import { formatMonthYear } from "@/components/ui/DatePickerInput";

/**
 * Chọn TÌNH TRẠNG HÀNG cho 1 dòng trong giỏ — đặt trong HÀNG ACTION của card
 * (bên trái icon "!"), style đồng bộ với nút "Khuyến Mãi".
 *
 * Thứ tự hiển thị (trái → phải): [dropdown NSX] [Cận date] [Bục rách].
 *
 * Quy ước màu (giống nút Khuyến Mãi):
 *  - Chưa chọn : nền xám nhạt, chữ/icon xám → hover đổi sang màu của loại đó.
 *  - Đang chọn : nền màu của loại đó, chữ/icon màu đậm → hover xám (gợi ý bỏ chọn).
 *  - Bị khóa   : nền xám rất nhạt, chữ mờ, không bấm được (do loại kia đang chọn).
 *
 * Hai nút LOẠI TRỪ nhau. Bấm lại nút đang chọn để bỏ về hàng thường.
 * Chọn "Cận date" → hiện dropdown chọn lô theo cột mốc NSX ở bên trái.
 *
 * Số tồn truyền vào đã được backend tính TỪ SỔ CÁI StockConditionLog nên luôn
 * khớp tab "Thẻ kho loại tồn".
 */
export function ItemConditionSelector({
  item,
  damagedAvailable,
  nearExpiryAvailable,
  branchId,
  onUpdateItem,
}: {
  item: CartItem;
  damagedAvailable: number;
  nearExpiryAvailable: number;
  branchId?: number;
  onUpdateItem: (rowId: string, updates: Partial<CartItem>) => void;
}) {
  const isDamaged = item.conditionType === "damaged";
  const isNearExpiry = item.conditionType === "near_expiry";

  // Vẫn hiện nút nếu đang được chọn dù tồn về 0 (để user thấy và bỏ chọn được).
  const hasDamaged = damagedAvailable > 0 || isDamaged;
  const hasNearExpiry = nearExpiryAvailable > 0 || isNearExpiry;

  if (!hasDamaged && !hasNearExpiry) return null;

  const selectCondition = (condition: "damaged" | "near_expiry") => {
    if (item.conditionType === condition) {
      // Bấm lại nút đang chọn → bỏ chọn, quay về hàng thường.
      onUpdateItem(item.rowId, {
        conditionType: "normal",
        soldExpiryDate: undefined,
      });
      return;
    }
    onUpdateItem(item.rowId, {
      conditionType: condition,
      // Đổi loại thì lô cũ không còn ý nghĩa.
      soldExpiryDate: undefined,
    });
  };

  return (
    <>
      {/* Dropdown chọn lô NSX — nằm BÊN TRÁI nút "Cận date" */}
      {isNearExpiry && (
        <NearExpiryLotSelect
          productId={item.product.id}
          branchId={branchId}
          value={item.soldExpiryDate}
          onChange={(expiryDate) =>
            onUpdateItem(item.rowId, { soldExpiryDate: expiryDate })
          }
        />
      )}

      {hasNearExpiry && (
        <ConditionButton
          active={isNearExpiry}
          locked={isDamaged}
          tone="amber"
          icon={<CalendarClock className="w-4 h-4" />}
          label="Cận date"
          count={nearExpiryAvailable}
          onClick={() => selectCondition("near_expiry")}
          title={
            isDamaged
              ? "Đang bán hàng bục rách — bỏ chọn bục rách để chuyển sang cận date"
              : isNearExpiry
                ? "Đang bán hàng cận date — bấm để bỏ chọn"
                : `Bán hàng cận date (còn ${nearExpiryAvailable})`
          }
        />
      )}

      {hasDamaged && (
        <ConditionButton
          active={isDamaged}
          locked={isNearExpiry}
          tone="red"
          icon={<PackageX className="w-4 h-4" />}
          label="Bục rách"
          count={damagedAvailable}
          onClick={() => selectCondition("damaged")}
          title={
            isNearExpiry
              ? "Đang bán hàng cận date — bỏ chọn cận date để chuyển sang bục rách"
              : isDamaged
                ? "Đang bán hàng bục rách — bấm để bỏ chọn"
                : `Bán hàng bục rách (còn ${damagedAvailable})`
          }
        />
      )}
    </>
  );
}

const TONE = {
  red: {
    activeBg: "bg-red-100 hover:bg-gray-100",
    idleBg: "bg-gray-100 hover:bg-red-100",
    activeText: "text-red-600 group-hover:text-gray-400",
    idleText: "text-gray-400 group-hover:text-red-600",
  },
  amber: {
    activeBg: "bg-amber-100 hover:bg-gray-100",
    idleBg: "bg-gray-100 hover:bg-amber-100",
    activeText: "text-amber-600 group-hover:text-gray-400",
    idleText: "text-gray-400 group-hover:text-amber-600",
  },
} as const;

/**
 * 1 nút chọn loại tồn. Dựng theo đúng khuôn nút "Khuyến Mãi" (group + icon +
 * label) để hàng action nhìn thống nhất.
 */
function ConditionButton({
  active,
  locked,
  tone,
  icon,
  label,
  count,
  title,
  onClick,
}: {
  active: boolean;
  locked: boolean;
  tone: keyof typeof TONE;
  icon: React.ReactNode;
  label: string;
  count: number;
  title: string;
  onClick: () => void;
}) {
  const t = TONE[tone];

  const bgCls = locked
    ? "bg-gray-50 cursor-not-allowed"
    : active
      ? t.activeBg
      : t.idleBg;

  const textCls = locked
    ? "text-gray-300"
    : active
      ? t.activeText
      : t.idleText;

  return (
    <button
      type="button"
      disabled={locked}
      onClick={onClick}
      title={title}
      className={`group flex items-center gap-1 px-1.5 py-1 rounded transition-colors ${bgCls}`}>
      <span className={textCls}>{icon}</span>
      <span className={`text-xs font-medium ${textCls}`}>
        {label} {count}
      </span>
    </button>
  );
}

// NSX chỉ có nghĩa tới THÁNG/NĂM nên hiển thị mm/yyyy (không hiện ngày).
const formatLotLabel = (iso: string | null) =>
  iso ? formatMonthYear(iso) || "Chưa xác định NSX" : "Chưa xác định NSX";

// Chuẩn hóa về yyyy-mm-dd để so khớp giữa value đang lưu và danh sách lô.
const toDateKey = (v: string | null | undefined): string => {
  if (!v) return "";
  return String(v).slice(0, 10);
};

// Số ngày kể từ NSX → cho biết lô đã tồn bao lâu. NSX càng cũ thì hàng càng
// "cận date xa" (gần hết hạn nhất) và càng cần ưu tiên bán trước.
const daysSince = (iso: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / 86400000);
};

const formatAge = (days: number | null): string => {
  if (days == null || days < 0) return "";
  if (days < 30) return `${days} ngày`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng`;
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  return restMonths > 0 ? `${years} năm ${restMonths} tháng` : `${years} năm`;
};

/**
 * Dropdown chọn LÔ cận date theo cột mốc NSX. Lô đã được backend sắp xếp theo
 * NSX tăng dần (lô cũ nhất lên đầu) và chỉ trả lô còn tồn > 0.
 *
 * Chưa chọn lô → viền hổ phách đậm để nhắc, vì backend validate theo từng lô:
 * bán quá tồn của "lô chưa xác định NSX" sẽ bị chặn.
 */
function NearExpiryLotSelect({
  productId,
  branchId,
  value,
  onChange,
}: {
  productId: number;
  branchId?: number;
  value?: string;
  onChange: (expiryDate: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useNearExpiryLots(productId, branchId);
  const lots = useMemo(() => data?.data || [], [data]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedKey = toDateKey(value);
  const selectedLot = lots.find((l) => toDateKey(l.expiryDate) === selectedKey);

  // Lô CẦN BÁN TRƯỚC = lô có NSX cũ nhất (hàng nằm kho lâu nhất → gần hết hạn
  // nhất). Backend đã sort NSX tăng dần và đẩy lô null (chưa xác định NSX)
  // xuống cuối, nên lô đầu tiên CÓ ngày chính là lô cần ưu tiên.
  const oldestKey = useMemo(() => {
    const firstDated = lots.find((l) => !!l.expiryDate);
    return firstDated ? toDateKey(firstDated.expiryDate) : null;
  }, [lots]);

  // Chỉ đánh dấu "ưu tiên" khi có từ 2 lô trở lên — 1 lô thì không cần so sánh.
  const showPriority = oldestKey != null && lots.length > 1;
  const isPriority = (key: string) => showPriority && key === oldestKey;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={
          value
            ? `Đang bán lô NSX ${formatLotLabel(value)} — bấm để đổi lô`
            : "Chưa chọn lô — bấm để chọn lô theo ngày sản xuất"
        }
        className={`group flex items-center gap-1 px-1.5 py-1 rounded transition-colors ${
          value
            ? "bg-amber-50 hover:bg-amber-100 text-amber-700"
            : "bg-amber-500 hover:bg-amber-600 text-white"
        }`}>
        <span className="text-xs font-medium whitespace-nowrap">
          {value ? `NSX ${formatLotLabel(value)}` : "Chọn lô NSX"}
        </span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute z-50 right-0 top-full mt-1 w-64 bg-white border rounded-lg shadow-lg max-h-72 overflow-y-auto p-1">
          {showPriority && (
            <div className="flex items-center gap-1 px-2 py-1 mb-0.5 text-[11px] text-red-600 bg-red-50 rounded">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>Lô tô đỏ là cận date xa nhất, nên bán trước</span>
            </div>
          )}
          {isLoading ? (
            <div className="py-3 text-center text-xs text-gray-500">
              Đang tải lô...
            </div>
          ) : lots.length === 0 ? (
            <div className="py-3 text-center text-xs text-gray-500">
              Không có lô cận date nào còn tồn.
            </div>
          ) : (
            lots.map((lot) => {
              const key = toDateKey(lot.expiryDate);
              const active = key === selectedKey;
              const priority = isPriority(key);
              const age = formatAge(daysSince(lot.expiryDate));
              return (
                <button
                  key={lot.expiryDate ?? "unknown"}
                  type="button"
                  onClick={() => {
                    onChange(lot.expiryDate ?? undefined);
                    setOpen(false);
                  }}
                  title={
                    priority
                      ? `Lô cận date xa nhất — đã nằm kho ${age}, nên bán trước`
                      : undefined
                  }
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs mb-0.5 transition-colors ${
                    active
                      ? "bg-amber-100 text-amber-900 font-semibold"
                      : priority
                        ? "bg-red-50 text-red-700 font-medium ring-1 ring-inset ring-red-200 hover:bg-red-100"
                        : "hover:bg-gray-50 text-gray-700"
                  }`}>
                  <span className="flex items-center gap-1 min-w-0">
                    {priority && (
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
                    )}
                    <span className="whitespace-nowrap">
                      NSX: {formatLotLabel(lot.expiryDate)}
                    </span>
                  </span>
                  <span
                    className={`whitespace-nowrap ${
                      priority && !active ? "text-red-500" : "text-gray-500"
                    }`}>
                    Tồn: {lot.quantity}
                  </span>
                </button>
              );
            })
          )}
          {selectedLot && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-500 hover:bg-gray-50 border-t mt-0.5">
              Bỏ chọn lô
            </button>
          )}
        </div>
      )}
    </div>
  );
}
