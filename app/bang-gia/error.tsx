"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import "@/components/public-price/price-list.css";

/** Không tải được bảng giá (API lỗi / quá tải): báo nhẹ nhàng thay vì trang lỗi mặc định của Next. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  // Lỗi đến từ server component → phải refresh để gọi lại API, reset() thôi chỉ vẽ lại phía client.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <div className="pp pp-page pp-empty-page">
      <div className="pp-es" role="alert">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brands/price/lermao-mascot.png" alt="" />
        <h1 className="pp-t1">Chưa tải được bảng giá</h1>
        <p>Bạn thử lại sau ít phút nhé, hoặc gọi hotline 0973 123 230 để được báo giá.</p>
        <div className="pp-es-btns">
          <button type="button" className="pp-btn pp-btn-p" onClick={retry}>
            Thử lại
          </button>
          <a className="pp-btn pp-btn-s" href="tel:0973123230">
            Gọi hotline
          </a>
        </div>
      </div>
    </div>
  );
}
