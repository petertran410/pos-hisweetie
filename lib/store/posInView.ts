import { useEffect } from "react";
import { create } from "zustand";

export interface CartLine {
  name: string;
  code?: string;
  unit?: string;
  quantity: number;
  price: number;
  discount: number;
  isGift?: boolean;
}

/** Hóa đơn / đặt hàng / sản phẩm / giỏ POS đang mở bên trái — gợi ý cho menu "/" của chat. */
export type PosInViewItem =
  | { type: "invoice" | "order"; id: number; code: string }
  | { type: "product"; id: number; code: string; name: string }
  | { type: "cart"; id: string; label: string; lines: CartLine[] };

interface PosInViewState {
  entries: Record<string, PosInViewItem>;
  register: (key: string, item: PosInViewItem) => void;
  unregister: (key: string) => void;
}

export const usePosInViewStore = create<PosInViewState>()((set) => ({
  entries: {},
  register: (key, item) => set((s) => ({ entries: { ...s.entries, [key]: item } })),
  unregister: (key) =>
    set((s) => {
      const rest = { ...s.entries };
      delete rest[key];
      return { entries: rest };
    }),
}));

let seq = 0;

/** Đăng ký mục đang xem khi mount, gỡ khi unmount hoặc khi mục đổi. */
export function useRegisterPosInView(item: PosInViewItem | null | undefined) {
  // So sánh theo nội dung — giỏ hàng đổi số lượng thì cập nhật gợi ý
  const json = item ? JSON.stringify(item) : null;
  useEffect(() => {
    if (!json) return;
    const key = `p${++seq}`;
    usePosInViewStore.getState().register(key, JSON.parse(json));
    return () => usePosInViewStore.getState().unregister(key);
  }, [json]);
}
