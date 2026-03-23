import { useMemo, useCallback } from "react";
import { useAuthStore } from "../store/auth";
import type {
  PermissionDef,
  NavSection,
  NavItem,
} from "../permissions/registry";
import { NAV_CONFIG, POS_ACTIONS } from "../permissions/registry";

export function useCan(resource: string, action: string): boolean {
  const { user } = useAuthStore();
  if (!user?.permissions) return false;
  return user.permissions.includes(`${resource}:${action}`);
}

export function useCanDef(def: PermissionDef): boolean {
  return useCan(def.resource, def.action);
}

export function useFilteredNav(): NavSection[] {
  const { user } = useAuthStore();
  const permissions = user?.permissions || [];

  return useMemo(() => {
    const check = (def: PermissionDef) =>
      permissions.includes(`${def.resource}:${def.action}`);

    return NAV_CONFIG.map((section) => {
      if (section.items.length === 0) return section;
      const filteredItems = section.items.filter((item) =>
        check(item.permission)
      );
      if (filteredItems.length === 0) return null;
      return { ...section, items: filteredItems };
    }).filter(Boolean) as NavSection[];
  }, [permissions]);
}

export function useFilteredPosActions(): NavItem[] {
  const { user } = useAuthStore();
  const permissions = user?.permissions || [];

  return useMemo(() => {
    return POS_ACTIONS.filter((item) =>
      permissions.includes(
        `${item.permission.resource}:${item.permission.action}`
      )
    );
  }, [permissions]);
}
