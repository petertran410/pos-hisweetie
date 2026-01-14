"use client";

import { CategoryDropdown } from "./CategoryDropdown";

interface ProductSidebarProps {
  selectedParentName?: string;
  selectedMiddleName?: string;
  selectedChildName?: string;
  onSelectedParentNameChange: (name: string | undefined) => void;
  onSelectedMiddleNameChange: (name: string | undefined) => void;
  onSelectedChildNameChange: (name: string | undefined) => void;
}

export function ProductSidebar({
  selectedParentName,
  selectedMiddleName,
  selectedChildName,
  onSelectedParentNameChange,
  onSelectedMiddleNameChange,
  onSelectedChildNameChange,
}: ProductSidebarProps) {
  return (
    <div className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 bg-white shadow-xl">
      <div className="mb-5">
        <CategoryDropdown
          type="parent"
          label="Loại Hàng"
          placeholder="Chọn Loại Hàng"
          value={selectedParentName}
          onChange={onSelectedParentNameChange}
        />
      </div>

      <div className="mb-5">
        <CategoryDropdown
          type="middle"
          label="Nguồn Gốc"
          placeholder="Chọn Nguồn Gốc"
          value={selectedMiddleName}
          onChange={onSelectedMiddleNameChange}
        />
      </div>

      <div className="mb-5">
        <CategoryDropdown
          type="child"
          label="Danh Mục"
          placeholder="Chọn Danh Mục"
          value={selectedChildName}
          onChange={onSelectedChildNameChange}
        />
      </div>

      <div className="mb-5">
        <h3 className="font-semibold mb-2">Tồn kho</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Tất cả</option>
          <option value="instock">Còn hàng</option>
          <option value="outstock">Hết hàng</option>
        </select>
      </div>

      <div className="mb-5">
        <h3 className="font-semibold mb-2">Nhà cung cấp</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn nhà cung cấp</option>
        </select>
      </div>

      <div className="mb-5">
        <h3 className="font-semibold mb-2">Thương hiệu</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn thương hiệu</option>
        </select>
      </div>

      <div className="mb-5">
        <h3 className="font-semibold mb-2">Loại hàng</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn loại hàng</option>
        </select>
      </div>

      <div className="mb-5">
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
    </div>
  );
}
