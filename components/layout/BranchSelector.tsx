"use client";

import { useState, useEffect, useRef } from "react";
import { useBranchStore } from "@/lib/store/branch";
import { useBranches } from "@/lib/hooks/useBranches";
import { useAuthStore } from "@/lib/store/auth";

export function BranchSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { selectedBranch, setSelectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!selectedBranch && branches && branches.length > 0) {
      const userBranch = branches.find((b) => b.id === user?.branchId);
      setSelectedBranch(userBranch || branches[0]);
    }
  }, [branches, selectedBranch, user]);

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

  const handleSelectBranch = (branch: typeof selectedBranch) => {
    setSelectedBranch(branch);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 min-w-[200px] text-black">
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
          {selectedBranch?.name || "Chọn chi nhánh"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
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
        <div className="absolute right-0 mt-2 w-full bg-white border rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto text-black">
          {branches?.map((branch) => (
            <button
              key={branch.id}
              onClick={() => handleSelectBranch(branch)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                selectedBranch?.id === branch.id
                  ? "bg-blue-50 text-blue-600"
                  : ""
              }`}>
              {branch.name}
              {selectedBranch?.id === branch.id && (
                <svg
                  className="w-5 h-5 ml-auto"
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
