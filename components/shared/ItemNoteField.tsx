"use client";

import { useState } from "react";
import { NoteTemplate } from "@/lib/api/note-templates";
import {
  useNoteTemplates,
  useCreateNoteTemplate,
  useUpdateNoteTemplate,
  useDeleteNoteTemplate,
} from "@/lib/hooks/useNoteTemplates";
import { useCan } from "@/lib/hooks/useCan";
import { NoteDropdown } from "@/components/pos/NoteDropdown";
import { NoteTemplateModal } from "@/components/pos/NoteTemplateModal";

/**
 * Ghi chú hàng hóa theo dòng (hiển thị dưới tên hàng) cho phiếu Đặt hàng nhập
 * / Nhập hàng. Cùng UX với ghi chú dòng ở Đặt hàng / Hóa đơn (OrderItemsList):
 * NoteDropdown + mẫu ghi chú có sẵn + modal tạo/sửa mẫu.
 * Khi phiếu bị khóa (`disabled`) chỉ hiện chữ, không cho sửa.
 */
export function ItemNoteField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (note: string) => void;
  disabled?: boolean;
}) {
  const { data: noteTemplates = [] } = useNoteTemplates();
  const canManageNoteTemplates = useCan("note_templates", "manage");
  const createNoteTemplate = useCreateNoteTemplate();
  const updateNoteTemplate = useUpdateNoteTemplate();
  const deleteNoteTemplate = useDeleteNoteTemplate();

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteModalMode, setNoteModalMode] = useState<"create" | "edit">(
    "create"
  );
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(
    null
  );

  if (disabled) {
    return value ? (
      <div className="text-xs lg:text-sm text-gray-500 whitespace-pre-wrap">
        {value}
      </div>
    ) : null;
  }

  const handleCreateTemplate = () => {
    if (!canManageNoteTemplates) return;
    setNoteModalMode("create");
    setEditingTemplate(null);
    setShowNoteModal(true);
  };

  const handleEditTemplate = (template: NoteTemplate) => {
    if (!canManageNoteTemplates) return;
    setNoteModalMode("edit");
    setEditingTemplate(template);
    setShowNoteModal(true);
  };

  const handleSaveTemplate = (content: string) => {
    if (!canManageNoteTemplates) return;
    if (noteModalMode === "create") {
      createNoteTemplate.mutate({ content });
    } else if (editingTemplate) {
      updateNoteTemplate.mutate({ id: editingTemplate.id, data: { content } });
    }
  };

  const handleDeleteTemplate = () => {
    if (!canManageNoteTemplates) return;
    if (editingTemplate) {
      deleteNoteTemplate.mutate(editingTemplate.id);
    }
  };

  return (
    <>
      <NoteDropdown
        value={value}
        onChange={onChange}
        templates={noteTemplates}
        onCreateTemplate={handleCreateTemplate}
        onEditTemplate={handleEditTemplate}
        canManageTemplates={canManageNoteTemplates}
        // Bảng hàng hóa nằm trong container overflow-x-auto → dùng portal để
        // panel không bị cắt.
        portal
      />
      <NoteTemplateModal
        isOpen={canManageNoteTemplates && showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSave={handleSaveTemplate}
        onDelete={noteModalMode === "edit" ? handleDeleteTemplate : undefined}
        initialValue={editingTemplate?.content || ""}
        mode={noteModalMode}
      />
    </>
  );
}
