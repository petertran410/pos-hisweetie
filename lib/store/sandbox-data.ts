import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Order } from "@/lib/types/order";
import type { Invoice } from "@/lib/types/invoice";

// ─── Generic entity collection ───
interface EntityCollection<T> {
  items: T[];
  nextId: number;
}

function createCollection<T>(): EntityCollection<T> {
  return { items: [], nextId: 10001 };
}

// ─── Store interface ───
export interface SandboxDataState {
  orders: EntityCollection<Order>;
  invoices: EntityCollection<Invoice>;
  returnOrders: EntityCollection<any>;
  packings: EntityCollection<any>;

  // Generic CRUD
  addEntity: <K extends EntityKey>(key: K, item: Omit<any, "id">) => any;
  updateEntity: <K extends EntityKey>(
    key: K,
    id: number,
    patch: Partial<any>
  ) => void;
  removeEntity: <K extends EntityKey>(key: K, id: number) => void;
  getEntities: <K extends EntityKey>(key: K) => any[];

  // Reset
  clearAllSandboxData: () => void;
  seedDemoData: () => void;
}

type EntityKey = "orders" | "invoices" | "returnOrders" | "packings";

const generateCode = (prefix: string, id: number) =>
  `${prefix}${id.toString().padStart(6, "0")}`;

const now = () => new Date().toISOString();

export const useSandboxDataStore = create<SandboxDataState>()(
  persist(
    (set, get) => ({
      orders: createCollection<Order>(),
      invoices: createCollection<Invoice>(),
      returnOrders: createCollection<any>(),
      packings: createCollection<any>(),

      addEntity: (key, item) => {
        const col = get()[key];
        const id = col.nextId;
        const codePrefix: Record<EntityKey, string> = {
          orders: "DH",
          invoices: "HD",
          returnOrders: "TH",
          packings: "BD",
        };

        const newItem = {
          ...item,
          id,
          code: generateCode(codePrefix[key], id),
          createdAt: now(),
          updatedAt: now(),
        };

        set((state) => ({
          [key]: {
            items: [newItem, ...state[key].items],
            nextId: state[key].nextId + 1,
          },
        }));

        return newItem;
      },

      updateEntity: (key, id, patch) => {
        set((state) => ({
          [key]: {
            ...state[key],
            items: state[key].items.map((item: any) =>
              item.id === id ? { ...item, ...patch, updatedAt: now() } : item
            ),
          },
        }));
      },

      removeEntity: (key, id) => {
        set((state) => ({
          [key]: {
            ...state[key],
            items: state[key].items.filter((item: any) => item.id !== id),
          },
        }));
      },

      getEntities: (key) => get()[key].items,

      clearAllSandboxData: () => {
        set({
          orders: createCollection(),
          invoices: createCollection(),
          returnOrders: createCollection(),
          packings: createCollection(),
        });
      },

      seedDemoData: () => {
        const baseTime = new Date();
        const demoOrders: Order[] = Array.from({ length: 5 }, (_, i) => {
          const id = 10001 + i;
          const total =
            Math.round((Math.random() * 5000000 + 500000) / 1000) * 1000;
          const paid = i < 2 ? total : Math.round(total * 0.5);
          return {
            id,
            code: generateCode("DH", id),
            customerId: 1,
            branchId: 1,
            orderDate: new Date(
              baseTime.getTime() - i * 86400000
            ).toISOString(),
            totalAmount: total,
            discount: 0,
            discountRatio: 0,
            grandTotal: total,
            paidAmount: paid,
            debtAmount: total - paid,
            depositAmount: 0,
            paymentStatus: paid >= total ? "Paid" : "Partial",
            orderStatus: i < 2 ? "completed" : "pending",
            status: i < 2 ? 3 : 1,
            statusValue: i < 2 ? "Hoàn thành" : "Phiếu tạm",
            usingCod: false,
            createdBy: 1,
            createdAt: new Date(
              baseTime.getTime() - i * 86400000
            ).toISOString(),
            updatedAt: new Date(
              baseTime.getTime() - i * 86400000
            ).toISOString(),
            customer: { id: 1, name: `Khách sandbox ${i + 1}` },
            branch: { id: 1, name: "Chi nhánh sandbox" },
            soldBy: { id: 1, name: "NV sandbox" },
            creator: { id: 1, name: "NV sandbox" },
            items: [],
            payments: [],
          } as Order;
        });

        const demoInvoices: Invoice[] = Array.from({ length: 5 }, (_, i) => {
          const id = 10001 + i;
          const total =
            Math.round((Math.random() * 8000000 + 1000000) / 1000) * 1000;
          const paid = i < 3 ? total : Math.round(total * 0.3);
          return {
            id,
            code: generateCode("HD", id),
            customerId: 1,
            branchId: 1,
            purchaseDate: new Date(
              baseTime.getTime() - i * 86400000
            ).toISOString(),
            totalAmount: total,
            discount: 0,
            discountRatio: 0,
            grandTotal: total,
            paidAmount: paid,
            debtAmount: total - paid,
            status: i < 3 ? 1 : 3,
            statusValue: i < 3 ? "Hoàn thành" : "Đang xử lý",
            usingCod: false,
            createdBy: 1,
            createdAt: new Date(
              baseTime.getTime() - i * 86400000
            ).toISOString(),
            updatedAt: new Date(
              baseTime.getTime() - i * 86400000
            ).toISOString(),
            customer: { id: 1, name: `Khách sandbox ${i + 1}` },
            branch: { id: 1, name: "Chi nhánh sandbox" },
            soldBy: { id: 1, name: "NV sandbox" },
            creator: { id: 1, name: "NV sandbox" },
            details: [],
            payments: [],
          } as Invoice;
        });

        const demoReturnOrders = Array.from({ length: 3 }, (_, i) => {
          const id = 10001 + i;
          const returnAmount =
            Math.round((Math.random() * 2000000 + 200000) / 1000) * 1000;
          const statusMap = [
            { status: 1, statusValue: "Yêu cầu trả hàng" },
            { status: 4, statusValue: "Hoàn thành" },
            { status: 3, statusValue: "Yêu cầu hoàn tiền" },
          ];
          const s = statusMap[i];
          return {
            id,
            code: generateCode("TH", id),
            invoiceId: 10001 + i,
            customerId: 1,
            branchId: 1,
            status: s.status,
            statusValue: s.statusValue,
            totalReturnAmount: returnAmount,
            refundAmount: s.status === 4 ? returnAmount : 0,
            refundedAmount: s.status === 4 ? returnAmount : 0,
            refundType: s.status === 4 ? "cash" : undefined,
            createdBy: 1,
            createdByName: "NV sandbox",
            createdAt: new Date(
              baseTime.getTime() - i * 86400000
            ).toISOString(),
            updatedAt: new Date(
              baseTime.getTime() - i * 86400000
            ).toISOString(),
            invoice: { id: 10001 + i, code: generateCode("HD", 10001 + i) },
            customer: { id: 1, name: `Khách sandbox ${i + 1}` },
            branch: { id: 1, name: "Chi nhánh sandbox" },
            creator: { id: 1, name: "NV sandbox" },
            details: [],
          };
        });

        // ── Packings (MỚI) — mixed types giống useAllPacking response ──
        const demoPackings = Array.from({ length: 3 }, (_, i) => {
          const id = 10001 + i;
          const types = ["packing-slip", "packing-hang", "packing-loading"];
          const typeLabels = ["Giao hàng", "Đóng hàng", "Loading"];
          return {
            id,
            code: generateCode("BD", id),
            type: types[i],
            typeLabel: typeLabels[i],
            branchId: 1,
            numberOfPackages: Math.floor(Math.random() * 10) + 1,
            note: `Sandbox ${typeLabels[i]} #${i + 1}`,
            createdBy: 1,
            createdAt: new Date(
              baseTime.getTime() - i * 86400000
            ).toISOString(),
            updatedAt: new Date(
              baseTime.getTime() - i * 86400000
            ).toISOString(),
            branch: { id: 1, name: "Chi nhánh sandbox" },
            creator: { id: 1, name: "NV sandbox" },
            invoices: [],
            images: [],
          };
        });

        set({
          orders: { items: demoOrders, nextId: 10006 },
          invoices: { items: demoInvoices, nextId: 10006 },
          returnOrders: { items: demoReturnOrders, nextId: 10004 },
          packings: { items: demoPackings, nextId: 10004 },
        });
      },
    }),
    {
      name: "sandbox-data-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
