"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { upsellApi, type UpsellResult } from "@/lib/ai/ai-compose";
import { QUICK_ITEM_MIME } from "@/lib/chat/quickInsert";
import { CustomTooltip } from "@/components/ui/CustomTooltip";

// dd/mm (năm nay) hoặc dd/mm/yyyy
const dmy = (iso: string) =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}${iso.slice(0, 4) === String(new Date().getFullYear()) ? "" : `/${iso.slice(0, 4)}`}`;
const priceText = (price: number | null, unit: string | null) =>
  price === null
    ? ""
    : ` Giá hiện tại ${formatCurrency(price)}đ${unit ? `/${unit.toLowerCase()}` : ""}.`;

function reorderText(r: UpsellResult["reorder"][number]) {
  return `Dạ anh/chị ơi, lần trước mình lấy ${r.name} ngày ${dmy(r.lastDate)}, chắc cũng sắp hết rồi ạ.${priceText(r.price, r.unit)} Anh/chị có cần em lên đơn thêm không ạ?`;
}

function togetherText(t: UpsellResult["together"][number]) {
  return `Dạ anh/chị ơi, nhiều quán lấy ${t.withName} hay dùng kèm ${t.name}.${priceText(t.price, t.unit)} Anh/chị có muốn em gửi thông tin hoặc mẫu thử không ạ?`;
}

function Row({
  title,
  detail,
  price,
  text,
}: {
  title: string;
  detail: string;
  price: string | null;
  text: string;
}) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          QUICK_ITEM_MIME,
          JSON.stringify({ type: "text", text }),
        );
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-cyan-bg"
      title="Kéo vào ô chat để chèn câu gợi ý"
    >
      {/* Chỉ tên hàng + giá; lý do gợi ý (lần cuối, chu kỳ, trễ / mua kèm) xem bằng tooltip */}
      {/* Wrapper của CustomTooltip là inline-flex → ép giãn hết chỗ để tên hàng cắt "…" đúng */}
      <div className="min-w-0 flex-1 [&>div]:!flex [&>div]:w-full [&>div]:!justify-start [&>div]:!cursor-default">
        <CustomTooltip
          delayMs={250}
          className="!whitespace-normal"
          content={
            <span className="block max-w-[260px]">
              <span className="block font-medium">{title}</span>
              {detail}
            </span>
          }
        >
          <div className="flex min-w-0 items-baseline gap-1.5">
            <p className="m-0 min-w-0 flex-1 truncate text-[13px]">{title}</p>
            {price && (
              <span className="shrink-0 text-xs text-gray-500">{price}</span>
            )}
          </div>
        </CustomTooltip>
      </div>
    </li>
  );
}

/**
 * "Gợi ý bán thêm" ở tab Thông tin POS: món lâu chưa đặt lại (theo chu kỳ mua 12 tháng) và món hay
 * mua kèm (thống kê hoá đơn toàn công ty). Không gọi AI. Chỉ đề xuất — nhân viên tự gửi.
 */
export function UpsellSuggestions({ customerId }: { customerId: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["aiUpsell", customerId],
    queryFn: () => upsellApi(customerId),
    staleTime: 10 * 60_000,
    retry: false,
  });
  const price = (p: number | null, unit: string | null) =>
    p === null
      ? null
      : `${formatCurrency(p)}đ${unit ? `/${unit.toLowerCase()}` : ""}`;

  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">
        Gợi ý bán thêm
      </h4>
      {isLoading ? (
        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Đang
          tính…
        </p>
      ) : isError || !data ? (
        <p className="text-xs text-gray-400">Không tải được gợi ý.</p>
      ) : !data.reorder.length && !data.together.length ? (
        <p className="text-xs text-gray-400">
          Chưa có gợi ý (cần ít nhất 3 lần mua một món trong 12 tháng).
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.reorder.length > 0 && (
            <div>
              <p className="m-0 mb-0.5 px-1 text-xs font-medium text-gray-600">
                Lâu chưa đặt lại
              </p>
              <ul className="m-0 flex list-none flex-col p-0">
                {data.reorder.map((r) => (
                  <Row
                    key={r.productId}
                    title={r.name}
                    detail={`Lần cuối ${dmy(r.lastDate)} · thường ~${r.cycleDays} ngày/lần · trễ ${r.overdueDays} ngày`}
                    price={price(r.price, r.unit)}
                    text={reorderText(r)}
                  />
                ))}
              </ul>
            </div>
          )}
          {data.together.length > 0 && (
            <div>
              <p className="m-0 mb-0.5 px-1 text-xs font-medium text-gray-600">
                Hay mua kèm
              </p>
              <ul className="m-0 flex list-none flex-col p-0">
                {data.together.map((t) => (
                  <Row
                    key={t.productId}
                    title={t.name}
                    detail={`${t.confidence}% đơn có ${t.withName} cũng lấy món này`}
                    price={price(t.price, t.unit)}
                    text={togetherText(t)}
                  />
                ))}
              </ul>
            </div>
          )}
          <p className="m-0 px-1 text-[11px] text-gray-400">
            Theo hoá đơn {data.historyMonths} tháng
            {data.viaCoach
              ? " · khách đi nhà xe nên không gợi ý hàng lạnh"
              : ""}
          </p>
        </div>
      )}
    </div>
  );
}
