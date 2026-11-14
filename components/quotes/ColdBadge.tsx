import { Snowflake } from "lucide-react";

/**
 * Bông tuyết ở góc ảnh sản phẩm hàng lạnh (bảo quản tủ đông) trên bản in báo giá.
 * Style inline để giữ nguyên khi in PDF / chụp ảnh. Đặt trong khối `position: relative`.
 */
export function ColdBadge({ size = 18 }: { size?: number }) {
  return (
    <span
      title="Hàng lạnh"
      aria-label="Hàng lạnh"
      style={{
        position: "absolute",
        top: 2,
        right: 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#e0f2fe",
        border: "1px solid #7dd3fc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      <Snowflake size={Math.round(size * 0.7)} color="#0369a1" strokeWidth={2.25} aria-hidden="true" />
    </span>
  );
}
