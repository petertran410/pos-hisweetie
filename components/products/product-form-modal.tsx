// components/products/product-form-modal.tsx
"use client";

import { useMutation } from "@tanstack/react-query";
import { Form } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Label } from "recharts";
import { Unit } from "recharts/types/cartesian/CartesianAxis";
import { toast } from "sonner";

export function ProductFormModal({
  product,
  open,
  onOpenChange,
}: ProductFormModalProps) {
  const form = useForm<CreateProductDto>({
    defaultValues: product || {
      isActive: true,
      isDirectSale: true,
    },
  });

  const [attributes, setAttributes] = useState<ProductAttribute[]>(
    product?.attributes || []
  );
  const [units, setUnits] = useState<Unit[]>([]);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showAttributeForm, setShowAttributeForm] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: CreateProductDto) =>
      product ? productsApi.update(product.id, data) : productsApi.create(data),
    onSuccess: () => {
      toast.success(
        product ? "Cập nhật thành công" : "Tạo sản phẩm thành công"
      );
      onOpenChange(false);
      queryClient.invalidateQueries(["products"]);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="code"
                  label="Mã hàng"
                  required
                  render={({ field }) => <Input {...field} />}
                />
                <FormField
                  name="name"
                  label="Tên hàng"
                  required
                  render={({ field }) => <Input {...field} />}
                />
              </div>

              {/* Category & Trademark */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="categoryId"
                  label="Nhóm hàng"
                  render={({ field }) => (
                    <CategorySelect
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <FormField
                  name="tradeMarkId"
                  label="Thương hiệu"
                  render={({ field }) => (
                    <TrademarkSelect
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="purchasePrice"
                  label="Giá nhập"
                  render={({ field }) => (
                    <Input type="number" {...field} rightAddon="₫" />
                  )}
                />
                <FormField
                  name="retailPrice"
                  label="Giá bán"
                  render={({ field }) => (
                    <Input type="number" {...field} rightAddon="₫" />
                  )}
                />
              </div>

              {/* Weight */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  name="weight"
                  label="Trọng lượng"
                  render={({ field }) => <Input type="number" {...field} />}
                />
                <FormField
                  name="weightUnit"
                  label="Đơn vị"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Unit Management */}
              <div>
                <Label className="mb-2 block">Đơn vị tính</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUnitForm(true)}>
                  Quản lý theo đơn vị tính và thuộc tính
                </Button>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="stockQuantity"
                  label="Tồn kho"
                  render={({ field }) => <Input type="number" {...field} />}
                />
                <FormField
                  name="minStockAlert"
                  label="Định mức tồn"
                  render={({ field }) => <Input type="number" {...field} />}
                />
              </div>

              {/* Direct Sale */}
              <FormField
                name="isDirectSale"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label>Bán trực tiếp</Label>
                  </div>
                )}
              />

              {/* Description */}
              <FormField
                name="description"
                label="Mô tả"
                render={({ field }) => <Textarea {...field} rows={4} />}
              />

              {/* Images */}
              <div>
                <Label className="mb-2 block">Hình ảnh</Label>
                <ImageUpload
                  value={form.watch("imageUrls") || []}
                  onChange={(urls) => form.setValue("imageUrls", urls)}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* Unit & Attribute Form */}
        {showUnitForm && (
          <UnitAttributeForm
            unit={form.watch("unit")}
            attributes={attributes}
            onSave={(unit, attrs) => {
              form.setValue("unit", unit);
              setAttributes(attrs);
              setShowUnitForm(false);
            }}
            onCancel={() => setShowUnitForm(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
