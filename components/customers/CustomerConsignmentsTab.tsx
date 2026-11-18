"use client";

import { useQuery } from "@tanstack/react-query";
import { consignmentsApi } from "@/lib/api/consignments";
import {
  CONSIGNMENT_STATUS_COLOR,
  getStatusLabel,
} from "@/lib/types/consignment";
import { formatCurrency } from "@/lib/utils";
import { PackageOpen } from "lucide-react";
import {
  DateCell,
  StatusPill,
  TabEmpty,
  TabLoading,
  TabPagination,
  TabTable,
  Td,
  Th,
  Tr,
} from "./CustomerTabUI";
import { useState } from "react";
import { DocumentPreviewModal } from "../shared/DocumentPreviewModal";

interface CustomerConsignmentsTabProps {
  customerId: number;
}

export function CustomerConsignmentsTab({
  customerId,
}: CustomerConsignmentsTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["consignments", "customer", customerId],
    queryFn: () =>
      consignmentsApi.getAll({
        customerId,
        pageSize: 1000,
      }),
  });

  const [page, setPage] = useState(1);
  const limit = 5;
  const [preview, setPreview] = useState<{ id: number; code: string } | null>(
    null,
  );

  const consignments = data?.data || [];

  const totalPages = Math.ceil(consignments.length / limit);
  const paginated = consignments.slice((page - 1) * limit, page * limit);

  if (isLoading) return <TabLoading />;

  if (consignments.length === 0) {
    return (
      <TabEmpty
        icon={PackageOpen}
        title="Chưa có lịch sử ký gửi"
        description="Các phiếu ký gửi hàng của khách sẽ hiện ở đây."
      />
    );
  }

  return (
    <>
      <TabTable
        footer={
          <TabPagination
            page={page}
            totalPages={totalPages}
            total={consignments.length}
            unit="phiếu ký gửi"
            onChange={setPage}
          />
        }>
        <thead>
          <tr>
            <Th>Mã ký gửi</Th>
            <Th>Ngày ký gửi</Th>
            <Th className="hidden md:table-cell">Người bán</Th>
            <Th className="hidden md:table-cell">Chi nhánh</Th>
            <Th align="right">Tổng cộng</Th>
            <Th align="center">Trạng thái</Th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((c) => (
            <Tr key={c.id}>
              <Td>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreview({ id: c.id, code: c.code });
                  }}
                  className="font-medium text-brand hover:underline">
                  {c.code}
                </button>
              </Td>
              <Td>
                <DateCell value={c.consignDate} />
              </Td>
              <Td className="hidden md:table-cell">{c.soldBy?.name || "—"}</Td>
              <Td className="hidden md:table-cell">{c.branch?.name || "—"}</Td>
              <Td
                align="right"
                className="font-medium tabular-nums text-gray-900">
                {formatCurrency(Number(c.grandTotal))}
              </Td>
              <Td align="center">
                <StatusPill
                  colorClass={
                    CONSIGNMENT_STATUS_COLOR[c.status] ??
                    "bg-gray-100 text-gray-700"
                  }>
                  {getStatusLabel(c.status)}
                </StatusPill>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TabTable>

      {preview && (
        <DocumentPreviewModal
          type="consignment"
          id={preview.id}
          code={preview.code}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
