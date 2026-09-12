import { useCallback, useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};

/**
 * Trả về false trong SSR/first hydration và true sau khi client mount.
 * Dùng để tránh mount nhầm nhánh responsive trong lúc hydrate.
 */
export function useIsClient() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

/**
 * Tailwind lg breakpoint = 1024px
 * Returns true khi màn hình < breakpoint (mobile/tablet)
 */
export function useIsMobile(breakpoint = 1024) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      window.addEventListener("resize", onStoreChange);
      return () => window.removeEventListener("resize", onStoreChange);
    },
    []
  );
  const getSnapshot = useCallback(
    () => window.innerWidth < breakpoint,
    [breakpoint]
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
