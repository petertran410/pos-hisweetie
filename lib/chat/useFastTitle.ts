import { useEffect, type RefObject } from "react";

const DELAY_MS = 200;

/**
 * Hiện `title` của phần tử con nhanh hơn tooltip gốc của trình duyệt (~1s, không
 * chỉnh được): sau DELAY_MS vẽ một tooltip kiểu trình duyệt cạnh con trỏ. Tạm cất
 * `title` vào data-fast-title khi rê chuột để tooltip gốc không hiện chồng.
 */
export function useFastTitle(container: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    let tip: HTMLDivElement | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let target: HTMLElement | null = null;
    let pos = { x: 0, y: 0 };

    const hide = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      tip?.remove();
      tip = null;
      if (target?.dataset.fastTitle !== undefined) {
        target.setAttribute("title", target.dataset.fastTitle);
        delete target.dataset.fastTitle;
      }
      target = null;
    };

    const show = () => {
      if (!target) return;
      // position:fixed bị nhân CSS zoom của <html> → chia lại để khớp con trỏ
      const zoom =
        parseFloat(getComputedStyle(document.documentElement).zoom || "1") || 1;
      tip = document.createElement("div");
      tip.textContent = target.dataset.fastTitle ?? "";
      Object.assign(tip.style, {
        position: "fixed",
        zIndex: "9999",
        maxWidth: "280px",
        padding: "2px 6px",
        font: "12px/1.4 system-ui, sans-serif",
        whiteSpace: "pre-line",
        color: "#222",
        background: "#fff",
        border: "1px solid #b5b5b5",
        boxShadow: "1px 1px 3px rgba(0,0,0,.2)",
        pointerEvents: "none",
        visibility: "hidden",
      } as CSSStyleDeclaration);
      document.body.appendChild(tip);
      // Như tooltip gốc: dưới-phải con trỏ; sát mép phải thì lật sang trái
      const w = tip.offsetWidth * zoom;
      const h = tip.offsetHeight * zoom;
      let x = pos.x + 12;
      let y = pos.y + 18;
      if (x + w > window.innerWidth - 4) x = pos.x - w - 4;
      if (y + h > window.innerHeight - 4) y = pos.y - h - 8;
      tip.style.left = `${Math.max(4, x) / zoom}px`;
      tip.style.top = `${Math.max(4, y) / zoom}px`;
      tip.style.visibility = "visible";
    };

    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>(
        "[title], [data-fast-title]",
      );
      if (!el || !root.contains(el) || el === target) return;
      hide();
      const text = el.getAttribute("title");
      if (!text) return;
      target = el;
      el.dataset.fastTitle = text;
      el.removeAttribute("title");
      pos = { x: e.clientX, y: e.clientY };
      timer = setTimeout(show, DELAY_MS);
    };
    const onMove = (e: MouseEvent) => {
      if (!tip) pos = { x: e.clientX, y: e.clientY };
    };
    const onOut = (e: MouseEvent) => {
      if (target && !target.contains(e.relatedTarget as Node)) hide();
    };

    root.addEventListener("mouseover", onOver);
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseout", onOut);
    root.addEventListener("mousedown", hide);
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseout", onOut);
      root.removeEventListener("mousedown", hide);
      hide();
    };
  }, [container]);
}
