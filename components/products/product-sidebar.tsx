// components/products/product-sidebar.tsx
"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Label } from "recharts";

export function ProductSidebar() {
  const [filters, setFilters] = useState({
    categoryId: null,
    trademarkId: null,
    isActive: undefined,
    stockStatus: null,
  });

  return (
    <div className="p-4 space-y-6">
      {/* Search */}
      <div>
        <Input
          placeholder="Tìm kiếm sản phẩm..."
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {/* Categories */}
      <div>
        <Label className="mb-2 block">Nhóm hàng</Label>
        <CategoryTreeSelect
          value={filters.categoryId}
          onChange={(id) => setFilters((prev) => ({ ...prev, categoryId: id }))}
        />
      </div>

      {/* Trademarks */}
      <div>
        <Label className="mb-2 block">Thương hiệu</Label>
        <Select
          value={filters.trademarkId}
          onValueChange={(id) =>
            setFilters((prev) => ({ ...prev, trademarkId: id }))
          }>
          <SelectTrigger>
            <SelectValue placeholder="Tất cả" />
          </SelectTrigger>
          <SelectContent>{/* Load from API */}</SelectContent>
        </Select>
      </div>

      {/* Stock Status */}
      <div>
        <Label className="mb-2 block">Tồn kho</Label>
        <RadioGroup
          value={filters.stockStatus}
          onValueChange={(val) =>
            setFilters((prev) => ({ ...prev, stockStatus: val }))
          }>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all">Tất cả</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="in-stock" id="in-stock" />
            <Label htmlFor="in-stock">Còn hàng</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="low-stock" id="low-stock" />
            <Label htmlFor="low-stock">Dưới định mức</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="out-stock" id="out-stock" />
            <Label htmlFor="out-stock">Hết hàng</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Active Status */}
      <div>
        <Label className="mb-2 block">Trạng thái</Label>
        <RadioGroup
          value={filters.isActive?.toString()}
          onValueChange={(val) =>
            setFilters((prev) => ({
              ...prev,
              isActive: val === "all" ? undefined : val === "true",
            }))
          }>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="status-all" />
            <Label htmlFor="status-all">Tất cả</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="true" id="active" />
            <Label htmlFor="active">Đang kinh doanh</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="false" id="inactive" />
            <Label htmlFor="inactive">Ngừng kinh doanh</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Direct Sale Filter */}
      <div>
        <Label className="mb-2 block">Loại bán</Label>
        <Checkbox
          checked={filters.isDirectSale}
          onCheckedChange={(checked) =>
            setFilters((prev) => ({ ...prev, isDirectSale: checked }))
          }>
          Chỉ hiển thị bán trực tiếp
        </Checkbox>
      </div>

      {/* Clear Filters */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setFilters({})}>
        Xóa bộ lọc
      </Button>
    </div>
  );
}
