// Logo Messenger / Facebook (path từ Simple Icons — CC0)
const MESSENGER =
  "M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.38-.16-3.47-.46a.96.96 0 00-.64.05l-2.39 1.05a.96.96 0 01-1.35-.85l-.07-2.14a.97.97 0 00-.32-.68A11.39 11.389 0 01.002 11.64zm8.32-2.19l-3.52 5.6c-.35.53.32 1.139.82.75l3.79-2.87c.26-.2.6-.2.87 0l2.8 2.1c.84.63 2.04.4 2.6-.48l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87c-.25.2-.6.2-.86 0l-2.8-2.1a1.8 1.8 0 00-2.61.48z";
const FACEBOOK =
  "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z";

/** Logo Messenger (tin nhắn) hoặc Facebook (bình luận bài viết). */
export function ThreadKindLogo({ isComment, className = "h-3.5 w-3.5" }: { isComment?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={isComment ? "#1877F2" : "#0084FF"} aria-hidden="true">
      <path d={isComment ? FACEBOOK : MESSENGER} />
    </svg>
  );
}

/**
 * Loại hội thoại Facebook: tin nhắn Messenger hoặc bình luận bài viết. Kênh khác không hiện gì.
 * Đặt góc dưới phải avatar (cha cần `relative`).
 */
export function ThreadKindIcon({ platform, isComment }: { platform?: string; isComment?: boolean }) {
  if (platform !== "facebook") return null;
  return (
    <span
      title={isComment ? "Bình luận bài viết Facebook" : "Tin nhắn Messenger"}
      className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white ring-1 ring-white">
      <ThreadKindLogo isComment={isComment} />
    </span>
  );
}
