"use client";

import { useState } from "react";
import { useTransfers } from "@/lib/hooks/useTransfers";
import { TransferTable } from "@/components/transfers/TransferTable";
import { TransferForm } from "@/components/transfers/TransferForm";
import { Plus } from "lucide-react";
import { Transfer } from "@/lib/api/transfers";

export default function TransferPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(
    null
  );
  const { data, isLoading } = useTransfers();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Chuyển hàng</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Chuyển hàng
        </button>
      </div>

      <TransferTable
        transfers={data?.data || []}
        isLoading={isLoading}
        onEdit={(transfer) => {
          setSelectedTransfer(transfer);
          setShowForm(true);
        }}
      />

      {showForm && (
        <TransferForm
          transfer={selectedTransfer}
          onClose={() => {
            setShowForm(false);
            setSelectedTransfer(null);
          }}
        />
      )}
    </div>
  );
}
