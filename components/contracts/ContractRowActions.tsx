"use client";

import { useState } from "react";
import { Send, Download, ExternalLink, Loader2, Eye } from "lucide-react";
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

  const canResend =
    contract.status === "SENT" ||
    contract.status === "DRAFT" ||
    contract.status === "EXPIRED";

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
      // Thu hồi URL sau 1 phút (đủ để tab mới load xong).
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (e: any) {
      toast.error(e?.message || "Xem trước PDF thất bại");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {canResend && (
        <PermissionGate resource="contracts" action="send">
          <button
            onClick={() => resend.mutate(contract.id)}
            disabled={resend.isPending}
            title="Gửi lại"
            className="p-1.5 rounded hover:bg-blue-50 text-blue-600 disabled:opacity-50">
            {resend.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </PermissionGate>
      )}

      {contract.status === "SIGNED" && (
        <PermissionGate resource="contracts" action="view">
          <button
            onClick={handlePreview}
            disabled={previewing}
            title="Xem trước PDF đã ký"
            className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 disabled:opacity-50">
            {previewing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </PermissionGate>
      )}

      {contract.status === "SIGNED" && (
        <PermissionGate resource="contracts" action="download">
          <button
            onClick={handleDownload}
            disabled={downloading}
            title="Tải PDF đã ký"
            className="p-1.5 rounded hover:bg-green-50 text-green-600 disabled:opacity-50">
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
        </PermissionGate>
      )}

      {contract.signingUrl && contract.status !== "SIGNED" && (
        <a
          href={contract.signingUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Mở trang ký Documenso"
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
