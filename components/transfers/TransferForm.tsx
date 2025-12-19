"use client";

import { useState } from "react";
import type { Transfer } from "@/lib/api/transfers";

interface TransferFormProps {
  transfer?: Transfer | null;
  onClose: () => void;
}

export function TransferForm({ transfer, onClose }: TransferFormProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg">
        <div className="border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {transfer ? "Chi tiết chuyển hàng" : "Tạo phiếu chuyển hàng"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center text-gray-500 py-12">
            Form chuyển hàng đang được phát triển
          </div>
        </div>

        <div className="border-t p-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
