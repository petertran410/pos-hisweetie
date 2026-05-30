"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranchStore } from "@/lib/store/branch";
import { useAuthStore } from "@/lib/store/auth";
import { authApi } from "@/lib/api/auth";
import { Branch, branchesApi } from "@/lib/api/branches";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface BranchSelectorProps {
  dropUp?: boolean;
  fullWidth?: boolean;
}

export function BranchSelector({
  dropUp = false,
  fullWidth = false,
}: BranchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { selectedBranch, setSelectedBranch } = useBranchStore();
  const { user } = useAuthStore();
  const { data: allBranches } = useQuery({
    queryKey: ["my-branches"],
    queryFn: () => branchesApi.getMyBranches(),
  });

  // const branches = useMemo(() => {
  //   if (!allBranches) return [];
  //   const userBranchIds = user?.branchIds || [];
  //   if (userBranchIds.length === 0) return allBranches;
  //   return allBranches.filter((b) => userBranchIds.includes(b.id));
  // }, [allBranches, user?.branchIds]);

  const branches = allBranches ?? [];

  useEffect(() => {
    if (!selectedBranch && branches && branches.length > 0) {
      const userBranch = branches.find((b) => b.id === user?.branchId);
      const defaultBranch = userBranch || branches[0];
      setSelectedBranch(defaultBranch);
    }
  }, [branches, selectedBranch, user, setSelectedBranch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectBranch = async (branch: Branch) => {
    if (branch.id === selectedBranch?.id) {
      setIsOpen(false);
      return;
    }

    setSelectedBranch(branch);
    setIsOpen(false);

    const token = useAuthStore.getState().token;
    const currentUser = useAuthStore.getState().user;
    if (!token || !currentUser) return;

    setIsLoading(true);
    // Đánh dấu chưa sync để các guard hiện loading thay vì check theo
    // permissions cũ trong khi đang fetch permissions mới của branch.
    useAuthStore.getState().setProfileSynced(false);

    try {
      const profile = await authApi.getProfile(token, branch.id);
      // setAuth tự bật isProfileSynced=true.
      useAuthStore.getState().setAuth(
        {
          ...currentUser,
          permissions: profile.permissions,
          branchIds: profile.branchIds || currentUser.branchIds,
          roles: profile.roles || currentUser.roles,
        },
        token
      );
    } catch (err: unknown) {
      console.error("[BranchSelector] fetch profile failed:", err);
      // Nếu là lỗi auth → đá về login. Lỗi khác (mạng/5xx) thì
      // báo cho user và giữ branch cũ là an toàn nhất.
      const message = err instanceof Error ? err.message : String(err);
      const msg = message.toLowerCase();
      const isAuthErr =
        msg.includes("unauthorized") ||
        msg.includes("đăng nhập") ||
        msg.includes("token") ||
        msg.includes("quyền của bạn đã được thay đổi");

      if (isAuthErr) {
        useAuthStore.getState().clearAuth();
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "auth-error",
            "Quyền của bạn đã được thay đổi. Vui lòng đăng nhập lại."
          );
          window.location.href = "/login";
        }
      } else {
        toast.error(
          "Không thể tải quyền cho chi nhánh này. Vui lòng thử lại."
        );
        // Để RouteGuard tự retry sync ở lần render kế tiếp.
        useAuthStore.getState().setProfileSynced(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative ${fullWidth ? "w-full" : ""}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-black disabled:opacity-70 ${
          fullWidth ? "w-full" : "min-w-[200px]"
        }`}>
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <span className="flex-1 text-left truncate text-black">
          {isLoading ? "Đang tải..." : selectedBranch?.name || "Chọn chi nhánh"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute ${dropUp ? "bottom-full mb-1" : "top-full mt-1"} right-0 min-w-full bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto`}>
          {branches?.map((branch) => (
            <button
              key={branch.id}
              onClick={() => handleSelectBranch(branch)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between ${
                selectedBranch?.id === branch.id
                  ? "bg-blue-50 text-blue-600"
                  : ""
              }`}>
              <span className="text-sm">{branch.name}</span>
              {selectedBranch?.id === branch.id && (
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
