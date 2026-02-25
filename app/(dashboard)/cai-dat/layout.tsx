"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Shield, Building2, Clock } from "lucide-react";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menuItems = [
    {
      href: "/cai-dat/nguoi-dung",
      label: "Người dùng",
      icon: Users,
      permission: { resource: "users", action: "view" },
    },
    {
      href: "/cai-dat/vai-tro",
      label: "Vai trò & Quyền",
      icon: Shield,
      permission: { resource: "roles", action: "view" },
    },
    {
      href: "/cai-dat/chi-nhanh",
      label: "Chi nhánh",
      icon: Building2,
      permission: { resource: "branches", action: "view" },
    },
    {
      href: "/cai-dat/lich-su",
      label: "Lịch sử thao tác",
      icon: Clock,
      permission: { resource: "audit-logs", action: "view" },
    },
  ];

  return (
    <div className="flex h-full">
      <div className="w-64 border-r bg-white">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Cài đặt</h2>
          <p className="text-sm text-gray-600 mt-1">Quản lý hệ thống</p>
        </div>
        <nav className="p-2">
          {menuItems.map((item) => (
            <PermissionGate
              key={item.href}
              resource={item.permission.resource}
              action={item.permission.action}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  pathname === item.href
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}>
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            </PermissionGate>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-auto bg-gray-50">{children}</div>
    </div>
  );
}
