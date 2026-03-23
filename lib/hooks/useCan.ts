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

export function useFilteredMenuItems<T extends { href: string }>(
  items: T[],
  routePermissions: Record<string, PermissionDef>
): T[] {
  const { user } = useAuthStore();
  const permissions = user?.permissions || [];

  return useMemo(() => {
    return items.filter((item) => {
      const def = routePermissions[item.href];
      if (!def) return true;
      return permissions.includes(`${def.resource}:${def.action}`);
    });
  }, [items, permissions, routePermissions]);
}

export function useFilteredSections<
  T extends { title: string; items: Array<{ href: string }> },
>(sections: T[], routePermissions: Record<string, PermissionDef>): T[] {
  const { user } = useAuthStore();
  const permissions = user?.permissions || [];

  return useMemo(() => {
    return sections
      .map((section) => {
        const filtered = section.items.filter((item) => {
          const def = routePermissions[item.href];
          if (!def) return true;
          return permissions.includes(`${def.resource}:${def.action}`);
        });
        if (filtered.length === 0) return null;
        return { ...section, items: filtered };
      })
      .filter(Boolean) as T[];
  }, [sections, permissions, routePermissions]);
}
