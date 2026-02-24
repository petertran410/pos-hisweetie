import type { PackingSlip } from "./packing-slip";
import type { PackingHang } from "./packing-hang";
import type { PackingLoading } from "./packing-loading";

export type AllPackingType = "giao-hang" | "dong-hang" | "loading";

export type AllPackingItem = (PackingSlip | PackingHang | PackingLoading) & {
  type: AllPackingType;
};
