import { useEffect } from "react";
import { create } from "zustand";
import type { ChatCustomerRef } from "./chatSidebar";

export interface CustomerInView extends ChatCustomerRef {
  // vd "Chi tiết khách", "Hóa đơn HD001"
  source: string;
}

interface CustomersInViewState {
  entries: Record<string, CustomerInView>;
  register: (key: string, entry: CustomerInView) => void;
  unregister: (key: string) => void;
}

/** Khách đang hiển thị trên màn hình — để sidebar chat gợi ý (không persist). */
export const useCustomersInViewStore = create<CustomersInViewState>()((set) => ({
  entries: {},
  register: (key, entry) =>
    set((s) => ({ entries: { ...s.entries, [key]: entry } })),
  unregister: (key) =>
    set((s) => {
      const rest = { ...s.entries };
      delete rest[key];
      return { entries: rest };
    }),
}));

let seq = 0;

/** Đăng ký khách đang xem khi mount, gỡ khi unmount hoặc khi khách đổi. */
export function useRegisterCustomerInView(
  customer: { id: number; code?: string | null; name?: string | null } | null | undefined,
  source: string
) {
  const id = customer?.id;
  const code = customer?.code ?? null;
  const name = customer?.name ?? "";
  useEffect(() => {
    if (!id) return;
    const key = `c${++seq}`;
    const store = useCustomersInViewStore.getState();
    store.register(key, { id, code, name, source });
    return () => useCustomersInViewStore.getState().unregister(key);
  }, [id, code, name, source]);
}
