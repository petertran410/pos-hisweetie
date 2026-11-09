"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Bảng nhiều cấp (thay pivotTable nhiều hàng của Power BI): bấm để mở / thu gọn
 * nhóm, dòng tổng ở cuối. Cột đầu dính khi cuộn ngang, header dính khi cuộn dọc.
 */
export interface TreeNode<V> {
  id: string;
  label: string;
  values: V;
  children?: TreeNode<V>[];
}

export interface TreeColumn<V> {
  key: string;
  label: ReactNode;
  /** Cột nhóm (vd tháng) — hiện ở hàng header trên. */
  group?: string;
  width?: number;
  render: (v: V, node: TreeNode<V> | null) => ReactNode;
  color?: (v: V) => string | undefined;
}

export function QtTreeTable<V>({
  nodes,
  columns,
  total,
  firstLabel,
  maxHeight = 560,
  defaultOpenLevel = 0,
  firstWidth = 280,
}: {
  nodes: TreeNode<V>[];
  columns: TreeColumn<V>[];
  total?: V | null;
  firstLabel: string;
  maxHeight?: number;
  /** Mở sẵn các cấp < giá trị này. */
  defaultOpenLevel?: number;
  firstWidth?: number;
}) {
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  const isOpen = (id: string, level: number) =>
    level < defaultOpenLevel ? !toggled.has(id) : toggled.has(id);
  const flip = (id: string) =>
    setToggled((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const rows = useMemo(() => {
    const out: { node: TreeNode<V>; level: number; open: boolean }[] = [];
    const walk = (list: TreeNode<V>[], level: number) => {
      for (const n of list) {
        const open = !!n.children?.length && isOpen(n.id, level);
        out.push({ node: n, level, open });
        if (open) walk(n.children!, level + 1);
      }
    };
    walk(nodes, 0);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, toggled, defaultOpenLevel]);

  const groups = columns.some((c) => c.group)
    ? columns.reduce<{ name: string; span: number }[]>((acc, c) => {
        const g = c.group ?? "";
        const last = acc[acc.length - 1];
        if (last && last.name === g) last.span++;
        else acc.push({ name: g, span: 1 });
        return acc;
      }, [])
    : null;

  const headBg = "#F3F8F9";
  return (
    <div
      className="border rounded-lg overflow-auto"
      style={{ maxHeight, borderColor: "var(--dt-border)" }}>
      <table className="w-full text-[12.5px] border-collapse">
        <thead className="sticky top-0 z-10" style={{ background: headBg }}>
          {groups && (
            <tr>
              <th
                className="sticky left-0 z-20 border-b"
                style={{ background: headBg, borderColor: "var(--dt-border)" }}
              />
              {groups.map((g, i) => (
                <th
                  key={i}
                  colSpan={g.span}
                  className="px-2 py-1.5 text-[12px] font-semibold text-center border-b border-l whitespace-nowrap"
                  style={{
                    background: headBg,
                    color: "var(--dt-text-secondary)",
                    borderColor: "var(--dt-border)",
                  }}>
                  {g.name}
                </th>
              ))}
            </tr>
          )}
          <tr>
            <th
              className="sticky left-0 z-20 px-2.5 py-2 text-left text-[12px] font-semibold border-b whitespace-nowrap"
              style={{
                background: headBg,
                minWidth: firstWidth,
                color: "var(--dt-text-secondary)",
                borderColor: "var(--dt-border)",
              }}>
              {firstLabel}
            </th>
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-2.5 py-2 text-right text-[12px] font-semibold border-b whitespace-nowrap"
                style={{
                  width: c.width,
                  background: headBg,
                  color: "var(--dt-text-secondary)",
                  borderColor: "var(--dt-border)",
                }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="p-6 text-center"
                style={{ color: "var(--dt-text-muted)" }}>
                Không có dữ liệu
              </td>
            </tr>
          )}
          {rows.map(({ node, level, open }) => {
            const hasChildren = !!node.children?.length;
            return (
              <tr
                key={node.id}
                className="border-b hover:bg-[#F7FBFC]"
                style={{ borderColor: "var(--dt-border)" }}>
                <td
                  className={`sticky left-0 bg-white px-2.5 py-1.5 ${
                    hasChildren ? "font-semibold" : ""
                  }`}
                  style={{
                    paddingLeft: 10 + level * 16,
                    maxWidth: firstWidth + 120,
                  }}>
                  <button
                    type="button"
                    disabled={!hasChildren}
                    onClick={() => flip(node.id)}
                    className="inline-flex items-start gap-1 text-left disabled:cursor-default">
                    <span className="w-3.5 shrink-0 mt-0.5">
                      {hasChildren &&
                        (open ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ))}
                    </span>
                    <span className="truncate" title={node.label}>
                      {node.label}
                    </span>
                  </button>
                </td>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className="px-2.5 py-1.5 text-right dt-mono whitespace-nowrap"
                    style={{ color: c.color?.(node.values) }}>
                    {c.render(node.values, node)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        {total && (
          <tfoot className="sticky bottom-0" style={{ background: headBg }}>
            <tr>
              <td
                className="sticky left-0 px-2.5 py-2 font-bold border-t"
                style={{ background: headBg, borderColor: "var(--dt-border)" }}>
                Tổng
              </td>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="px-2.5 py-2 text-right font-bold dt-mono border-t whitespace-nowrap"
                  style={{
                    background: headBg,
                    borderColor: "var(--dt-border)",
                    color: c.color?.(total),
                  }}>
                  {c.render(total, null)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/** Gom danh sách lá theo đường dẫn nhóm thành cây; values cộng dồn bằng sum(). */
export function buildTree<T, V>(
  items: T[],
  path: (t: T) => string[],
  leafValues: (t: T) => V,
  sum: (list: V[]) => V,
  order?: (a: TreeNode<V>, b: TreeNode<V>) => number,
): TreeNode<V>[] {
  interface Tmp {
    id: string;
    label: string;
    children: Map<string, Tmp>;
    leaves: V[];
  }
  const root: Tmp = { id: "", label: "", children: new Map(), leaves: [] };
  for (const it of items) {
    const parts = path(it);
    let cur = root;
    parts.forEach((p, i) => {
      let next = cur.children.get(p);
      if (!next) {
        next = {
          id: `${cur.id}\u0001${p}`,
          label: p,
          children: new Map(),
          leaves: [],
        };
        cur.children.set(p, next);
      }
      cur = next;
      if (i === parts.length - 1) cur.leaves.push(leafValues(it));
    });
  }
  const conv = (t: Tmp): TreeNode<V> => {
    const children = [...t.children.values()].map(conv);
    if (order) children.sort(order);
    const vals = children.length
      ? sum([...children.map((c) => c.values), ...t.leaves])
      : sum(t.leaves);
    return {
      id: t.id,
      label: t.label,
      values: vals,
      children: children.length ? children : undefined,
    };
  };
  const top = [...root.children.values()].map(conv);
  if (order) top.sort(order);
  return top;
}
