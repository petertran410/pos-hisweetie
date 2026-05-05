import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function ReturnGoodsPage() {
  return (
    <PagePermissionGuard resource="purchase_orders" action="view">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Trả hàng nhập</h1>
        <p className="text-gray-600 mt-2">Trang này đang được phát triển</p>
      </div>
    </PagePermissionGuard>
  );
}
