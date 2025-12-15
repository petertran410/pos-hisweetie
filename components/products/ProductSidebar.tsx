"use client";

import { useState } from "react";
import { useCategories } from "@/lib/hooks/useCategories";

export function ProductSidebar() {
  const { data: categories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<number>();

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Nhóm hàng */}
      <div>
        <h3 className="font-semibold mb-2">Nhóm hàng</h3>
        <select
          className="w-full border rounded px-3 py-2"
          value={selectedCategory || ""}
          onChange={(e) =>
            setSelectedCategory(Number(e.target.value) || undefined)
          }>
          <option value="">Chọn nhóm hàng</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tồn kho */}
      <div>
        <h3 className="font-semibold mb-2">Tồn kho</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Tất cả</option>
          <option value="instock">Còn hàng</option>
          <option value="outofstock">Hết hàng</option>
          <option value="lowstock">Dưới định mức</option>
        </select>
      </div>

      {/* Kho hàng */}
      <div>
        <h3 className="font-semibold mb-2">Kho hàng</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Tất cả kho</option>
        </select>
      </div>

      {/* Dự kiến hết hàng */}
      <div>
        <h3 className="font-semibold mb-2">Dự kiến hết hàng</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="stock-time" value="all" defaultChecked />
            <span>Toàn thời gian</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="stock-time" value="custom" />
            <span>Tùy chỉnh</span>
          </label>
        </div>
      </div>

      {/* Thời gian tạo */}
      <div>
        <h3 className="font-semibold mb-2">Thời gian tạo</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="create-time" value="all" defaultChecked />
            <span>Toàn thời gian</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="create-time" value="custom" />
            <span>Tùy chỉnh</span>
          </label>
        </div>
      </div>

      {/* Thuộc tính */}
      <div>
        <h3 className="font-semibold mb-2">Thuộc tính</h3>
        <input
          type="text"
          placeholder="Ví dụ: Màu sắc, Kích cỡ..."
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* Nhà cung cấp */}
      <div>
        <h3 className="font-semibold mb-2">Nhà cung cấp</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn nhà cung cấp</option>
        </select>
      </div>

      {/* Thương hiệu */}
      <div>
        <h3 className="font-semibold mb-2">Thương hiệu</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn thương hiệu</option>
        </select>
      </div>

      {/* Vị trí */}
      <div>
        <h3 className="font-semibold mb-2">Vị trí</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn vị trí</option>
        </select>
      </div>

      {/* Loại hàng */}
      <div>
        <h3 className="font-semibold mb-2">Loại hàng</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn loại hàng</option>
        </select>
      </div>

      {/* Tích điểm */}
      <div>
        <h3 className="font-semibold mb-2">Tích điểm</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="reward" value="all" defaultChecked />
            <span>Tất cả</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="reward" value="yes" />
            <span>Có</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="reward" value="no" />
            <span>Không</span>
          </label>
        </div>
      </div>

      {/* Bán trực tiếp */}
      <div>
        <h3 className="font-semibold mb-2">Bán trực tiếp</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="direct-sale" value="all" defaultChecked />
            <span>Tất cả</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="direct-sale" value="yes" />
            <span>Có</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="direct-sale" value="no" />
            <span>Không</span>
          </label>
        </div>
      </div>

      {/* Liên kết kiểm bán */}
      <div>
        <h3 className="font-semibold mb-2">Liên kết kiểm bán</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span>Bán trực tiếp</span>
          </label>
        </div>
      </div>
    </div>
  );
}
