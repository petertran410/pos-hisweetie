import { Fragment, type ReactNode } from "react";

/**
 * Tập markdown nhỏ trợ lý viết: đoạn, danh sách gạch đầu dòng / đánh số, bảng, tiêu đề,
 * **đậm** và `code`. Tất cả thành phần tử React: chữ của model không bao giờ được hiểu là HTML,
 * link markdown để nguyên chữ. Riêng mã chứng từ POS thành link mở tab mới tới đúng trang.
 */

// Mã chứng từ POS → trang mở được theo mã (giống các link ?Code= sẵn có).
// BG / TV = tiền tố + id báo giá (backend sinh như vậy): BG mở trang báo giá theo id,
// TV (mẫu thư viện) chỉ xem trước được trong tab Thư viện.
const CODE = /(?<![A-Za-z0-9])(HD\d{4,}(?:\.\d+)?|DH\d{4,}|KH\d{4,}|LEAD\d{6}|BG\d{6}|TV\d{4})(?![A-Za-z0-9])/g;

export function codeHref(code: string): string | null {
  if (code.startsWith("HD")) return `/don-hang/hoa-don?Code=${encodeURIComponent(code)}`;
  if (code.startsWith("DH")) return `/don-hang/dat-hang?Code=${code}`;
  if (code.startsWith("KH")) return `/khach-hang?Code=${code}`;
  if (code.startsWith("LEAD")) return `/khach-hang/lead?Code=${code}`;
  if (code.startsWith("BG")) {
    const id = Number(code.slice(2));
    return id > 0 ? `/khach-hang/bao-gia/${id}` : null;
  }
  if (code.startsWith("TV")) return "/khach-hang/bao-gia?tab=library";
  return null;
}

function linkify(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(CODE);
  return parts.filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    const href = /^(HD|DH|KH|LEAD|BG|TV)\d/.test(part) ? codeHref(part) : null;
    if (!href) return <Fragment key={key}>{part}</Fragment>;
    return (
      <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-deep underline decoration-brand/40 underline-offset-2 hover:decoration-brand">
        {part}
      </a>
    );
  });
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={key} className="font-semibold">{linkify(part.slice(2, -2), key)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={key} className="rounded bg-gray-100 px-1 py-0.5 text-[0.92em]">{linkify(part.slice(1, -1), key)}</code>;
    return <Fragment key={key}>{linkify(part, key)}</Fragment>;
  });
}

const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
const isTableRule = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
// Ô số: "8.420.000", "12.500.000 đ", "15%", "-3,5" (bỏ dấu ** nếu model in đậm)
const isNumeric = (cell: string) => /^[-+−]?\d[\d.,\s]*\s?(đ|₫|%|vnđ|VNĐ)?$/.test(cell.replace(/\*\*/g, "").trim());
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

export function ChatMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!;
    const key = `b${index}`;
    if (!line.trim()) { index += 1; continue; }
    if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (index < lines.length && lines[index]!.trim().startsWith("|")) rows.push(lines[index++]!);
      const body = rows.filter((row) => !isTableRule(row)).map(cells);
      const [head, ...rest] = body;
      // Cột số (mọi ô có chữ đều là số) căn phải
      const width = Math.max(head?.length ?? 0, ...rest.map((row) => row.length));
      const numeric = Array.from({ length: width }, (_, i) => {
        const filled = rest.map((row) => row[i] ?? "").filter(Boolean);
        return filled.length > 0 && filled.every(isNumeric);
      });
      const align = (i: number) => (numeric[i] ? "text-right tabular-nums" : "text-left");
      blocks.push(
        <div className="max-w-full overflow-x-auto rounded-lg border border-brand-border" key={key}>
          <table className="w-full border-collapse text-[13px]">
            {head && (
              <thead>
                <tr>{head.map((cell, i) => <th key={i} className={`bg-gray-50 px-2 py-1.5 text-xs font-semibold text-gray-600 ${align(i)}`}>{inline(cell, `${key}h${i}`)}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {rest.map((row, r) => (
                <tr key={r}>{row.map((cell, i) => <td key={i} className={`border-t border-gray-100 px-2 py-1.5 align-top ${align(i)}`}>{inline(cell, `${key}r${r}c${i}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    let listed = false;
    for (const [pattern, Tag] of [[BULLET, "ul"], [NUMBERED, "ol"]] as const) {
      if (!pattern.test(line)) continue;
      const items: string[] = [];
      while (index < lines.length && pattern.test(lines[index]!)) items.push(lines[index++]!.replace(pattern, "$1"));
      blocks.push(
        <Tag key={key} className={`m-0 flex flex-col gap-1 pl-5 ${Tag === "ul" ? "list-disc" : "list-decimal"}`}>
          {items.map((item, i) => <li key={i}>{inline(item, `${key}i${i}`)}</li>)}
        </Tag>
      );
      listed = true;
      break;
    }
    if (listed) continue;
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push(<p className="m-0 font-semibold" key={key}>{inline(heading[1] ?? "", key)}</p>);
      index += 1;
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index]!.trim() &&
      !lines[index]!.trim().startsWith("|") &&
      !BULLET.test(lines[index]!) &&
      !NUMBERED.test(lines[index]!) &&
      !HEADING.test(lines[index]!)
    ) paragraph.push(lines[index++]!);
    blocks.push(
      <p className="m-0" key={key}>
        {paragraph.map((row, i) => <Fragment key={i}>{i > 0 && <br />}{inline(row, `${key}l${i}`)}</Fragment>)}
      </p>
    );
  }
  return <div className="flex flex-col gap-2 leading-relaxed">{blocks}</div>;
}
