import { useEffect, useRef } from "react";

// Các hộp thoại đang mở (mở sau nằm cuối) — Esc chỉ đóng hộp trên cùng
const stack: object[] = [];

/** Bấm Esc để đóng hộp thoại; hộp lồng nhau thì chỉ đóng hộp mở sau cùng. */
export function useEscapeClose(onClose: () => void, enabled = true) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!enabled) return;
    const entry = {};
    stack.push(entry);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || stack[stack.length - 1] !== entry) return;
      e.preventDefault();
      closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(entry), 1);
    };
  }, [enabled]);
}
