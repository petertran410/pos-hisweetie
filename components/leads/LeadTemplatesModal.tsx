"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { leadsApi } from "@/lib/api/leads";

const VARS = ["{tên khách}", "{tên sale}", "{sđt}", "{phân loại}", "{tỉnh thành}", "{phường}", "{nhu cầu}", "{ghi chú}", "{link}"];

/** Mẫu tin chuyển giao lead (để trống = mẫu mặc định). */
export function LeadTemplatesModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["leadTemplates"], queryFn: () => leadsApi.templates() });
  const [greeting, setGreeting] = useState("");
  const [friend, setFriend] = useState("");
  const [lark, setLark] = useState("");
  const [loaded, setLoaded] = useState<typeof data>(undefined);
  if (data && data !== loaded) {
    setLoaded(data);
    setGreeting(data.greeting);
    setFriend(data.friend);
    setLark(data.lark);
  }

  const save = useMutation({
    mutationFn: () => leadsApi.saveTemplates({ greeting, friend, lark }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadTemplates"] });
      queryClient.invalidateQueries({ queryKey: ["leadHandoverPreview"] });
      toast.success("Đã lưu mẫu tin");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được mẫu tin"),
  });

  const input = "w-full border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand";
  const field = (label: string, value: string, set: (v: string) => void, def: string | undefined, rows: number) => (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        {def && value !== def && (
          <button onClick={() => set(def)} className="text-xs text-brand hover:underline">
            Dùng mẫu mặc định
          </button>
        )}
      </div>
      <textarea value={value} onChange={(e) => set(e.target.value)} rows={rows} className={input} />
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand" />
            Mẫu tin chuyển giao lead
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-4">
          <p className="text-xs text-gray-500">Biến: {VARS.join(", ")}</p>
          {field("Tin chào khách (Zalo của Sale)", greeting, setGreeting, data?.defaults.greeting, 3)}
          {field("Lời mời kết bạn Zalo (tối đa 150 ký tự)", friend, (v) => setFriend(v.slice(0, 150)), data?.defaults.friend, 2)}
          {field("Tin Lark gửi Sale", lark, setLark, data?.defaults.lark, 7)}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <button onClick={onClose} className="px-4 py-1.5 rounded-full border text-sm hover:bg-gray-50">
            Đóng
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={!data || save.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand text-white text-sm font-medium disabled:opacity-50">
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Lưu
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
