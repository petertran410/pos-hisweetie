"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { printTemplatesApi } from "@/lib/api/print-templates";
import { X, Info } from "lucide-react";
import { toast } from "react-hot-toast";
import { Editor } from "@tinymce/tinymce-react";
import { PrintPreviewPane } from "./PrintPreviewPane";
import { VariableTokenModal } from "./VariableTokenModal";
import { replaceTokensWithDummy } from "./dummy-data";

interface Props {
  template: any;
  templateFor: string;
  onClose: () => void;
}

export function PrintTemplateEditorModal({
  template,
  templateFor,
  onClose,
}: Props) {
  const [name, setName] = useState(template?.name || "");
  const [code, setCode] = useState(template?.code || "");
  const [content, setContent] = useState(template?.content || "");
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [paperSize, setPaperSize] = useState(template?.paperSize || "A5");
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const editorRef = useRef<any>(null);
  const queryClient = useQueryClient();

  const { data: variablesGrouped } = useQuery({
    queryKey: ["print-variables", templateFor],
    queryFn: () => printTemplatesApi.getVariables(templateFor),
  });

  // Build set of item variable keys from grouped response
  const itemKeys = new Set<string>();
  Object.values(variablesGrouped || {}).forEach((vars: any) => {
    vars.forEach((v: any) => {
      if (v.isItemVariable) itemKeys.add(v.key);
    });
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      template
        ? printTemplatesApi.update(template.id, data)
        : printTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-templates"] });
      toast.success(template ? "Đã cập nhật mẫu in" : "Đã tạo mẫu in");
      onClose();
    },
    onError: () => toast.error("Lỗi khi lưu mẫu in"),
  });

  const handleSave = () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Vui lòng nhập tên và mã mẫu in");
      return;
    }
    saveMutation.mutate({
      name,
      code,
      templateFor,
      content,
      isDefault,
      paperSize,
    });
  };

  const previewHtml = replaceTokensWithDummy(content, templateFor, itemKeys);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">
              {template ? "Sửa mẫu in" : "Tạo mẫu in mới"}
            </h2>
            <button
              onClick={() => setTokenModalOpen(true)}
              className="text-gray-400 hover:text-brand"
              title="Danh sách token">
              <Info className="w-4 h-4" />
            </button>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form row */}
        <div className="flex items-center gap-4 px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">
              Tên mẫu in
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-64"
              placeholder="VD: Mẫu A5 final"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">
              Mã mẫu
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-48"
              placeholder="VD: invoice_a5"
              disabled={!!template}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Khổ giấy</label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm">
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="K80">K80</option>
              <option value="K58">K58</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm ml-auto">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Đặt làm mẫu mặc định
          </label>
        </div>

        {/* Editor + Preview */}
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 border-r overflow-hidden flex flex-col">
            <Editor
              tinymceScriptSrc="/tinymce/tinymce.min.js"
              licenseKey="gpl"
              onInit={(_evt, editor) => (editorRef.current = editor)}
              value={content}
              onEditorChange={(val) => setContent(val)}
              init={{
                height: "100%",
                menubar: false,
                plugins: [
                  "advlist",
                  "autolink",
                  "lists",
                  "link",
                  "image",
                  "charmap",
                  "preview",
                  "searchreplace",
                  "visualblocks",
                  "code",
                  "fullscreen",
                  "table",
                  "wordcount",
                ],
                toolbar:
                  "undo redo | blocks fontfamily fontsize | bold italic underline forecolor backcolor | " +
                  "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | " +
                  "table | removeformat code",
                content_style:
                  "body { font-family: Arial, sans-serif; font-size: 13px; }",
                branding: false,
                promotion: false,
                table_default_attributes: {
                  border: "0",
                  cellpadding: "4",
                  cellspacing: "0",
                },
                table_default_styles: {
                  "border-collapse": "collapse",
                  width: "100%",
                },
              }}
            />
          </div>
          <div className="w-1/2 bg-gray-100 p-4 overflow-auto">
            <div className="text-xs text-gray-500 mb-2">
              Xem trước mẫu in (dữ liệu mẫu)
            </div>
            <div className="bg-white shadow-sm" style={{ minHeight: "600px" }}>
              <PrintPreviewPane html={previewHtml} paperSize={paperSize} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Bỏ qua
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50">
            {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
          </button>
        </div>

        {tokenModalOpen && (
          <VariableTokenModal
            templateFor={templateFor}
            onClose={() => setTokenModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
