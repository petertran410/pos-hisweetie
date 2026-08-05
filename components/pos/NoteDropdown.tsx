"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Edit2, Plus, Search } from "lucide-react";
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
  const [customNote, setCustomNote] = useState("");
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea();

  useEffect(() => {
    if (value) {
      const parts = value.split("|").filter((v) => v.trim());
      const templateIds: number[] = [];
      let custom = "";

      parts.forEach((part) => {
        const template = templates.find((t) => t.content === part.trim());
        if (template) {
          templateIds.push(template.id);
        } else {
          custom = part.trim();
        }
      });

      setSelectedTemplates(templateIds);
      setCustomNote(custom);
      setShowCustomInput(custom.length > 0);
    }
  }, [value, templates]);

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

  // Reset ô tìm kiếm + auto-focus mỗi lần mở dropdown.
  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setSearch("");
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      return next;
    });
  };

  // Lọc mẫu ghi chú theo từ khóa. Chỉ ảnh hưởng hiển thị danh sách —
  // mẫu đã chọn vẫn giữ nguyên trong `value` dù bị lọc khỏi danh sách.
  const filteredTemplates = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return templates;
    return templates.filter((t) =>
      (t.content || "").toLowerCase().includes(keyword)
    );
  }, [templates, search]);

  const buildNoteValue = (
    templateIds: number[],
    custom: string,
    includeCustom: boolean
  ) => {
    const parts: string[] = [];

    templateIds.forEach((id) => {
      const template = templates.find((t) => t.id === id);
      if (template) {
        parts.push(template.content);
      }
    });

    if (includeCustom && custom.trim()) {
      parts.push(custom.trim());
    }

    return parts.join(" | ");
  };

  const handleTemplateToggle = (templateId: number) => {
    const newSelected = selectedTemplates.includes(templateId)
      ? selectedTemplates.filter((id) => id !== templateId)
      : [...selectedTemplates, templateId];

    setSelectedTemplates(newSelected);
    onChange(buildNoteValue(newSelected, customNote, showCustomInput));
  };

  const handleCustomToggle = () => {
    const newShow = !showCustomInput;
    setShowCustomInput(newShow);
    if (!newShow) {
      setCustomNote("");
      onChange(buildNoteValue(selectedTemplates, "", false));
    }
  };

  const handleCustomChange = (newCustom: string) => {
    setCustomNote(newCustom);
    onChange(buildNoteValue(selectedTemplates, newCustom, showCustomInput));
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
                ref={searchInputRef}
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
            <div
              className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
              onClick={handleCustomToggle}>
              <div
                className={`w-4 h-4 border rounded flex items-center justify-center mt-0.5 flex-shrink-0 ${
                  showCustomInput
                    ? "bg-brand border-brand"
                    : "border-gray-300"
                }`}>
                {showCustomInput && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm font-medium">
                Ấn vào để thêm ghi chú khác
              </span>
            </div>

            {showCustomInput && (
              <div className="px-3 pb-2">
                <textarea
                  ref={textareaRef}
                  value={customNote}
                  onChange={(e) => {
                    handleCustomChange(e.target.value.slice(0, 1000));
                    adjustHeight();
                  }}
                  maxLength={1000}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={adjustHeight}
                  placeholder="Nhập ghi chú tùy chỉnh"
                  rows={1}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand resize-none overflow-hidden"
                  style={{ minHeight: "38px", maxHeight: "150px" }}
                />
              </div>
            )}

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
                    onClick={() => handleTemplateToggle(template.id)}>
                    <div
                      className={`w-4 h-4 border rounded flex items-center justify-center ${
                        selectedTemplates.includes(template.id)
                          ? "bg-brand border-brand"
                          : "border-gray-300"
                      }`}>
                      {selectedTemplates.includes(template.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
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
