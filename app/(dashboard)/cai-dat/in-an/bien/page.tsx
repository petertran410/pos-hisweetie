"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { printTemplatesApi } from "@/lib/api/print-templates";
import { Edit, Plus } from "lucide-react";
import { PrintTemplateEditorModal } from "@/components/print-templates/PrintTemplateEditorModal";
import { PrintPreviewPane } from "@/components/print-templates/PrintPreviewPane";
import { replaceTokensWithDummy } from "@/components/print-templates/dummy-data";
import { ActionGuard } from "@/components/permissions/ActionGuard";

const TABS: Array<{ key: string; label: string }> = [
  { key: "order", label: "Đặt hàng" },
  { key: "invoice", label: "Hóa đơn" },
  { key: "delivery", label: "Phiếu giao hàng" },
  { key: "return_order", label: "Trả hàng" },
  { key: "order_supplier", label: "Đặt hàng nhập" },
  { key: "purchase_order", label: "Nhập hàng" },
  { key: "transfer", label: "Chuyển hàng" },
  { key: "cash_flow_receipt", label: "Phiếu thu" },
  { key: "cash_flow_payment", label: "Phiếu chi" },
];

export default function PrintTemplatesPage() {
  const [activeTab, setActiveTab] = useState("invoice");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const { data: templates } = useQuery({
    queryKey: ["print-templates", activeTab],
    queryFn: () => printTemplatesApi.getAll({ templateFor: activeTab }),
  });

  const { data: variablesGrouped } = useQuery({
    queryKey: ["print-variables", activeTab],
    queryFn: () => printTemplatesApi.getVariables(activeTab),
  });

  const itemKeys = useMemo(() => {
    const s = new Set<string>();
    Object.values(variablesGrouped || {}).forEach((vars: any) => {
      vars.forEach((v: any) => v.isItemVariable && s.add(v.key));
    });
    return s;
  }, [variablesGrouped]);

  // Auto-select default template or first template on tab change
  const selectedTemplate = useMemo(() => {
    if (!templates?.length) return null;
    if (selectedId) {
      const found = templates.find((t: any) => t.id === selectedId);
      if (found) return found;
    }
    return templates.find((t: any) => t.isDefault) || templates[0];
  }, [templates, selectedId]);

  const previewHtml = useMemo(() => {
    if (!selectedTemplate?.content) return "";
    return replaceTokensWithDummy(
      selectedTemplate.content,
      activeTab,
      itemKeys
    );
  }, [selectedTemplate, activeTab, itemKeys]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSelectedId(null);
  };

  const handleEdit = () => {
    if (!selectedTemplate) return;
    setEditingTemplate(selectedTemplate);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center border-b bg-white px-6 overflow-x-auto">
        <h1 className="text-lg font-bold pr-6 whitespace-nowrap">Mẫu in</h1>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-blue-500 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-white">
        <label className="text-sm font-medium whitespace-nowrap">Mẫu in</label>
        <select
          value={selectedTemplate?.id || ""}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="border rounded px-3 py-1.5 text-sm min-w-[240px]">
          {!templates?.length && <option value="">(Chưa có mẫu)</option>}
          {templates?.map((t: any) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.isDefault ? " (Mặc định)" : ""}
            </option>
          ))}
        </select>

        <ActionGuard resource="print_templates" action="update">
          <button
            onClick={handleEdit}
            disabled={!selectedTemplate}
            className="p-2 border rounded hover:bg-gray-50 disabled:opacity-40"
            title="Sửa mẫu">
            <Edit className="w-4 h-4" />
          </button>
        </ActionGuard>

        <ActionGuard resource="print_templates" action="create">
          <button
            onClick={handleCreate}
            className="p-2 border rounded hover:bg-gray-50"
            title="Thêm mẫu">
            <Plus className="w-4 h-4" />
          </button>
        </ActionGuard>

        <div className="ml-auto text-sm text-gray-500">Xem trước mẫu in</div>
      </div>

      {/* Content: split source (left) + preview (right) */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r bg-white overflow-auto p-4">
          <div className="text-xs text-gray-500 mb-2">Nguồn mẫu in</div>
          {selectedTemplate ? (
            <div
              className="border rounded p-4 text-sm font-mono whitespace-pre-wrap break-words bg-gray-50"
              dangerouslySetInnerHTML={{ __html: selectedTemplate.content }}
            />
          ) : (
            <div className="text-gray-400 text-sm">
              Chưa có mẫu in. Bấm ➕ để tạo mẫu mới.
            </div>
          )}
        </div>
        <div className="w-1/2 bg-gray-100 p-4 overflow-auto">
          <div className="bg-white shadow-sm" style={{ minHeight: "600px" }}>
            {selectedTemplate ? (
              <PrintPreviewPane
                html={previewHtml}
                paperSize={selectedTemplate.paperSize}
              />
            ) : (
              <div className="p-8 text-center text-gray-400">
                Chưa có mẫu để xem trước
              </div>
            )}
          </div>
        </div>
      </div>

      {editorOpen && (
        <PrintTemplateEditorModal
          template={editingTemplate}
          templateFor={activeTab}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}
