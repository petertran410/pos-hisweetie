// components/products/product-detail-modal.tsx
"use client";

import { useMutation } from "@tanstack/react-query";
import { Edit, Trash } from "lucide-react";
import { useState } from "react";
import { Label } from "recharts";
import { toast } from "sonner";

export function ProductDetailModal({
  product,
  open,
  onOpenChange,
}: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState("info");
  const deleteMutation = useMutation({
    mutationFn: () => productsApi.delete(product.id),
    onSuccess: () => {
      toast.success("Xóa sản phẩm thành công");
      onOpenChange(false);
      queryClient.invalidateQueries(["products"]);
    },
  });

  const handleDelete = () => {
    if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
      deleteMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{product.name}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditForm(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Chỉnh sửa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600">
                <Trash className="h-4 w-4 mr-2" />
                Xóa
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="price">Giá và tồn kho</TabsTrigger>
            <TabsTrigger value="attributes">Thuộc tính</TabsTrigger>
            <TabsTrigger value="images">Hình ảnh</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Mã hàng" value={product.code} />
              <InfoRow label="Mã vạch" value={product.barcode || "---"} />
              <InfoRow label="Nhóm hàng" value={product.category?.name} />
              <InfoRow label="Thương hiệu" value={product.tradeMark?.name} />
              <InfoRow label="Đơn vị" value={product.unit || "---"} />
              <InfoRow
                label="Trọng lượng"
                value={
                  product.weight
                    ? `${product.weight} ${product.weightUnit}`
                    : "---"
                }
              />
              <InfoRow
                label="Bán trực tiếp"
                value={product.isDirectSale ? "Có" : "Không"}
              />
            </div>
            {product.description && (
              <div>
                <Label>Mô tả</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {product.description}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="price" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoRow
                label="Giá nhập"
                value={formatCurrency(product.purchasePrice)}
              />
              <InfoRow
                label="Giá bán"
                value={formatCurrency(product.retailPrice)}
              />
              <InfoRow
                label="Tồn kho"
                value={product.stockQuantity.toString()}
              />
              <InfoRow
                label="Định mức tồn"
                value={product.minStockAlert.toString()}
              />
            </div>
          </TabsContent>

          <TabsContent value="attributes">
            {product.attributes?.length > 0 ? (
              <div className="space-y-2">
                {product.attributes.map((attr) => (
                  <div
                    key={attr.id}
                    className="flex justify-between py-2 border-b">
                    <span className="font-medium">{attr.attributeName}</span>
                    <span className="text-muted-foreground">
                      {attr.attributeValue}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Chưa có thuộc tính nào
              </p>
            )}
          </TabsContent>

          <TabsContent value="images">
            {product.images?.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {product.images.map((img) => (
                  <img
                    key={img.id}
                    src={img.image}
                    alt=""
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Chưa có hình ảnh nào
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
