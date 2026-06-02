"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { X, RefreshCw, Smartphone, CheckCircle2 } from "lucide-react";
import {
  createUploadSession,
  closeUploadSession,
  useUploadSessionPoll,
  type UploadSubfolder,
} from "@/lib/hooks/useUploadSessions";

interface QrUploadModalProps {
  subfolder: UploadSubfolder;
  /** Gọi mỗi khi có URL ảnh mới từ điện thoại (đã chống trùng). */
  onUploaded: (urls: string[]) => void;
  onClose: () => void;
  maxFiles?: number;
}

export function QrUploadModal({
  subfolder,
  onUploaded,
  onClose,
  maxFiles,
}: QrUploadModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Theo dõi các URL đã đẩy lên form để chỉ gửi phần mới.
  const seenUrlsRef = useRef<Set<string>>(new Set());
  const [receivedCount, setReceivedCount] = useState(0);

  const createSession = async () => {
    setCreating(true);
    setError(null);
    try {
      const session = await createUploadSession(subfolder, maxFiles);
      setSessionId(session.id);
      setUploadUrl(session.uploadUrl);
      seenUrlsRef.current = new Set();
      setReceivedCount(0);
    } catch {
      setError("Không tạo được mã QR. Thử lại.");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    createSession();
    // chỉ chạy 1 lần khi mở modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: status } = useUploadSessionPoll(sessionId, !!sessionId);

  useEffect(() => {
    if (!status?.images?.length) return;
    const fresh = status.images.filter(
      (url) => !seenUrlsRef.current.has(url)
    );
    if (fresh.length > 0) {
      fresh.forEach((url) => seenUrlsRef.current.add(url));
      setReceivedCount(seenUrlsRef.current.size);
      onUploaded(fresh);
    }
  }, [status, onUploaded]);

  const handleClose = () => {
    if (sessionId) closeUploadSession(sessionId);
    onClose();
  };

  const isExpired = status?.status === "expired" || status?.status === "closed";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4"
      onClick={handleClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Upload bằng điện thoại</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center">
          <p className="text-sm text-gray-600 text-center mb-4">
            Dùng camera điện thoại quét mã QR để mở trang chụp/chọn ảnh. Ảnh sẽ
            tự hiện lên form này.
          </p>

          <div className="relative w-[220px] h-[220px] flex items-center justify-center border rounded-xl bg-white">
            {creating && (
              <span className="text-sm text-gray-400">Đang tạo mã...</span>
            )}
            {!creating && error && (
              <div className="text-center px-4">
                <p className="text-sm text-red-600 mb-3">{error}</p>
                <button
                  onClick={createSession}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                  <RefreshCw className="w-4 h-4" /> Thử lại
                </button>
              </div>
            )}
            {!creating && !error && uploadUrl && !isExpired && (
              <QRCode
                value={uploadUrl}
                size={196}
                style={{ height: "196px", width: "196px" }}
              />
            )}
            {!creating && !error && isExpired && (
              <div className="text-center px-4">
                <p className="text-sm text-gray-600 mb-3">
                  Mã QR đã hết hạn.
                </p>
                <button
                  onClick={createSession}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                  <RefreshCw className="w-4 h-4" /> Tạo mã mới
                </button>
              </div>
            )}
          </div>

          {receivedCount > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              Đã nhận {receivedCount} ảnh từ điện thoại
            </div>
          )}

          <button
            onClick={handleClose}
            className="mt-5 w-full px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
