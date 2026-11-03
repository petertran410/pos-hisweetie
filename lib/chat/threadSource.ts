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
  // tid hội thoại trên Smax + nền tảng kênh (sticker, cảm xúc, thu hồi, kết bạn chỉ Zalo cá nhân)
  tid: string;
  platform: string;
  name: string | null;
  // Tên khách POS đã gắn (Sale đặt tên gợi nhớ trên Zalo, Smax chỉ có tên Zalo thật) → hiện ở header
  customerName?: string | null;
  fetchPage: (before?: string) => Promise<ChatMessagesPage>;
  send: (body: SendBody) => Promise<unknown>;
  fetchProfile: () => Promise<ZaloProfile>;
  // Thả / thu hồi (NONE) cảm xúc 1 tin
  react: (pid: string, reaction: string, confirmed?: boolean) => Promise<unknown>;
  // Thu hồi (cả 2 phía) / xoá phía mình 1 tin
  messageAction: (pid: string, action: "recall" | "delete", confirmed?: boolean) => Promise<unknown>;
  // Bật Meta Business AI trả lời hội thoại Messenger
  passControlAI: (confirmed?: boolean) => Promise<unknown>;
  // Chỉ chat theo khách (API kết bạn theo contact)
  friendAction?: (action: "request" | "accept" | "undo") => Promise<{ friend: ZaloProfile["friend"] }>;
}

/** tid của ID đã lưu: số Zalo → "zlw" + số; kênh khác đã lưu sẵn tid (fb…, zl…, sp…). */
export const contactTid = (c: Pick<ZaloContact, "zaloId">) => (/^\d+$/.test(c.zaloId) ? `zlw${c.zaloId}` : c.zaloId);

export function customerSource(
  customerId: number,
  channel: { pagePid: string; platform: string },
  contact: ZaloContact,
  customerName?: string | null
): ThreadSource {
  const { pagePid } = channel;
  const tid = contactTid(contact);
  return {
    key: `c-${customerId}-${pagePid}-${contact.id}`,
    kind: contact.kind,
    zaloId: contact.zaloId,
    tid,
    platform: channel.platform,
    name: contact.name,
    customerName,
    fetchPage: (before) => smaxChatApi.getMessages(customerId, { pagePid, contactId: contact.id, before }),
    send: (body) => smaxChatApi.send(customerId, { ...body, pagePid, contactId: contact.id }),
    fetchProfile: () => smaxChatApi.getZaloProfile(customerId, pagePid, contact.id),
    react: (pid, reaction, confirmed) =>
      smaxChatApi.react({ pagePid, tid, pid, reaction, confirmed }),
    messageAction: (pid, action, confirmed) =>
      smaxChatApi.messageAction({ pagePid, tid, pid, action, confirmed }),
    passControlAI: (confirmed) => smaxChatApi.passControlAI({ pagePid, tid, confirmed }),
    friendAction: (action) => smaxChatApi.friendAction(customerId, { pagePid, contactId: contact.id, action }),
  };
}

export function looseSource(t: LooseThread): ThreadSource {
  return {
    key: `t-${t.pagePid}-${t.tid}`,
    kind: t.isGroup ? "group" : "user",
    zaloId: t.zaloId,
    tid: t.tid,
    platform: t.platform ?? "zaloweb",
    name: t.name,
    fetchPage: (before) => smaxChatApi.getThreadMessages(t.pagePid, t.tid, before),
    send: (body) => smaxChatApi.sendToThread({ ...body, pagePid: t.pagePid, tid: t.tid, isGroup: t.isGroup }),
    fetchProfile: () => smaxChatApi.getThreadProfile(t.pagePid, t.tid, t.isGroup),
    react: (pid, reaction, confirmed) => smaxChatApi.react({ pagePid: t.pagePid, tid: t.tid, pid, reaction, confirmed }),
    messageAction: (pid, action, confirmed) =>
      smaxChatApi.messageAction({ pagePid: t.pagePid, tid: t.tid, pid, action, confirmed }),
    passControlAI: (confirmed) => smaxChatApi.passControlAI({ pagePid: t.pagePid, tid: t.tid, confirmed }),
  };
}
