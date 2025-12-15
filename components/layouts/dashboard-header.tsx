// components/layouts/dashboard-header.tsx
"use client";

import { useBranchStore } from "@/lib/stores/branch-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Link } from "lucide-react";

export function DashboardHeader() {
  const { currentBranch, branches, setBranch } = useBranchStore();
  const { user, permissions } = useAuthStore();

  const hasPermission = (permission: string) =>
    permissions.includes(permission);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b">
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <div className="font-bold text-xl">POS System</div>

          {/* Main Navigation */}
          <nav className="flex items-center gap-6">
            {hasPermission("products.view") && (
              <Link href="/san-pham/danh-sach">Sản phẩm</Link>
            )}
            {hasPermission("orders.view") && (
              <Link href="/don-hang">Đơn hàng</Link>
            )}
            {hasPermission("customers.view") && (
              <Link href="/khach-hang">Khách hàng</Link>
            )}
            <Link href="/so-quy">Sổ quỷ</Link>
            <Link href="/ban-online">Bán online</Link>
          </nav>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Branch Selector */}
          <Select
            value={currentBranch?.id}
            onValueChange={(id) => {
              const branch = branches.find((b) => b.id === +id);
              if (branch) setBranch(branch);
            }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar>
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>{user?.name[0]}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Cài đặt</DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>Đăng xuất</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
