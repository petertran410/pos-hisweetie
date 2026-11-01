import { create } from "zustand";

/**
 * Hội thoại Messenger nhân viên đã tắt Meta Business AI trên POS (theo tid). Smax không có API tắt:
 * tin nhân viên gửi tiếp kèm thẻ HUMAN_AGENT mới lấy lại quyền trả lời → giữ cờ tới khi gửi xong.
 */
interface MetaAiTakeOverState {
  tids: Record<string, true>;
  set: (tid: string, on: boolean) => void;
}

export const useMetaAiTakeOver = create<MetaAiTakeOverState>()((set) => ({
  tids: {},
  set: (tid, on) =>
    set((s) => {
      const tids = { ...s.tids };
      if (on) tids[tid] = true;
      else delete tids[tid];
      return { tids };
    }),
}));
