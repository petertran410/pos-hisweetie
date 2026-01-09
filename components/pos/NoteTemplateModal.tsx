"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface NoteTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  onDelete?: () => void;
  initialValue?: string;
  mode: "create" | "edit";
}

export function NoteTemplateModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialValue = "",
  mode,
}: NoteTemplateModalProps) {
  const [content, setContent] = useState(initialValue);

  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!content.trim()) return;
    onSave(content);
    setContent("");
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-[500px] max-w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {mode === "create" ? "Tạo ghi chú có sẵn" : "Chỉnh sửa ghi chú"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nội dung ghi chú
          </label>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập nội dung ghi chú"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">
            Bỏ qua
          </button>
          {mode === "edit" && onDelete && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600">
              Xóa
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!content.trim()}
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
            {mode === "create" ? "Tạo" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
