"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { printTemplatesApi } from "@/lib/api/print-templates";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

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
  // const quillRef = useRef<any>(null);
  const queryClient = useQueryClient();
  const [quillInstance, setQuillInstance] = useState<any>(null);

  const { data: variables } = useQuery({
    queryKey: ["print-variables", templateFor],
    queryFn: () => printTemplatesApi.getVariables(templateFor),
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
    onError: () => {
      toast.error("Lỗi khi lưu mẫu in");
    },
  });

  const handleSave = () => {
    if (!name || !code) {
      toast.error("Vui lòng nhập tên và mã mẫu in");
      return;
    }

    saveMutation.mutate({
      name,
      code,
      templateFor,
      content,
      isDefault,
    });
  };

  const insertVariable = (variableKey: string) => {
    if (!quillInstance) return;

    const range = quillInstance.getSelection();
    if (range) {
      quillInstance.insertText(range.index, `{${variableKey}}`);
      quillInstance.setSelection(range.index + variableKey.length + 2);
    }
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline"],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
      ["clean"],
    ],
  };

  const variablesByGroup = variables || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {template ? "Sửa mẫu in" : "Tạo mẫu in mới"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="w-2/3 p-6 overflow-y-auto border-r">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Tên mẫu in
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="VD: Mẫu in A5 final"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Mã mẫu</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="VD: invoice_a5_final"
                disabled={!!template}
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <span className="text-sm">Đặt làm mẫu mặc định</span>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Nội dung mẫu in
              </label>
              <ReactQuill
                value={content}
                onChange={setContent}
                onChangeSelection={(range, source, editor) => {
                  if (!quillInstance) {
                    setQuillInstance(editor);
                  }
                }}
                modules={modules}
                theme="snow"
                style={{ height: "400px", marginBottom: "50px" }}
              />
            </div>
          </div>

          <div className="w-1/3 p-6 overflow-y-auto bg-gray-50">
            <h3 className="font-medium mb-4">Trường dữ liệu</h3>
            <div className="space-y-4">
              {Object.entries(variablesByGroup).map(([group, vars]: any) => (
                <div key={group}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {group}
                  </h4>
                  <div className="space-y-1">
                    {vars.map((v: any) => (
                      <button
                        key={v.key}
                        onClick={() => insertVariable(v.key)}
                        className={`w-full text-left px-3 py-2 text-sm border rounded hover:bg-blue-50 ${
                          v.isItemVariable
                            ? "border-orange-300 bg-orange-50"
                            : "bg-white hover:border-blue-300"
                        }`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium">{v.label}</div>
                          {v.isItemVariable && (
                            <span className="text-xs bg-orange-200 px-2 py-0.5 rounded">
                              Loop
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {`{${v.key}}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
            {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
