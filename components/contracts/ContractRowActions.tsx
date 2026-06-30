"use client";

import { useState } from "react";
import {
  Send,
  Download,
  ExternalLink,
  Loader2,
  Eye,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { Contract } from "@/lib/types/contract";
import { contractsApi } from "@/lib/api/contracts";
import { useResendContract } from "@/lib/hooks/useContracts";
import { PermissionGate } from "@/components/permissions/PermissionGate";

interface Props {
  contract: Contract;
}

export function ContractRowActions({ contract }: Props) {
  const resend = useResendContract();
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await contractsApi.download(contract.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hop-dong-${contract.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || "Tải PDF thất bại");
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const blob = await contractsApi.preview(contract.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (e: any) {
      toast.error(e?.message || "Xem trước PDF thất bại");
    } finally {
      setPreviewing(false);
    }
  };

  // Có thể gửi lại (khi HĐ chưa ký xong).
  const canResend = ["SENT", "PARTIALLY_SIGNED"].includes(contract.status);

  return (
    <div className="flex items-center gap-1">
      {/* NV ký tiếp (Loại 2) — mở Documenso link ký của NV trong tab mới. */}
      {contract.status === "PARTIALLY_SIGNED" && contract.signingUrl && (
        <a
          href={contract.signingUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Khách đã ký xong — NV ký phần BÊN A"
          className="p-1.5 rounded hover:bg-purple-50 text-purple-600 flex items-center gap-1 px-2"
        >
          <PenLine className="w-4 h-4" />
          <span className="text-xs font-medium">Ký ngay</span>
        </a>
      )}

      {/* Gửi lại mail ký cho khách (Documenso). */}
      {canResend && (
        <PermissionGate resource="contracts" action="send">
          <button
            onClick={() => resend.mutate(contract.id)}
            disabled={resend.isPending}
            title="Gửi lại email ký cho khách"
            className="p-1.5 rounded hover:bg-blue-50 text-blue-600 disabled:opacity-50"
          >
            {resend.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </PermissionGate>
      )}

      {/* Xem trước / tải PDF đã ký */}
      {contract.status === "SIGNED" && (
        <>
          <PermissionGate resource="contracts" action="view">
            <button
              onClick={handlePreview}
              disabled={previewing}
              title="Xem trước PDF đã ký"
              className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 disabled:opacity-50"
            >
              {previewing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </PermissionGate>

          <PermissionGate resource="contracts" action="download">
            <button
              onClick={handleDownload}
              disabled={downloading}
              title="Tải PDF đã ký"
              className="p-1.5 rounded hover:bg-green-50 text-green-600 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          </PermissionGate>
        </>
      )}

      {/* Mở link ký Documenso (chỉ khi khách chưa ký). */}
      {contract.signingUrl &&
        contract.status === "SENT" && (
          <a
            href={contract.signingUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Mở trang ký Documenso"
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
    </div>
  );
}