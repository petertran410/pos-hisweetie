import { useEffect, useState } from "react";

/**
 * Tailwind lg breakpoint = 1024px
 * Returns true khi màn hình < breakpoint (mobile/tablet)
 */
export function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}
