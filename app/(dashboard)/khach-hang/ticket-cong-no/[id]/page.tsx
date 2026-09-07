import { redirect } from "next/navigation";

export default function LegacyDebtTicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/khach-hang/theo-doi-cong-no?ticketId=${encodeURIComponent(params.id)}`);
}
