import { create } from "zustand";
import { CustomerFilters } from "@/lib/types/customer";

interface CustomerFiltersStore {
  filters: CustomerFilters;
  setFilters: (filters: Partial<CustomerFilters>) => void;
  resetFilters: () => void;
  visibleColumns: string[];
  toggleColumn: (column: string) => void;
  setVisibleColumns: (columns: string[]) => void;
}

const defaultFilters: CustomerFilters = {
  pageSize: 20,
  currentItem: 0,
  orderBy: "createdAt",
  orderDirection: "desc",
  customerType: "all",
  gender: "all",
  isActive: true,
};

const defaultVisibleColumns = [
  "code",
  "name",
  "contactNumber",
  "debtAmount",
  "debtDays",
  "totalPurchased",
  "totalRevenue",
];

export const useCustomerFiltersStore = create<CustomerFiltersStore>((set) => ({
  filters: defaultFilters,
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () => set({ filters: defaultFilters }),
  visibleColumns: defaultVisibleColumns,
  toggleColumn: (column) =>
    set((state) => ({
      visibleColumns: state.visibleColumns.includes(column)
        ? state.visibleColumns.filter((col) => col !== column)
        : [...state.visibleColumns, column],
    })),
  setVisibleColumns: (columns) => set({ visibleColumns: columns }),
}));
