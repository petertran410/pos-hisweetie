import type { Metadata } from "next";

export const metadata: Metadata = { title: "Form tạm đóng", robots: { index: false } };

/** Đích của QR chung (leadform.hisweetievietnam.com) khi chưa gắn form nào hoặc form đang tắt. */
export default function LeadFormClosedPage() {
  return (
    <div className="fixed inset-0 overflow-auto bg-gray-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-xl rounded-2xl border bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-lg font-semibold text-gray-900">Form tạm đóng</h1>
        <p className="mt-2 text-sm text-gray-600">
          Hiện chưa có chương trình đăng ký nào đang mở. Quý khách vui lòng quay lại sau. Xin cảm ơn!
        </p>
      </div>
    </div>
  );
}
