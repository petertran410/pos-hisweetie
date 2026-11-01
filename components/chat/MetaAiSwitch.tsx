import { Bot, Loader2 } from "lucide-react";

/** Công tắc Meta Business AI cho hội thoại Messenger (đầu khung chat và danh sách hội thoại). */
export function MetaAiSwitch({
  on,
  busy,
  onClick,
}: {
  on: boolean;
  busy?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      role="switch"
      aria-checked={on}
      title={on ? "Meta Business AI đang trả lời — bấm để tự phản hồi" : "Bật Meta Business AI trả lời hội thoại này"}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium disabled:opacity-50 ${
        on ? "border-blue-200 bg-blue-50 text-blue-700" : "bg-white text-gray-500 hover:bg-gray-50"
      }`}>
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
      Meta AI
      <span className={`relative h-3 w-5 rounded-full transition-colors ${on ? "bg-blue-600" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 h-2 w-2 rounded-full bg-white transition-all ${on ? "left-2.5" : "left-0.5"}`} />
      </span>
    </button>
  );
}
