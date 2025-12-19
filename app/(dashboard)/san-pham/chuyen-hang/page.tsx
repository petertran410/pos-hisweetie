"use client";

import { useState } from "react";
import { useTransfers } from "@/lib/hooks/useTransfers";
import { TransferTable } from "@/components/transfers/TransferTable";
import { TransferForm } from "@/components/transfers/TransferForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TransferPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const { data, isLoading } = useTransfers();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Chuyển hàng</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Chuyển hàng
        </Button>
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
