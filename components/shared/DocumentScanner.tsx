"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Settings, X } from "lucide-react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { documentsApi, type ScannedDocument } from "@/lib/api/documents";
import { toast } from "sonner";

interface DocumentScannerProps {
  branchId: number;
  documentType: "invoice" | "consignment";
  packingType: "packing-slip" | "packing-hang" | "packing-loading";
  selectedIds: number[];
  onDocument: (document: ScannedDocument) => void;
  onClose: () => void;
}

type CameraIssueKind =
  | "insecure"
  | "denied"
  | "not-found"
  | "in-use"
  | "unsupported"
  | "generic";

interface CameraIssue {
  kind: CameraIssueKind;
  message: string;
  hint?: string;
}

function getHttpsUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:") return url.toString();
    } catch {
      return null;
    }
  }
  if (typeof window === "undefined") return null;
  if (window.location.protocol === "https:") return window.location.href;
  return null;
}

function getPermissionHint(): string {
  if (typeof navigator === "undefined") {
    return "Cài đặt → Camera → Cho phép.";
  }
  const ua = navigator.userAgent;
  if (/CriOS/i.test(ua)) {
    return "Cài đặt → Chrome → Camera → Cho phép, rồi quay lại và bấm Thử lại.";
  }
  if (/FxiOS/i.test(ua)) {
    return "Cài đặt → Firefox → Camera → Cho phép, rồi quay lại và bấm Thử lại.";
  }
  if (/EdgiOS/i.test(ua)) {
    return "Cài đặt → Edge → Camera → Cho phép, rồi quay lại và bấm Thử lại.";
  }
  if (/Safari/i.test(ua) && /iPhone|iPad|iPod/i.test(ua)) {
    return "Cài đặt → Safari → Camera → Cho phép, hoặc menu AA → Cài đặt trang web → Camera.";
  }
  return "Mở Cài đặt của trình duyệt, bật Camera, rồi quay lại và bấm Thử lại.";
}

function classifyCameraError(error: unknown): CameraIssue {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: string }).name)
      : "";
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    message.includes("permission") ||
    message.includes("notallowed")
  ) {
    return {
      kind: "denied",
      message: "Trình duyệt đang chặn quyền camera.",
      hint: getPermissionHint(),
    };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return {
      kind: "not-found",
      message: "Không tìm thấy camera phù hợp trên thiết bị này.",
    };
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return {
      kind: "in-use",
      message: "Camera đang được ứng dụng khác sử dụng. Hãy đóng app camera rồi thử lại.",
    };
  }
  if (name === "SecurityError" || message.includes("secure")) {
    return {
      kind: "insecure",
      message: "Camera trên điện thoại yêu cầu kết nối HTTPS.",
      hint: "Trang hiện đang chạy qua HTTP nên trình duyệt chặn camera.",
    };
  }
  return {
    kind: "generic",
    message: "Không thể mở camera. Hãy cấp quyền camera rồi thử lại.",
    hint: getPermissionHint(),
  };
}

export function DocumentScanner({
  branchId,
  documentType,
  packingType,
  selectedIds,
  onDocument,
  onClose,
}: DocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastPayloadRef = useRef("");
  const lastScannedAtRef = useRef(0);
  const resolvingRef = useRef(false);
  const selectedIdsRef = useRef(selectedIds);
  const onDocumentRef = useRef(onDocument);
  const [isResolving, setIsResolving] = useState(false);
  const [cameraIssue, setCameraIssue] = useState<CameraIssue | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const httpsUrl = getHttpsUrl();

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
    onDocumentRef.current = onDocument;
  }, [onDocument, selectedIds]);

  const openCameraSettings = useCallback(() => {
    const candidates = ["app-settings:", "App-Prefs:root=Privacy&path=CAMERA"];
    for (const href of candidates) {
      try {
        window.location.href = href;
        return;
      } catch {
        // Thử URL tiếp theo.
      }
    }
    toast.info(getPermissionHint());
  }, []);

  useEffect(() => {
    let controls: { stop: () => void } | undefined;
    let disposed = false;

    const start = async () => {
      const video = videoRef.current;
      if (!video) return;

      if (typeof window !== "undefined" && window.isSecureContext === false) {
        setCameraIssue({
          kind: "insecure",
          message: "Camera trên điện thoại yêu cầu kết nối HTTPS.",
          hint: "Trang hiện đang chạy qua HTTP nên trình duyệt chặn camera.",
        });
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraIssue({
          kind: "unsupported",
          message: "Trình duyệt này không hỗ trợ camera.",
          hint: "Hãy dùng Safari hoặc Chrome phiên bản mới trên iPhone.",
        });
        return;
      }

      try {
        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromVideoDevice(
          undefined,
          video,
          async (result) => {
            if (disposed || !result || resolvingRef.current) return;
            const payload = result.getText().trim();
            const now = Date.now();
            if (
              payload === lastPayloadRef.current &&
              now - lastScannedAtRef.current < 1500
            ) {
              return;
            }
            lastPayloadRef.current = payload;
            lastScannedAtRef.current = now;
            resolvingRef.current = true;
            setIsResolving(true);
            try {
              const document = await documentsApi.resolveScan(
                payload,
                packingType
              );
              if (document.kind !== documentType) {
                toast.error(
                  documentType === "invoice"
                    ? "QR này là phiếu ký gửi"
                    : "QR này là hóa đơn"
                );
              } else if (document.branchId !== branchId) {
                toast.error("Chứng từ không thuộc chi nhánh đang chọn");
              } else if (selectedIdsRef.current.includes(document.id)) {
                toast.info(`${document.code} đã được chọn`);
              } else {
                onDocumentRef.current(document);
                toast.success(`Đã thêm ${document.code}`);
              }
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "QR không hợp lệ"
              );
            } finally {
              resolvingRef.current = false;
              setIsResolving(false);
            }
          }
        );
        if (!disposed) setCameraIssue(null);
      } catch (error) {
        if (!disposed) setCameraIssue(classifyCameraError(error));
      }
    };

    void start();

    return () => {
      disposed = true;
      controls?.stop();
    };
  }, [branchId, documentType, packingType, retryCount]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="font-semibold">
              Quét QR {documentType === "invoice" ? "hóa đơn" : "phiếu ký gửi"}
            </h3>
            <p className="text-xs text-gray-500">Có thể quét liên tục nhiều mã</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        <div className="p-4">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            <div className="absolute inset-8 border-2 border-white/80 rounded-xl pointer-events-none" />
            {isResolving && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Đang kiểm tra...
              </div>
            )}
          </div>
          {cameraIssue ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-red-600">{cameraIssue.message}</p>
              {cameraIssue.hint && (
                <p className="text-xs text-gray-500">{cameraIssue.hint}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
              <Camera className="w-4 h-4" /> Đưa mã QR vào khung để quét
            </p>
          )}
          <div className="mt-4 space-y-2">
            {cameraIssue?.kind === "insecure" && httpsUrl && (
              <a
                href={httpsUrl}
                className="w-full inline-flex items-center justify-center rounded-lg py-3 bg-brand text-white">
                Mở phiên bản HTTPS
              </a>
            )}
            {cameraIssue?.kind === "denied" && (
              <button
                type="button"
                onClick={openCameraSettings}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-3 bg-brand text-white">
                <Settings className="w-4 h-4" /> Mở cài đặt camera
              </button>
            )}
            {cameraIssue && cameraIssue.kind !== "unsupported" && (
              <button
                type="button"
                onClick={() => {
                  setCameraIssue(null);
                  setRetryCount((count) => count + 1);
                }}
                className="w-full border rounded-lg py-3">
                Thử lại
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full border rounded-lg py-3">
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
