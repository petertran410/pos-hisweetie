/** Ảnh sticker Zalo theo mã (máy chủ sticker công khai của Zalo). */
export const stickerUrl = (id: string | number, size = 130) =>
  `https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=${id}&size=${size}`;

// Zalo không có API liệt kê bộ sticker → kho duyệt theo dải mã liền nhau,
// bắt đầu từ các mã đã kiểm chứng có ảnh (26/10/2026).
export const STICKER_PAGE_SIZE = 40;
export const STICKER_DEFAULT_START = 21220;

const RECENT_KEY = "chat-recent-stickers";
const RECENT_EMOJI_KEY = "chat-recent-emojis";

function readList(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function pushList(key: string, value: string, max: number) {
  try {
    const next = [value, ...readList(key).filter((x) => x !== value)].slice(0, max);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // trình duyệt chặn localStorage — bỏ qua, chỉ mất danh sách "gần đây"
  }
}

export const getRecentStickers = () => readList(RECENT_KEY);
export const addRecentSticker = (id: string) => pushList(RECENT_KEY, id, 24);
export const getRecentEmojis = () => readList(RECENT_EMOJI_KEY);
export const addRecentEmoji = (e: string) => pushList(RECENT_EMOJI_KEY, e, 16);

/** Nhóm emoji (Unicode) — Zalo hiển thị được trong tin chữ. */
export const EMOJI_GROUPS: { name: string; emojis: string[] }[] = [
  {
    name: "Cảm xúc",
    emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕".split(" "),
  },
  {
    name: "Cử chỉ",
    emojis: "👍 👎 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💪 🫶 🫰".split(" "),
  },
  {
    name: "Trái tim & biểu tượng",
    emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 ✨ ⭐ 🌟 💯 ✅ ❌ ⚠️ ❗ ❓ 🔥 🎉 🎊 🎁 🏆 🥇 📌 📍 ⏰ 📞 💬".split(" "),
  },
  {
    name: "Đồ ăn & uống",
    emojis: "🍵 ☕ 🧋 🥤 🧃 🍹 🍸 🍺 🥛 🍶 🍓 🍒 🍑 🥭 🍍 🥥 🍌 🍋 🍊 🍉 🍇 🍎 🍐 🥝 🍯 🍰 🎂 🧁 🍮 🍩 🍪 🍫 🍬 🍭 🍦 🍨 🍧".split(" "),
  },
  {
    name: "Động vật & thiên nhiên",
    emojis: "🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐶 🐱 🐰 🦊 🐹 🐔 🐧 🐦 🦄 🐝 🦋 🐢 🐠 🌸 🌺 🌻 🌹 🌷 🌱 🌿 🍀 🍃 🌈 ☀️ 🌙 ⛅ 🌧️ ❄️".split(" "),
  },
  {
    name: "Hoạt động & đồ vật",
    emojis: "🚚 🛵 🚗 ✈️ 📦 🛒 🛍️ 💰 💵 💳 🧾 📄 📊 📈 📅 🗓️ 📱 💻 🖨️ 📷 🎵 🎶 ⚽ 🏀 🎮 🎯 🏠 🏪 🏭 🔑 🔔 💡".split(" "),
  },
];
