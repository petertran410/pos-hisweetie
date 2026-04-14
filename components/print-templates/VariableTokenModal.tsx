"use client";

import { useQuery } from "@tanstack/react-query";
import { printTemplatesApi } from "@/lib/api/print-templates";
import { X } from "lucide-react";

interface Props {
  templateFor: string;
  onClose: () => void;
}

export function VariableTokenModal({ templateFor, onClose }: Props) {
  const { data: grouped } = useQuery({
    queryKey: ["print-variables", templateFor],
    queryFn: () => printTemplatesApi.getVariables(templateFor),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Danh sách token mẫu in</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {Object.entries(grouped || {}).map(([group, vars]: any) => (
            <div key={group} className="mb-6">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">
                {group}
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {vars.map((v: any) => (
                  <div key={v.key} className="flex gap-2 text-sm">
                    <code className="text-blue-600 whitespace-nowrap">
                      {`{${v.key}}`}:
                    </code>
                    <span className="text-gray-700">{v.label}</span>
                    {v.isItemVariable && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-1.5 rounded">
                        Loop
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
