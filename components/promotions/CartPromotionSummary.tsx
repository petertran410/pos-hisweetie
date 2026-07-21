"use client";

import { useMemo, useState } from "react";
import { Gift, X, Check, AlertTriangle } from "lucide-react";
import type {
  CartItem,
  CumulativeGiftSelection,
} from "@/app/(dashboard)/ban-hang/page";
import type { PromotionProgress } from "@/lib/types/promotion";

interface Props {
  progress: PromotionProgress[];
  cartItems: CartItem[];
  cumulativeGiftSelections?: Record<number, CumulativeGiftSelection[]>;
  enabledPromotionIds?: number[];
  onTogglePromotion: (
    promotionId: number,
    enabled: boolean,
    matchedProductIds: number[]
  ) => void;
  onSetGiftSelection: (
    promotionId: number,
    selections: CumulativeGiftSelection[]
  ) => void;
}

interface RewardOpt {
  productId: number;
  productCode?: string;
  productName?: string;
  availableStock: number;
  remaining?: number | null;
  conversionValue?: number;
}

/**
 * Khối "Khuyến mãi của đơn hàng" — chỉ dành cho KM cộng dồn (stackable).
 * - Chưa bật: hiện gợi ý + nút Áp dụng.
 * - Đã bật, chưa đủ: thanh tiến độ.
 * - Đã bật, đủ điều kiện: số suất + nút Chọn quà (mở dialog phân bổ).
 */
export function CartPromotionSummary({
  progress,
  cartItems,
  cumulativeGiftSelections,
  enabledPromotionIds,
  onTogglePromotion,
  onSetGiftSelection,
}: Props) {
  const [pickerPromoId, setPickerPromoId] = useState<number | null>(null);

  // Chỉ xử lý KM cộng dồn có SP X trong giỏ.
  const cumulativeProgress = useMemo(
    () =>
      (progress || []).filter(
        (p) => p.stackable && (p.matchedProductIds || []).length > 0
      ),
    [progress]
  );

  if (cumulativeProgress.length === 0) return null;

  const enabledSet = new Set(enabledPromotionIds || []);
  const isEnabled = (p: PromotionProgress) =>
    enabledSet.has(p.promotionId) ||
    cartItems.some(
      (it) =>
        !it.isPromoGift && (it.promoEnabledIds || []).includes(p.promotionId)
    );

  const rewardOptionsOf = (promotionId: number): RewardOpt[] => {
    const giftItem = cartItems.find(
      (it) => it.isPromoGift && it.cumulative && it.promotionId === promotionId
    );
    return (giftItem?.rewardOptions as RewardOpt[]) || [];
  };

  const pickerPromo = cumulativeProgress.find(
    (p) => p.promotionId === pickerPromoId
  );

  return (
    <div className="mb-2 space-y-2">
      {cumulativeProgress.map((p) => {
        const enabled = isEnabled(p);
        const qualified = p.completedTimes > 0;
        const percent = Math.min(
          100,
          Math.round((p.currentQuantity / p.requiredQuantity) * 100)
        );
        const options = rewardOptionsOf(p.promotionId);
        const requiresChoice = options.length > 1;
        const selections =
          cumulativeGiftSelections?.[p.promotionId] || [];
        const allocatedTimes = selections.reduce(
          (s, sel) => s + Number(sel.rewardTimes || 0),
          0
        );
        const needAllocate =
          enabled && qualified && requiresChoice && allocatedTimes !== p.completedTimes;
        // Nhãn đơn vị theo chế độ tính của CT.
        const u = p.unitMode === "carton" ? "thùng" : "gói";

        return (
          <div
            key={p.promotionId}
            className={`rounded-lg border p-2.5 text-sm ${
              !enabled
                ? "border-gray-200 bg-gray-50"
                : needAllocate
                  ? "border-amber-300 bg-amber-50"
                  : qualified
                    ? "border-pink-300 bg-pink-50"
                    : "border-blue-200 bg-blue-50/50"
            }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-medium text-gray-800">
                <Gift className="h-4 w-4 text-pink-600" />
                <span className="text-pink-700">{p.code}</span>
                <span className="text-gray-600">· {p.name}</span>
              </div>
              {!enabled ? (
                <button
                  onClick={() =>
                    onTogglePromotion(p.promotionId, true, p.matchedProductIds)
                  }
                  className="rounded bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-dark">
                  Áp dụng
                </button>
              ) : (
                <button
                  onClick={() =>
                    onTogglePromotion(p.promotionId, false, p.matchedProductIds)
                  }
                  className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100">
                  Bỏ áp dụng
                </button>
              )}
            </div>

            {/* Chưa bật → gợi ý ngắn */}
            {!enabled && (
              <p className="mt-1 text-xs text-gray-500">
                Cộng dồn {p.matchedProductIds.length} sản phẩm trong chương
                trình. Đã mua {p.currentQuantity}/{p.requiredQuantity} {u}.
              </p>
            )}

            {/* Đã bật, chưa đủ → tiến độ */}
            {enabled && !qualified && (
              <div className="mt-1.5">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>
                    Đã mua {p.currentQuantity} / {p.requiredQuantity} {u}
                  </span>
                  <span>
                    Còn {p.remainingToNextReward} {u} để nhận{" "}
                    {p.rewardQuantityPerTime} {u}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Đã bật, đủ điều kiện */}
            {enabled && qualified && (
              <div className="mt-1.5 space-y-1.5">
                <div className="text-xs text-gray-700">
                  {p.currentQuantity} {u} hợp lệ · Đạt{" "}
                  <strong>{p.completedTimes} suất</strong> · Tổng{" "}
                  <strong>{p.earnedRewardQuantity} {u}</strong>
                </div>

                {requiresChoice ? (
                  <>
                    {selections.length > 0 && (
                      <div className="space-y-0.5">
                        {selections
                          .filter((s) => s.rewardTimes > 0)
                          .map((s) => {
                            const opt = options.find(
                              (o) => o.productId === s.productId
                            );
                            // carton: số gói thực tế = suất × perTime × conversionValue.
                            const perProd =
                              s.rewardTimes * p.rewardQuantityPerTime;
                            const goi =
                              p.unitMode === "carton"
                                ? Math.round(
                                    perProd *
                                      Number(opt?.conversionValue || 1)
                                  )
                                : perProd;
                            return (
                              <div
                                key={s.productId}
                                className="flex justify-between text-xs text-gray-700">
                                <span>
                                  {s.productName || `SP#${s.productId}`}
                                </span>
                                <span>
                                  {s.rewardTimes} suất ·{" "}
                                  {p.unitMode === "carton"
                                    ? `${perProd} thùng (${goi} gói)`
                                    : `${perProd} quà`}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                    {needAllocate && (
                      <div className="flex items-center gap-1 text-xs font-medium text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Chưa phân bổ đủ {p.completedTimes} suất quà
                      </div>
                    )}
                    <button
                      onClick={() => setPickerPromoId(p.promotionId)}
                      className="rounded bg-pink-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-pink-700">
                      {selections.length > 0 ? "Thay đổi phân bổ" : "Chọn quà"}
                    </button>
                  </>
                ) : (
                  <div className="text-xs text-gray-600">
                    Quà được thêm tự động vào giỏ.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {pickerPromo && (
        <GiftAllocationDialog
          promo={pickerPromo}
          options={rewardOptionsOf(pickerPromo.promotionId)}
          selections={
            cumulativeGiftSelections?.[pickerPromo.promotionId] || []
          }
          onClose={() => setPickerPromoId(null)}
          onConfirm={(sel) => {
            onSetGiftSelection(pickerPromo.promotionId, sel);
            setPickerPromoId(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Dialog/bottom-sheet phân bổ quà cộng dồn theo suất.
 * Người dùng tăng/giảm số suất cho từng SP quà, tổng suất phải = completedTimes.
 */
function GiftAllocationDialog({
  promo,
  options,
  selections,
  onClose,
  onConfirm,
}: {
  promo: PromotionProgress;
  options: RewardOpt[];
  selections: CumulativeGiftSelection[];
  onClose: () => void;
  onConfirm: (sel: CumulativeGiftSelection[]) => void;
}) {
  const totalTimes = promo.completedTimes;
  const perTime = promo.rewardQuantityPerTime;
  const isCarton = promo.unitMode === "carton";
  const u = isCarton ? "thùng" : "quà";

  // Map productId -> số suất đang chọn.
  const [draft, setDraft] = useState<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    selections.forEach((s) => (m[s.productId] = Number(s.rewardTimes || 0)));
    return m;
  });

  const allocated = Object.values(draft).reduce((s, n) => s + (n || 0), 0);
  const remaining = totalTimes - allocated;

  // Suất tối đa của 1 SP = min(số suất còn trống + suất đang giữ, trần remaining/perTime).
  const maxTimesFor = (opt: RewardOpt): number => {
    const byRemaining =
      opt.remaining != null
        ? Math.floor(Number(opt.remaining) / Math.max(1, perTime))
        : Infinity;
    return byRemaining;
  };

  const setTimes = (productId: number, next: number) => {
    setDraft((prev) => {
      const clampedNonNeg = Math.max(0, next);
      const others = Object.entries(prev).reduce(
        (s, [pid, n]) => (Number(pid) === productId ? s : s + (n || 0)),
        0
      );
      // Không vượt tổng suất.
      const capByTotal = totalTimes - others;
      const opt = options.find((o) => o.productId === productId);
      const capByStock = opt ? maxTimesFor(opt) : Infinity;
      const value = Math.min(clampedNonNeg, capByTotal, capByStock);
      return { ...prev, [productId]: value };
    });
  };

  const handleConfirm = () => {
    const sel: CumulativeGiftSelection[] = options
      .filter((o) => (draft[o.productId] || 0) > 0)
      .map((o) => ({
        productId: o.productId,
        productCode: o.productCode,
        productName: o.productName,
        rewardTimes: draft[o.productId],
      }));
    onConfirm(sel);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">Phân bổ quà khuyến mãi</h3>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-4 py-2 text-sm text-gray-600">
          Đạt <strong>{totalTimes} suất</strong> · Mỗi suất nhận{" "}
          <strong>{perTime} {u}</strong> · Tổng{" "}
          <strong>{totalTimes * perTime} {u}</strong>
          {isCarton && (
            <span className="block text-xs text-gray-400">
              Số gói thực tế = số thùng × định lượng đóng gói của từng SP quà.
            </span>
          )}
        </div>

        <div className="max-h-[50vh] space-y-1 overflow-auto px-4 py-2">
          {options.map((o) => {
            const times = draft[o.productId] || 0;
            const outOfStock = o.remaining != null && o.remaining <= 0;
            return (
              <div
                key={o.productId}
                className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-800">
                    {o.productName || `SP#${o.productId}`}
                    {o.productCode ? ` · ${o.productCode}` : ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    Tồn khuyến mãi {o.availableStock}
                    {o.remaining != null
                      ? ` · Còn được tặng ${o.remaining} ${u}`
                      : " · Không giới hạn"}
                    {isCarton &&
                      Number(o.conversionValue || 0) > 0 &&
                      ` · ${o.conversionValue} gói/thùng`}
                  </div>
                </div>
                {outOfStock ? (
                  <span className="text-xs text-gray-400">Hết suất</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setTimes(o.productId, times - 1)}
                      disabled={times <= 0}
                      className="h-7 w-7 rounded border border-gray-300 text-gray-600 disabled:opacity-40">
                      −
                    </button>
                    <span className="w-14 text-center text-sm">
                      {times} suất
                    </span>
                    <button
                      onClick={() => setTimes(o.productId, times + 1)}
                      disabled={remaining <= 0 || times >= maxTimesFor(o)}
                      className="h-7 w-7 rounded border border-gray-300 text-gray-600 disabled:opacity-40">
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-2 text-xs">
          <span
            className={
              allocated === totalTimes ? "text-green-600" : "text-amber-600"
            }>
            Đã phân bổ {allocated} / {totalTimes} suất · {allocated * perTime} /{" "}
            {totalTimes * perTime} {u}
            {isCarton && allocated > 0 && (
              <span className="text-gray-400">
                {" "}
                ·{" "}
                {options
                  .filter((o) => (draft[o.productId] || 0) > 0)
                  .reduce(
                    (s, o) =>
                      s +
                      Math.round(
                        (draft[o.productId] || 0) *
                          perTime *
                          Number(o.conversionValue || 1)
                      ),
                    0
                  )}{" "}
                gói
              </span>
            )}
          </span>
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm">
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={allocated !== totalTimes || allocated === 0}
            className="flex items-center gap-1 rounded bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">
            <Check className="h-4 w-4" />
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
