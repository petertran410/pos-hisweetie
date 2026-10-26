import { useMyChannels } from "@/lib/hooks/useSmaxChat";
import { useChatSidebarStore } from "@/lib/store/chatSidebar";
import type { ChatChannel } from "@/lib/types/smaxChat";

/** Kênh đang dùng: kênh đã chọn (nếu còn), ưu tiên Zalo cá nhân còn trên Smax. */
export function pickChannel(channels: ChatChannel[], pagePid: string | null): ChatChannel | undefined {
  const usable = channels.filter((c) => !c.missing && c.platform === "zaloweb");
  return (
    channels.find((c) => c.pagePid === pagePid && !c.missing) ??
    usable[0] ??
    channels.find((c) => !c.missing) ??
    channels[0]
  );
}

/** Kênh Zalo của tôi + kênh đang chọn (dùng chung đầu sidebar, thanh thu gọn, gần đây). */
export function useActiveChannel(enabled = true) {
  const { data: channels, isLoading } = useMyChannels(enabled);
  const pagePid = useChatSidebarStore((s) => s.pagePid);
  const channel = channels ? pickChannel(channels, pagePid) : undefined;
  const usable = (channels ?? []).filter((c) => !c.missing && c.platform === "zaloweb");
  return { channels: channels ?? [], usable, channel, isLoading };
}
