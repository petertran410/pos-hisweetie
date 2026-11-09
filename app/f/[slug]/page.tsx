import type { Metadata } from "next";
import { PublicLeadForm } from "./PublicLeadForm";

export const metadata: Metadata = { title: "Đăng ký thông tin", robots: { index: false } };

/** Form thu thập lead công khai: /f/<slug> (nhúng iframe: ?embed=1). */
export default async function LeadFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const [{ slug }, { embed }] = await Promise.all([params, searchParams]);
  return <PublicLeadForm slug={slug} embed={embed === "1"} />;
}
