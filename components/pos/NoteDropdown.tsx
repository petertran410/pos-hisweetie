"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Edit2, Plus, Search } from "lucide-react";
import { NoteTemplate } from "@/lib/api/note-templates";

interface NoteDropdownProps {
  value: string;
  onChange: (value: string) => void;
  templates: NoteTemplate[];
  onCreateTemplate: () => void;
  onEditTemplate: (template: NoteTemplate) => void;
  /**
   * Chỉ điều khiển việc HIỂN THỊ nút "Tạo ghi chú có sẵn" và icon sửa mẫu.
   * Không ảnh hưởng tới việc xem / tìm / chọn ghi chú của người dùng.
   */
  canManageTemplates?: boolean;
}

const useAutoResizeTextarea = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  };

  useEffect(() => {
    adjustHeight();
  }, []);

  return { textareaRef, adjustHeight };
};

export function NoteDropdown({
  value,
  onChange,
  templates,
  onCreateTemplate,
  onEditTemplate,
  canManageTemplates = false,
}: NoteDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Đặt con trỏ về cuối nội dung textarea và focus vào đó.
  const focusTextareaAtEnd = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
    adjustHeight();
  };

  // Reset ô tìm kiếm + auto-focus vào textarea mỗi lần mở dropdown,
  // để con trỏ nhấp nháy sẵn cho người dùng gõ ghi chú ngay.
  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setSearch("");
        setTimeout(() => focusTextareaAtEnd(), 0);
      }
      return next;
    });
  };

  // Lọc mẫu ghi chú theo từ khóa. Chỉ ảnh hưởng hiển thị danh sách.
  const filteredTemplates = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return templates;
    return templates.filter((t) =>
      (t.content || "").toLowerCase().includes(keyword)
    );
  }, [templates, search]);

  // Ghi chú tự do là chữ. Người dùng gõ trực tiếp vào textarea.
  const handleNoteChange = (newValue: string) => {
    onChange(newValue.slice(0, 1000));
  };

  // Bấm 1 mẫu → chèn nội dung mẫu vào textarea (nối bằng khoảng trắng
  // nếu đã có chữ) và thêm 1 khoảng trắng ở cuối để gõ tiếp ngay.
  // Không tick bật/tắt, không ảnh hưởng mẫu gốc.
  const handleTemplateInsert = (content: string) => {
    const current = value.trim();
    const next = (current ? `${current} ${content}` : content) + " ";
    onChange(next.slice(0, 1000));
    setTimeout(() => focusTextareaAtEnd(), 0);
  };

  const displayValue = value || "Nhấn để thêm ghi chú...";

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={toggleOpen}
        className="text-xs lg:text-sm text-gray-500 cursor-pointer hover:text-gray-700 min-h-[18px] lg:min-h-[20px] flex items-center gap-1">
        <span className="flex-1">{displayValue}</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {canManageTemplates && (
            <>
              <div className="p-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTemplate();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand hover:bg-brand-soft rounded">
                  <Plus className="w-4 h-4" />
                  <span>Tạo ghi chú có sẵn</span>
                </button>
              </div>

              <div className="border-t border-gray-200" />
            </>
          )}

          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Tìm ghi chú..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <div className="p-2 space-y-1">
            {/* Ô ghi chú tự do — luôn hiển thị, con trỏ nhấp nháy sẵn khi mở. */}
            <div className="px-1 pb-1">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  handleNoteChange(e.target.value);
                  adjustHeight();
                }}
                maxLength={1000}
                onClick={(e) => e.stopPropagation()}
                onFocus={adjustHeight}
                placeholder="Nhập ghi chú..."
                rows={1}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand resize-none overflow-hidden"
                style={{ minHeight: "38px", maxHeight: "150px" }}
              />
            </div>

            {filteredTemplates.length === 0 && search.trim() ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                Không tìm thấy ghi chú
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredId(template.id)}
                  onMouseLeave={() => setHoveredId(null)}>
                  <div
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => handleTemplateInsert(template.content)}>
                    <span className="text-sm flex-1">{template.content}</span>
                    {canManageTemplates && hoveredId === template.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTemplate(template);
                        }}
                        className="p-1 text-brand hover:bg-brand-soft rounded">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
