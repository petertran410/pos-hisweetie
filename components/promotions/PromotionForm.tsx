"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  Promotion,
  PromotionType,
  PromotionReward,
  PromotionProductRef,
  CreatePromotionPayload,
  PROMOTION_TYPE_LABELS,
} from "@/lib/types/promotion";
import {
  useCreatePromotion,
  useUpdatePromotion,
  usePromotion,
} from "@/lib/hooks/usePromotions";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCustomerGroups } from "@/lib/hooks/useCustomerGroups";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { ProductPicker } from "./ProductPicker";
import { MultiProductPicker } from "./MultiProductPicker";

interface Props {
  promotion?: Promotion | null;
  onClose: () => void;
}

const WEEKDAYS = [
  { value: 2, label: "T2" },
  { value: 3, label: "T3" },
  { value: 4, label: "T4" },
  { value: 5, label: "T5" },
  { value: 6, label: "T6" },
  { value: 7, label: "T7" },
  { value: 1, label: "CN" },
];

// Loại dùng multi-X/Y (chọn nhiều SP + nhóm hàng)
const MULTI_TYPES: PromotionType[] = ["BUY_X_GET_Y", "BUY_X_BUY_Y_PRICE"];
// cần buyQuantity
const NEEDS_BUY_QTY: PromotionType[] = [
  "BUY_X_GET_Y",
  "BUY_N_GET_M_SAME",
  "BUY_X_BUY_Y_PRICE",
];

export function PromotionForm({ promotion, onClose }: Props) {
  const isEdit = !!promotion;
  const createMut = useCreatePromotion();
  const updateMut = useUpdatePromotion();
  // Khi sửa: fetch chi tiết đầy đủ (findOne include products/customers/users),
  // vì dữ liệu từ danh sách (findAll) không có X/Y, khách hàng, người tạo GD.
  const { data: detail } = usePromotion(promotion?.id);
  const { data: branches } = useBranches();
  const { data: groupsResp } = useCustomerGroups();
  const groups = groupsResp?.data || [];
  const { data: usersList } = useUsersForFilter();
  const [customerSearch, setCustomerSearch] = useState("");
  const { data: customerResp } = useSearchCustomers(customerSearch);
  const customers = customerResp?.data || [];

  const [tab, setTab] = useState<"info" | "scope">("info");

  const [form, setForm] = useState<CreatePromotionPayload>({
    code: "",
    name: "",
    type: "INVOICE_DISCOUNT",
    priority: 0,
    autoApply: true,
    stackable: false,
    forAllBranch: true,
    forAllCustomer: true,
    forAllUser: true,
    minOrderValue: 0,
    minQuantity: 0,
    applyWeekdays: [],
    branchIds: [],
    customerIds: [],
    customerGroupIds: [],
    userIds: [],
    rewards: [{ rewardType: "discount_amount", rewardValue: 0 }],
  });

  // labels cho picker
  const [buyLabel, setBuyLabel] = useState<string>("");
  const [rewardLabel, setRewardLabel] = useState<string>("");
  const [buyItemLabels, setBuyItemLabels] = useState<Record<number, string>>({});
  const [rewardItemLabels, setRewardItemLabels] = useState<Record<number, string>>({});
  const [customerLabels, setCustomerLabels] = useState<Record<number, string>>({});

  useEffect(() => {
    const promotion = detail;
    if (!promotion) return;
    const rw = promotion.rewards?.[0] || { rewardType: "discount_amount" };
    const buyItems =
      promotion.products?.filter((p) => p.role === "buy").map((p) => ({
        productId: p.productId ?? undefined,
        categoryName: p.categoryName ?? undefined,
      })) || [];
    const rewardItems =
      promotion.products?.filter((p) => p.role === "reward").map((p) => ({
        productId: p.productId ?? undefined,
        categoryName: p.categoryName ?? undefined,
      })) || [];

    setForm({
      code: promotion.code,
      name: promotion.name,
      type: promotion.type,
      description: promotion.description || "",
      priority: promotion.priority,
      autoApply: promotion.autoApply,
      stackable: promotion.stackable,
      startDate: promotion.startDate ? promotion.startDate.slice(0, 16) : undefined,
      endDate: promotion.endDate ? promotion.endDate.slice(0, 16) : undefined,
      applyTimeFrom: promotion.applyTimeFrom || undefined,
      applyTimeTo: promotion.applyTimeTo || undefined,
      applyWeekdays: promotion.applyWeekdays || [],
      forAllBranch: promotion.forAllBranch,
      forAllCustomer: promotion.forAllCustomer,
      forAllUser: promotion.forAllUser,
      minOrderValue: Number(promotion.minOrderValue),
      minQuantity: Number(promotion.minQuantity),
      maxDiscountAmount: promotion.maxDiscountAmount
        ? Number(promotion.maxDiscountAmount)
        : undefined,
      maxRewardQuantity: promotion.maxRewardQuantity
        ? Number(promotion.maxRewardQuantity)
        : undefined,
      usageLimit: promotion.usageLimit ?? undefined,
      branchIds: promotion.branches?.map((b) => b.branchId) || [],
      customerIds: promotion.customers?.map((c) => c.customerId) || [],
      customerGroupIds:
        promotion.customerGroups?.map((g) => g.customerGroupId) || [],
      userIds: promotion.users?.map((u) => u.userId) || [],
      rewards: [
        {
          buyProductId: rw.buyProductId ?? null,
          buyCategoryName: rw.buyCategoryName ?? null,
          buyQuantity: Number(rw.buyQuantity ?? 0),
          rewardType: rw.rewardType,
          rewardProductId: rw.rewardProductId ?? null,
          rewardQuantity: Number(rw.rewardQuantity ?? 0),
          rewardValue: Number(rw.rewardValue ?? 0),
          buyItems: buyItems.length ? buyItems : undefined,
          rewardItems: rewardItems.length ? rewardItems : undefined,
        },
      ],
    });
    setBuyLabel(rw.buyProduct ? `${rw.buyProduct.name} (${rw.buyProduct.code})` : "");
    setRewardLabel(
      rw.rewardProduct ? `${rw.rewardProduct.name} (${rw.rewardProduct.code})` : "",
    );
    // labels cho multi từ products.product
    const bl: Record<number, string> = {};
    const rl: Record<number, string> = {};
    promotion.products?.forEach((p) => {
      if (p.productId && p.product) {
        const lbl = `${p.product.name} (${p.product.code})`;
        if (p.role === "buy") bl[p.productId] = lbl;
        else rl[p.productId] = lbl;
      }
    });
    setBuyItemLabels(bl);
    setRewardItemLabels(rl);
    const cl: Record<number, string> = {};
    promotion.customers?.forEach((c) => {
      cl[c.customerId] = c.customer
        ? `${c.customer.name}${c.customer.phone ? ` - ${c.customer.phone}` : ""}`
        : `KH#${c.customerId}`;
    });
    setCustomerLabels(cl);
  }, [detail]);

  const reward = form.rewards[0];
  const setReward = (patch: Partial<PromotionReward>) =>
    setForm((f) => ({ ...f, rewards: [{ ...f.rewards[0], ...patch }] }));

  const onChangeType = (type: PromotionType) => {
    let rewardType: PromotionReward["rewardType"] = "discount_amount";
    if (type === "BUY_X_GET_Y" || type === "BUY_N_GET_M_SAME" || type === "GIFT_BY_INVOICE")
      rewardType = "gift";
    else if (type === "BUY_X_BUY_Y_PRICE") rewardType = "discounted_buy";
    setForm((f) => ({
      ...f,
      type,
      rewards: [
        {
          ...f.rewards[0],
          rewardType,
          buyProductId: null,
          rewardProductId: null,
          buyCategoryName: null,
          buyItems: undefined,
          rewardItems: undefined,
        },
      ],
    }));
    setBuyLabel("");
    setRewardLabel("");
    setBuyItemLabels({});
    setRewardItemLabels({});
  };

  const toggleWeekday = (d: number) =>
    setForm((f) => {
      const set = new Set(f.applyWeekdays || []);
      if (set.has(d)) set.delete(d);
      else set.add(d);
      return { ...f, applyWeekdays: [...set] };
    });

  const toggleId = (key: "branchIds" | "customerGroupIds" | "userIds" | "customerIds", id: number) =>
    setForm((f) => {
      const set = new Set((f[key] as number[]) || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...f, [key]: [...set] };
    });

  const handleSubmit = () => {
    if (!form.code.trim()) return toast.error("Vui lòng nhập mã chương trình");
    if (!form.name.trim()) return toast.error("Vui lòng nhập tên chương trình");

    const payload: CreatePromotionPayload = {
      ...form,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    };

    if (isEdit) {
      updateMut.mutate({ id: promotion!.id, data: payload }, { onSuccess: onClose });
    } else {
      createMut.mutate(payload, { onSuccess: onClose });
    }
  };

  const isMulti = MULTI_TYPES.includes(form.type);
  const showInvoiceDiscountValue =
    form.type === "INVOICE_DISCOUNT" ||
    form.type === "PRODUCT_DISCOUNT" ||
    form.type === "CATEGORY_DISCOUNT";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4">
      <div className="my-4 w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Sửa chương trình khuyến mãi" : "Tạo chương trình khuyến mãi"}
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b px-5">
          <button
            onClick={() => setTab("info")}
            className={`py-3 text-sm font-medium ${
              tab === "info"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500"
            }`}
          >
            Thông tin
          </button>
          <button
            onClick={() => setTab("scope")}
            className={`py-3 text-sm font-medium ${
              tab === "scope"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500"
            }`}
          >
            Phạm vi áp dụng
          </button>
        </div>

        <div className="space-y-6 px-5 py-4">
          {tab === "info" && (
            <>
              {/* Thông tin chung */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Thông tin chung</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Mã chương trình *</label>
                    <input
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={form.code}
                      disabled={isEdit}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Tên chương trình *</label>
                    <input
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Loại khuyến mãi *</label>
                    <select
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={form.type}
                      onChange={(e) => onChangeType(e.target.value as PromotionType)}
                    >
                      {Object.entries(PROMOTION_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Độ ưu tiên</label>
                    <input
                      type="number"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={form.priority}
                      onChange={(e) =>
                        setForm({ ...form, priority: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.autoApply}
                      onChange={(e) =>
                        setForm({ ...form, autoApply: e.target.checked })
                      }
                    />
                    Tự động áp dụng (bỏ tick = chỉ gợi ý)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.stackable}
                      onChange={(e) =>
                        setForm({ ...form, stackable: e.target.checked })
                      }
                    />
                    Cho phép cộng dồn
                  </label>
                </div>
              </section>

              {/* Phần thưởng */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Phần thưởng</h3>

                {/* Multi X/Y */}
                {isMulti && (
                  <>
                    <MultiProductPicker
                      label="Sản phẩm / nhóm hàng điều kiện mua (X) — gộp tổng số lượng"
                      items={reward.buyItems || []}
                      productLabels={buyItemLabels}
                      onChange={(items, labels) => {
                        setReward({ buyItems: items });
                        setBuyItemLabels(labels);
                      }}
                    />
                    <MultiProductPicker
                      label={
                        form.type === "BUY_X_BUY_Y_PRICE"
                          ? "Sản phẩm / nhóm hàng mua kèm (Y)"
                          : "Sản phẩm / nhóm hàng tặng (Y)"
                      }
                      items={reward.rewardItems || []}
                      productLabels={rewardItemLabels}
                      onChange={(items, labels) => {
                        setReward({ rewardItems: items });
                        setRewardItemLabels(labels);
                      }}
                    />
                  </>
                )}

                {/* Single buy product (PRODUCT_DISCOUNT) */}
                {form.type === "PRODUCT_DISCOUNT" && (
                  <div>
                    <label className="text-xs text-gray-500">Sản phẩm áp dụng</label>
                    <ProductPicker
                      value={reward.buyProductId}
                      productLabel={buyLabel}
                      onChange={(p) => {
                        setReward({ buyProductId: p?.id ?? null });
                        setBuyLabel(p ? `${p.name} (${p.code})` : "");
                      }}
                    />
                  </div>
                )}

                {form.type === "CATEGORY_DISCOUNT" && (
                  <div>
                    <label className="text-xs text-gray-500">Tên nhóm hàng</label>
                    <input
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={reward.buyCategoryName || ""}
                      onChange={(e) => setReward({ buyCategoryName: e.target.value })}
                      placeholder="VD: Mứt"
                    />
                  </div>
                )}

                {/* BUY_N_GET_M_SAME: 1 sản phẩm */}
                {form.type === "BUY_N_GET_M_SAME" && (
                  <div>
                    <label className="text-xs text-gray-500">Sản phẩm (mua N tặng M)</label>
                    <ProductPicker
                      value={reward.buyProductId}
                      productLabel={buyLabel}
                      onChange={(p) => {
                        setReward({ buyProductId: p?.id ?? null });
                        setBuyLabel(p ? `${p.name} (${p.code})` : "");
                      }}
                    />
                  </div>
                )}

                {/* GIFT_BY_INVOICE: 1 sản phẩm tặng */}
                {form.type === "GIFT_BY_INVOICE" && (
                  <div>
                    <label className="text-xs text-gray-500">Sản phẩm tặng</label>
                    <ProductPicker
                      value={reward.rewardProductId}
                      productLabel={rewardLabel}
                      onChange={(p) => {
                        setReward({ rewardProductId: p?.id ?? null });
                        setRewardLabel(p ? `${p.name} (${p.code})` : "");
                      }}
                    />
                  </div>
                )}

                {NEEDS_BUY_QTY.includes(form.type) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Số lượng mua (X / N)</label>
                      <input
                        type="number"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        value={reward.buyQuantity || 0}
                        onChange={(e) =>
                          setReward({ buyQuantity: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Số lượng tặng / mua kèm (Y / M)
                      </label>
                      <input
                        type="number"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        value={reward.rewardQuantity || 0}
                        onChange={(e) =>
                          setReward({ rewardQuantity: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                )}

                {form.type === "GIFT_BY_INVOICE" && (
                  <div>
                    <label className="text-xs text-gray-500">Số lượng quà tặng</label>
                    <input
                      type="number"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={reward.rewardQuantity || 0}
                      onChange={(e) =>
                        setReward({ rewardQuantity: Number(e.target.value) })
                      }
                    />
                  </div>
                )}

                {showInvoiceDiscountValue && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Kiểu giảm</label>
                      <select
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        value={reward.rewardType}
                        onChange={(e) =>
                          setReward({
                            rewardType: e.target.value as PromotionReward["rewardType"],
                          })
                        }
                      >
                        <option value="discount_amount">Theo số tiền (đ)</option>
                        <option value="discount_percent">Theo phần trăm (%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Giá trị giảm</label>
                      <input
                        type="number"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        value={reward.rewardValue || 0}
                        onChange={(e) =>
                          setReward({ rewardValue: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                )}

                {form.type === "BUY_X_BUY_Y_PRICE" && (
                  <div>
                    <label className="text-xs text-gray-500">
                      Giá khuyến mãi mua kèm (đ)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={reward.rewardValue || 0}
                      onChange={(e) =>
                        setReward({ rewardValue: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
              </section>

              {/* Điều kiện */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Điều kiện áp dụng</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Ngày bắt đầu</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={form.startDate || ""}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Ngày kết thúc</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={form.endDate || ""}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Khung giờ từ</label>
                    <input
                      type="time"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={form.applyTimeFrom || ""}
                      onChange={(e) =>
                        setForm({ ...form, applyTimeFrom: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Khung giờ đến</label>
                    <input
                      type="time"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={form.applyTimeTo || ""}
                      onChange={(e) =>
                        setForm({ ...form, applyTimeTo: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Ngày trong tuần (trống = mọi ngày)
                  </label>
                  <div className="mt-1 flex gap-2">
                    {WEEKDAYS.map((w) => (
                      <button
                        key={w.value}
                        type="button"
                        onClick={() => toggleWeekday(w.value)}
                        className={`rounded px-3 py-1 text-sm ${
                          form.applyWeekdays?.includes(w.value)
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Tổng tiền tối thiểu (đ)</label>
                    <input
                      type="number"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={form.minOrderValue}
                      onChange={(e) =>
                        setForm({ ...form, minOrderValue: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Số lượng tối thiểu</label>
                    <input
                      type="number"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={form.minQuantity}
                      onChange={(e) =>
                        setForm({ ...form, minQuantity: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Trần số tiền giảm (đ)</label>
                    <input
                      type="number"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={form.maxDiscountAmount ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          maxDiscountAmount: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Trần SL tặng / mua kèm</label>
                    <input
                      type="number"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      value={form.maxRewardQuantity ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          maxRewardQuantity: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === "scope" && (
            <>
              {/* Chi nhánh */}
              <section className="rounded-lg border p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-800">Chi nhánh</h3>
                <RadioRow
                  checked={form.forAllBranch !== false}
                  onClick={() => setForm({ ...form, forAllBranch: true })}
                  label="Toàn hệ thống"
                />
                <RadioRow
                  checked={form.forAllBranch === false}
                  onClick={() => setForm({ ...form, forAllBranch: false })}
                  label="Chi nhánh cụ thể"
                />
                {form.forAllBranch === false && (
                  <div className="mt-2 flex flex-wrap gap-2 pl-7">
                    {(branches || []).map((b: any) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleId("branchIds", b.id)}
                        className={`rounded px-3 py-1 text-sm ${
                          form.branchIds?.includes(b.id)
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Nhóm khách hàng */}
              <section className="rounded-lg border p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-800">
                  Nhóm khách hàng
                </h3>
                <RadioRow
                  checked={form.forAllCustomer !== false}
                  onClick={() => setForm({ ...form, forAllCustomer: true })}
                  label="Tất cả"
                />
                <RadioRow
                  checked={form.forAllCustomer === false}
                  onClick={() => setForm({ ...form, forAllCustomer: false })}
                  label="Nhóm khách hàng cụ thể"
                />
                {form.forAllCustomer === false && (
                  <div className="mt-2 flex flex-wrap gap-2 pl-7">
                    {groups.map((g: any) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleId("customerGroupIds", g.id)}
                        className={`rounded px-3 py-1 text-sm ${
                          form.customerGroupIds?.includes(g.id)
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Khách hàng cụ thể */}
              <section className="rounded-lg border p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-800">Khách hàng</h3>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Tìm khách hàng theo tên / SĐT..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
                {customerSearch && customers.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-auto rounded border border-gray-200">
                    {customers.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={() => {
                          if (!form.customerIds?.includes(c.id)) {
                            toggleId("customerIds", c.id);
                            setCustomerLabels((prev) => ({
                              ...prev,
                              [c.id]: `${c.name}${c.phone ? ` - ${c.phone}` : ""}`,
                            }));
                          }
                          setCustomerSearch("");
                        }}
                      >
                        {c.name}
                        {c.phone ? ` - ${c.phone}` : ""}
                      </button>
                    ))}
                  </div>
                )}
                {(form.customerIds?.length || 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.customerIds!.map((id) => (
                      <span
                        key={id}
                        className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs"
                      >
                        {customerLabels[id] || `KH#${id}`}
                        <button
                          type="button"
                          onClick={() => toggleId("customerIds", id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  Để trống nếu áp dụng cho mọi khách hàng (hoặc theo nhóm ở trên).
                </p>
              </section>

              {/* Người tạo giao dịch */}
              <section className="rounded-lg border p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-800">
                  Người tạo giao dịch
                </h3>
                <RadioRow
                  checked={form.forAllUser !== false}
                  onClick={() => setForm({ ...form, forAllUser: true })}
                  label="Tất cả"
                />
                <RadioRow
                  checked={form.forAllUser === false}
                  onClick={() => setForm({ ...form, forAllUser: false })}
                  label="Người tạo giao dịch cụ thể"
                />
                {form.forAllUser === false && (
                  <div className="mt-2 flex flex-wrap gap-2 pl-7">
                    {(usersList || []).map((u: any) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleId("userIds", u.id)}
                        className={`rounded px-3 py-1 text-sm ${
                          form.userIds?.includes(u.id)
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <strong>Lưu ý:</strong> Chỉ thêm chương trình khuyến mãi cho chi nhánh
                được phân quyền.
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm"
          >
            Bỏ qua
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMut.isPending || updateMut.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isEdit ? "Lưu thay đổi" : "Lưu (F9)"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RadioRow({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-1.5 text-left"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          checked ? "border-blue-600" : "border-gray-300"
        }`}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}
