"use client";

import { useState } from "react";
import {
  Send,
  Download,
  ExternalLink,
  Loader2,
  Eye,
  CheckCircle,
  FileSignature,
} from "lucide-react";
import { toast } from "sonner";
import { Contract } from "@/lib/types/contract";
import { contractsApi } from "@/lib/api/contracts";
import {
  useApproveReview,
  useSendForSigning,
  useResendContract,
} from "@/lib/hooks/useContracts";
import { PermissionGate } from "@/components/permissions/PermissionGate";

interface Props {
  contract: Contract;
}

export function ContractRowActions({ contract }: Props) {
  const approveReview = useApproveReview();
  const sendForSigning = useSendForSigning();
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

  // Phase 1 — REVIEW_SENT: khách đang xem bản review.
  const canApprove = contract.status === "REVIEW_SENT";

  // Phase 1.5 — REVIEW_APPROVED: đã duyệt, chờ gửi bản ký.
  const canSendForSigning =
    contract.status === "REVIEW_APPROVED" ||
    contract.status === "REVIEW_SENT";

  // Gửi lại: REVIEW_SENT / REVIEW_APPROVED → Lark Mail bản xem.
  const canResendReview =
    contract.status === "REVIEW_SENT" ||
    contract.status === "REVIEW_APPROVED";

  // Gửi lại: SENT → Documenso bản ký.
  const canResendDocumenso = contract.status === "SENT";

  return (
    <div className="flex items-center gap-1">
      {/* Duyệt bản xem (khách đồng ý) → cho phép gửi bản ký */}
      {canApprove && (
        <PermissionGate resource="contracts" action="send">
          <button
            onClick={() => approveReview.mutate(contract.id)}
            disabled={approveReview.isPending}
            title="Khách đồng ý nội dung — cho phép gửi bản ký"
            className="p-1.5 rounded hover:bg-green-50 text-green-600 disabled:opacity-50"
          >
            {approveReview.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
          </button>
        </PermissionGate>
      )}

      {/* Gửi bản ký Documenso */}
      {canSendForSigning && (
        <PermissionGate resource="contracts" action="send">
          <button
            onClick={() => sendForSigning.mutate(contract.id)}
            disabled={sendForSigning.isPending}
            title="Gửi bản ký cho khách (Documenso)"
            className="p-1.5 rounded hover:bg-blue-50 text-blue-600 disabled:opacity-50"
          >
            {sendForSigning.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSignature className="w-4 h-4" />
            )}
          </button>
        </PermissionGate>
      )}

      {/* Gửi lại bản xem (Lark Mail) hoặc Documenso */}
      {(canResendReview || canResendDocumenso) && (
        <PermissionGate resource="contracts" action="send">
          <button
            onClick={() => resend.mutate(contract.id)}
            disabled={resend.isPending}
            title={
              canResendReview
                ? "Gửi lại bản xem trước qua email"
                : "Gửi lại bản ký"
            }
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

      {/* Mở link ký Documenso */}
      {contract.signingUrl &&
        contract.status !== "SIGNED" &&
        contract.status !== "REJECTED" &&
        contract.status !== "CANCELLED" && (
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
