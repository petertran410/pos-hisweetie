"use client";

import { useState } from "react";

interface UnitAttributeModalProps {
  unit: string;
  attributes: { name: string; value: string }[];
  onSave: (unit: string, attributes: { name: string; value: string }[]) => void;
  onClose: () => void;
}

export function UnitAttributeModal({
  unit,
  attributes,
  onSave,
  onClose,
}: UnitAttributeModalProps) {
  const [currentUnit, setCurrentUnit] = useState(unit);
  const [currentAttributes, setCurrentAttributes] = useState(attributes);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState("");

  const attributePresets = [
    "Vị",
    "Loại",
    "Màu Thứ/ Mật Vị",
    "Màu sắc",
    "Kích cỡ",
  ];

  const addAttribute = (name: string) => {
    setCurrentAttributes((prev) => [...prev, { name, value: "" }]);
    setShowAddAttribute(false);
    setNewAttributeName("");
  };

  const updateAttributeValue = (index: number, value: string) => {
    setCurrentAttributes((prev) =>
      prev.map((attr, idx) => (idx === index ? { ...attr, value } : attr))
    );
  };

  const removeAttribute = (index: number) => {
    setCurrentAttributes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    onSave(currentUnit, currentAttributes);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          Thiết lập đơn vị tính và thuộc tính
        </h3>

        {/* Đơn vị tính */}
        <div className="mb-6">
          <h4 className="font-medium mb-2">Đơn vị tính</h4>
          <p className="text-sm text-gray-600 mb-3">
            Thêm đơn vị sản hoặc đóng gói như chai, lốc, thùng. Đặt công thức
            quy đổi tính nhanh giá và tồn kho. Vd: 1 lốc = 4 chai, 1 thùng = 20
            lốc.
          </p>
          <div className="flex gap-2">
            <input
              value={currentUnit}
              onChange={(e) => setCurrentUnit(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
              placeholder="Gói (Đơn vị cơ bản)"
            />
            <button
              type="button"
              onClick={() => setShowAddUnit(true)}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50">
              + Thêm đơn vị
            </button>
          </div>
        </div>

        {/* Thuộc tính */}
        <div className="mb-6">
          <h4 className="font-medium mb-2">Thuộc tính</h4>
          <p className="text-sm text-gray-600 mb-3">
            Thêm đặc điểm như hương vị, dung tích, màu sắc.
          </p>
          <div className="space-y-3">
            {currentAttributes.map((attr, idx) => (
              <div key={idx} className="flex gap-2">
                <select
                  value={attr.name}
                  onChange={(e) => {
                    const newAttrs = [...currentAttributes];
                    newAttrs[idx].name = e.target.value;
                    setCurrentAttributes(newAttrs);
                  }}
                  className="border rounded px-3 py-2">
                  <option value="">Chọn thuộc tính</option>
                  {attributePresets.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
                <input
                  value={attr.value}
                  onChange={(e) => updateAttributeValue(idx, e.target.value)}
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="Nhập giá trị thuộc tính"
                />
                <button
                  type="button"
                  onClick={() => removeAttribute(idx)}
                  className="px-3 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50">
                  Xóa
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setShowAddAttribute(true)}
              className="text-blue-600 hover:underline text-sm">
              + Thêm thuộc tính
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50">
            Bỏ qua
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Xong
          </button>
        </div>
      </div>

      {/* Add Unit Modal */}
      {showAddUnit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Thêm đơn vị</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tên đơn vị
                </label>
                <input className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Giá trị quy đổi
                </label>
                <div className="flex items-center gap-2">
                  <span>=</span>
                  <input
                    type="number"
                    className="w-20 border rounded px-3 py-2"
                  />
                  <span>Gói</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Giá bán
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={110000}
                />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span className="text-sm">Bán trực tiếp</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddUnit(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50">
                Bỏ qua
              </button>
              <button
                onClick={() => setShowAddUnit(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Xong & Thêm mới
              </button>
              <button
                onClick={() => setShowAddUnit(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Attribute Dropdown */}
      {showAddAttribute && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Thêm thuộc tính</h3>
            <div className="space-y-2">
              {attributePresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => addAttribute(preset)}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded">
                  {preset}
                </button>
              ))}
              <div className="border-t pt-2">
                <input
                  value={newAttributeName}
                  onChange={(e) => setNewAttributeName(e.target.value)}
                  className="w-full border rounded px-3 py-2 mb-2"
                  placeholder="+ Tạo thuộc tính mới"
                />
                {newAttributeName && (
                  <button
                    onClick={() => addAttribute(newAttributeName)}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Thêm "{newAttributeName}"
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowAddAttribute(false)}
              className="mt-4 w-full px-4 py-2 border rounded hover:bg-gray-50">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
