import { useMemo, useCallback } from "react";
import { useAuthStore } from "../store/auth";
import type {
  PermissionDef,
  NavSection,
  NavItem,
} from "../permissions/registry";
import { NAV_CONFIG, POS_ACTIONS } from "../permissions/registry";

const SUPER_ADMIN_ROLE = "Super Admin";
const ADMIN_ROLE = "Admin";

function isSuperAdmin(roles?: string[]): boolean {
  return roles?.includes(SUPER_ADMIN_ROLE) ?? false;
}

function isAdminOrSuperAdmin(roles?: string[]): boolean {
  return (
    roles?.some((r) => r === SUPER_ADMIN_ROLE || r === ADMIN_ROLE) ?? false
  );
}

export function useCan(resource: string, action: string): boolean {
  const { user } = useAuthStore();
  if (!user) return false;
  if (isSuperAdmin(user.roles)) return true;
  if (!user.permissions) return false;
  return user.permissions.includes(`${resource}:${action}`);
}

/**
 * Trả về true nếu user có role Super Admin hoặc Admin.
 * Dùng khi cần bypass các điều kiện ẩn UI theo trạng thái nghiệp vụ
 * (ví dụ: ẩn nút theo status hóa đơn) cho admin.
 */
export function useIsAdmin(): boolean {
  const { user } = useAuthStore();
  return isAdminOrSuperAdmin(user?.roles);
}

export function useCanDef(def: PermissionDef): boolean {
  return useCan(def.resource, def.action);
}

export function useFilteredNav(): NavSection[] {
  const { user } = useAuthStore();
  const permissions = user?.permissions || [];
  const superAdmin = isSuperAdmin(user?.roles);

  return useMemo(() => {
    if (superAdmin) return NAV_CONFIG.filter((s) => s.items.length > 0);

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
  }, [permissions, superAdmin]);
}

export function useFilteredPosActions(): NavItem[] {
  const { user } = useAuthStore();
  const permissions = user?.permissions || [];
  const superAdmin = isSuperAdmin(user?.roles);

  return useMemo(() => {
    if (superAdmin) return POS_ACTIONS;

    return POS_ACTIONS.filter((item) =>
      permissions.includes(
        `${item.permission.resource}:${item.permission.action}`
      )
    );
  }, [permissions, superAdmin]);
}

export function useFilteredMenuItems<T extends { href: string }>(
  items: T[],
  routePermissions: Record<string, PermissionDef | PermissionDef[]>
): T[] {
  const { user } = useAuthStore();
  const permissions = user?.permissions || [];
  const superAdmin = isSuperAdmin(user?.roles);

  return useMemo(() => {
    if (superAdmin) return items;

    return items.filter((item) => {
      const def = routePermissions[item.href];
      if (!def) return true;
      if (Array.isArray(def)) {
        return def.some((d) =>
          permissions.includes(`${d.resource}:${d.action}`)
        );
      }
      return permissions.includes(`${def.resource}:${def.action}`);
    });
  }, [items, permissions, superAdmin]);
}
export function useFilteredSections<
  T extends { title: string; items: Array<{ href: string }> },
>(
  sections: T[],
  routePermissions: Record<string, PermissionDef | PermissionDef[]>
): T[] {
  const { user } = useAuthStore();
  const permissions = user?.permissions || [];
  const superAdmin = isSuperAdmin(user?.roles);

  return useMemo(() => {
    if (superAdmin) return sections;

    return sections
      .map((section) => {
        const filtered = section.items.filter((item) => {
          const def = routePermissions[item.href];
          if (!def) return true;
          if (Array.isArray(def)) {
            return def.some((d) =>
              permissions.includes(`${d.resource}:${d.action}`)
            );
          }
          return permissions.includes(`${def.resource}:${def.action}`);
        });
        if (filtered.length === 0) return null;
        return { ...section, items: filtered };
      })
      .filter(Boolean) as T[];
  }, [sections, permissions, superAdmin]);
}
