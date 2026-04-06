"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { printTemplatesApi } from "@/lib/api/print-templates";
import { Plus, Edit, Eye } from "lucide-react";
import { PrintTemplateEditorModal } from "@/components/print-templates/PrintTemplateEditorModal";
import { PrintPreviewModal } from "@/components/print-templates/PrintPreviewModal";

export default function PrintTemplatesPage() {
  const [selectedType, setSelectedType] = useState("invoice");
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const { data: templates } = useQuery({
    queryKey: ["print-templates", selectedType],
    queryFn: () => printTemplatesApi.getAll({ templateFor: selectedType }),
  });

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Mẫu in</h1>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setEditorOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg">
          <Plus className="w-4 h-4" />
          Tạo mẫu mới
        </button>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="border-b p-4">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border rounded px-3 py-2">
            <option value="invoice">Hóa đơn</option>
            <option value="order">Đơn hàng</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4">
          {templates?.map((t: any) => (
            <div key={t.id} className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">{t.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingTemplate(t);
                    setEditorOpen(true);
                  }}
                  className="flex-1 px-3 py-2 border rounded hover:bg-gray-50">
                  <Edit className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => {
                    setEditingTemplate(t);
                    setPreviewOpen(true);
                  }}
                  className="flex-1 px-3 py-2 border rounded hover:bg-gray-50">
                  <Eye className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editorOpen && (
        <PrintTemplateEditorModal
          template={editingTemplate}
          templateFor={selectedType}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {previewOpen && (
        <PrintPreviewModal
          template={editingTemplate}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
