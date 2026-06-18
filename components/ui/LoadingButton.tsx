"use client";

import React from "react";
import { Spinner } from "./Spinner";

interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Đang xử lý async → hiện spinner, tự disable, chặn click lặp. */
  loading?: boolean;
  /** Text thay thế khi loading (mặc định giữ nguyên children). */
  loadingText?: React.ReactNode;
  /** Class cho spinner (kích thước/màu). */
  spinnerClassName?: string;
}

/**
 * Nút có trạng thái loading dùng chung.
 * Khi loading: tự disabled + hiện Spinner trước nội dung + chặn onClick.
 * Dùng để chống double-click gây tạo trùng (đơn hàng/hóa đơn...).
 */
export function LoadingButton({
  loading = false,
  loadingText,
  spinnerClassName,
  disabled,
  onClick,
  children,
  className,
  type = "button",
  ...rest
}: LoadingButtonProps) {
  const isDisabled = loading || disabled;

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 ${className ?? ""}`}
      {...rest}>
      {loading && <Spinner className={spinnerClassName} />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
