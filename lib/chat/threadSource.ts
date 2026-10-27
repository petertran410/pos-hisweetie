import { smaxChatApi } from "@/lib/api/smaxChat";
import type { ChatMessagesPage, LooseThread, SendBody, ZaloContact, ZaloContactKind, ZaloProfile } from "@/lib/types/smaxChat";

/**
 * Nguồn dữ liệu của 1 hội thoại — ChatThread dùng chung cho chat theo khách POS
 * và hội thoại chưa gắn khách (gọi API theo tid).
 */
export interface ThreadSource {
  key: string;
  kind: ZaloContactKind;
  zaloId: string;
  name: string | null;
  fetchPage: (before?: string) => Promise<ChatMessagesPage>;
  send: (body: SendBody) => Promise<unknown>;
  fetchProfile: () => Promise<ZaloProfile>;
  // Thả / thu hồi (NONE) cảm xúc 1 tin
  react: (pid: string, reaction: string, confirmed?: boolean) => Promise<unknown>;
  // Chỉ chat theo khách (API kết bạn theo contact)
  friendAction?: (action: "request" | "accept" | "undo") => Promise<{ friend: ZaloProfile["friend"] }>;
}

export function customerSource(customerId: number, pagePid: string, contact: ZaloContact): ThreadSource {
  return {
    key: `c-${customerId}-${pagePid}-${contact.id}`,
    kind: contact.kind,
    zaloId: contact.zaloId,
    name: contact.name,
    fetchPage: (before) => smaxChatApi.getMessages(customerId, { pagePid, contactId: contact.id, before }),
    send: (body) => smaxChatApi.send(customerId, { ...body, pagePid, contactId: contact.id }),
    fetchProfile: () => smaxChatApi.getZaloProfile(customerId, pagePid, contact.id),
    react: (pid, reaction, confirmed) =>
      smaxChatApi.react({ pagePid, tid: `zlw${contact.zaloId}`, pid, reaction, confirmed }),
    friendAction: (action) => smaxChatApi.friendAction(customerId, { pagePid, contactId: contact.id, action }),
  };
}

export function looseSource(t: LooseThread): ThreadSource {
  return {
    key: `t-${t.pagePid}-${t.tid}`,
    kind: t.isGroup ? "group" : "user",
    zaloId: t.zaloId,
    name: t.name,
    fetchPage: (before) => smaxChatApi.getThreadMessages(t.pagePid, t.tid, before),
    send: (body) => smaxChatApi.sendToThread({ ...body, pagePid: t.pagePid, tid: t.tid, isGroup: t.isGroup }),
    fetchProfile: () => smaxChatApi.getThreadProfile(t.pagePid, t.tid, t.isGroup),
    react: (pid, reaction, confirmed) => smaxChatApi.react({ pagePid: t.pagePid, tid: t.tid, pid, reaction, confirmed }),
  };
}
