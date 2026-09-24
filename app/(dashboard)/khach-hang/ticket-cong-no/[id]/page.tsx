import { redirect } from "next/navigation";

export default async function LegacyDebtTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/khach-hang/theo-doi-cong-no?ticketId=${encodeURIComponent(id)}`);
}
