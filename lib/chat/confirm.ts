import Swal from "sweetalert2";
import { toast } from "sonner";

/**
 * Hộp xác nhận (SweetAlert2 như các màn khác). Không dùng window.confirm:
 * một số trình duyệt nhúng chặn hộp thoại gốc và trả về false ngay.
 */
export async function confirmAction(
  text: string,
  opts: { title?: string; confirmText?: string; danger?: boolean } = {}
): Promise<boolean> {
  const result = await Swal.fire({
    title: opts.title ?? "Xác nhận",
    text,
    icon: opts.danger ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? "Xác nhận",
    cancelButtonText: "Hủy bỏ",
    confirmButtonColor: opts.danger ? "#dc2626" : "#00B7CC",
    cancelButtonColor: "#6b7280",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

/** Mở link ở tab mới; trình duyệt chặn thì chép link để người dùng tự mở. */
export function openExternal(url: string) {
  const w = window.open(url, "_blank");
  if (w) {
    w.opener = null;
    return;
  }
  navigator.clipboard?.writeText(url).catch(() => undefined);
  toast.info("Trình duyệt chặn mở tab mới — đã chép link Smax, dán vào trình duyệt để mở", {
    description: url,
    duration: 8000,
  });
}
