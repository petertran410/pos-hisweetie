import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type SortState<K extends string = string> = {
  key: K;
  dir: "asc" | "desc";
} | null;

/** Bấm lần 1 giảm dần, lần 2 tăng dần, lần 3 về mặc định (như bảng Hóa đơn). */
export function nextSort<K extends string>(
  current: SortState<K>,
  key: K,
): SortState<K> {
  if (current?.key !== key) return { key, dir: "desc" };
  return current.dir === "desc" ? { key, dir: "asc" } : null;
}

/** Mũi tên sắp xếp cạnh tên cột. */
export function SortIcon({ dir }: { dir?: "asc" | "desc" | null }) {
  if (dir === "desc") return <ArrowDown className="h-3 w-3 text-brand" />;
  if (dir === "asc") return <ArrowUp className="h-3 w-3 text-brand" />;
  return <ArrowUpDown className="h-3 w-3 text-gray-400 opacity-40" />;
}
