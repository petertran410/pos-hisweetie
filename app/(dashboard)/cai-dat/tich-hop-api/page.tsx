"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  ShieldAlert,
  Webhook,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import type {
  PublicApiClientItem,
  PublicApiClientWithSecret,
} from "@/lib/api/publicApiClients";
import {
  useCreatePublicApiClient,
  usePublicApiClients,
  useRotatePublicApiSecret,
  useSetPublicApiClientActive,
} from "@/lib/hooks/usePublicApiClients";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function copy(value: string, label: string) {
  navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`Đã sao chép ${label}`))
    .catch(() => toast.error("Không thể sao chép. Hãy sao chép thủ công."));
}

function SecretDialog({
  value,
  onClose,
}: {
  value: PublicApiClientWithSecret;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  // Raw secret chỉ tồn tại trong state của dialog. Đóng dialog là bỏ khỏi DOM/state.
  useEffect(() => () => setVisible(false), []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Lưu Client Secret ngay</h2>
              <p className="mt-1 text-sm text-gray-600">
                Secret chỉ hiển thị một lần. Đóng cửa sổ này thì không thể xem lại,
                chỉ có thể cấp secret mới.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <CredentialField label="Client ID" value={value.clientId} />
          <CredentialField label="Client Secret" value={value.clientSecret} secret visible={visible} onToggle={() => setVisible((v) => !v)} />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">
            Tôi đã lưu an toàn
          </button>
        </div>
      </div>
    </div>
  );
}

function CredentialField({
  label,
  value,
  secret = false,
  visible = true,
  onToggle,
}: {
  label: string;
  value: string;
  secret?: boolean;
  visible?: boolean;
  onToggle?: () => void;
}) {
  const shown = secret && !visible ? "•".repeat(Math.min(value.length, 36)) : value;
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 p-2">
        <code className="min-w-0 flex-1 break-all px-1 text-sm text-gray-900">{shown}</code>
        {secret && (
          <button onClick={onToggle} className="rounded p-1.5 text-gray-600 hover:bg-gray-200" aria-label={visible ? "Ẩn secret" : "Hiện secret"}>
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <button onClick={() => copy(value, label)} className="rounded p-1.5 text-gray-600 hover:bg-gray-200" aria-label={`Sao chép ${label}`}>
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (client: PublicApiClientWithSecret) => void }) {
  const create = useCreatePublicApiClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ttl, setTtl] = useState("3600");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return toast.error("Nhập tên tích hợp");
    const seconds = Number(ttl);
    if (!Number.isInteger(seconds) || seconds < 300 || seconds > 86400) {
      return toast.error("Token TTL phải từ 300 đến 86400 giây");
    }
    const result = await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined, accessTokenTtl: seconds }) as any;
    onCreated(result.data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Tạo OAuth Client</h2>
            <p className="mt-1 text-sm text-gray-600">Dùng cho Zalo CRM, website hoặc đối tác khác.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Tên tích hợp <span className="text-red-600">*</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Zalo CRM" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Mô tả
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mục đích sử dụng client này" className="mt-1.5 min-h-20 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Thời hạn Access Token (giây)
            <input type="number" min={300} max={86400} value={ttl} onChange={(e) => setTtl(e.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand" />
            <span className="mt-1 block text-xs font-normal text-gray-500">Mặc định 3600 giây (60 phút).</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Huỷ</button>
          <button disabled={create.isPending} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Tạo client
          </button>
        </div>
      </form>
    </div>
  );
}

function ClientRow({ client, onSecret }: { client: PublicApiClientItem; onSecret: (client: PublicApiClientWithSecret) => void }) {
  const setActive = useSetPublicApiClientActive();
  const rotate = useRotatePublicApiSecret();

  const toggle = async () => {
    const verb = client.isActive ? "tắt" : "bật";
    const result = await Swal.fire({
      title: `${verb[0].toUpperCase()}${verb.slice(1)} OAuth client?`,
      text: client.isActive
        ? "Token đã cấp cũng sẽ mất quyền gọi Public API ngay lập tức."
        : "Client sẽ có thể lấy token mới và gọi Public API.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `${verb[0].toUpperCase()}${verb.slice(1)} client`,
      cancelButtonText: "Huỷ",
      confirmButtonColor: client.isActive ? "#dc2626" : "#16a34a",
    });
    if (result.isConfirmed) await setActive.mutateAsync({ id: client.id, isActive: !client.isActive });
  };

  const rotateSecret = async () => {
    const result = await Swal.fire({
      title: "Cấp Client Secret mới?",
      html: "Secret cũ sẽ <strong>mất hiệu lực ngay</strong>. Cập nhật secret mới ở tất cả hệ thống đang dùng client này.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Cấp secret mới",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    const response = await rotate.mutateAsync(client.id) as any;
    onSecret(response.data);
  };

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="px-4 py-4">
        <div className="font-medium text-gray-900">{client.name}</div>
        {client.description && <div className="mt-1 max-w-xs text-xs text-gray-500">{client.description}</div>}
      </td>
      <td className="px-4 py-4"><CredentialField label="" value={client.clientId} /></td>
      <td className="px-4 py-4 text-sm text-gray-600">{Math.round(client.accessTokenTtl / 60)} phút</td>
      <td className="px-4 py-4">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${client.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {client.isActive ? "Đang hoạt động" : "Đã tắt"}
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-gray-600"><span className="inline-flex items-center gap-1"><Webhook className="h-3.5 w-3.5" />{client.webhookCount}</span></td>
      <td className="px-4 py-4 text-sm text-gray-500">{formatDate(client.createdAt)}</td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={rotateSecret} disabled={rotate.isPending} title="Cấp Client Secret mới" className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {rotate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
          <button onClick={toggle} disabled={setActive.isPending} title={client.isActive ? "Tắt client" : "Bật client"} className={`rounded-lg border p-2 disabled:opacity-50 ${client.isActive ? "border-red-200 text-red-700 hover:bg-red-50" : "border-green-200 text-green-700 hover:bg-green-50"}`}>
            {setActive.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function PublicApiClientsPage() {
  const clients = usePublicApiClients();
  const [showCreate, setShowCreate] = useState(false);
  const [secret, setSecret] = useState<PublicApiClientWithSecret | null>(null);

  return (
    <PagePermissionGuard resource="settings" action="update">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-gray-900"><KeyRound className="h-6 w-6 text-brand" /><h1 className="text-2xl font-bold">Tích hợp API</h1></div>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">Tạo OAuth client cho Zalo CRM, website và các hệ thống đối tác. Client Secret chỉ hiển thị một lần.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"><Plus className="h-4 w-4" />Tạo OAuth Client</button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {clients.isLoading ? <div className="flex items-center justify-center gap-2 p-16 text-gray-500"><Loader2 className="h-5 w-5 animate-spin" />Đang tải OAuth client...</div> : clients.isError ? <div className="p-8 text-center text-red-600">Không thể tải danh sách OAuth client.</div> : clients.data?.data.length === 0 ? <div className="p-16 text-center"><KeyRound className="mx-auto h-10 w-10 text-gray-300" /><h2 className="mt-3 font-medium text-gray-900">Chưa có OAuth client</h2><p className="mt-1 text-sm text-gray-500">Tạo client đầu tiên để kết nối Zalo CRM hoặc website.</p></div> : <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Tích hợp</th><th className="px-4 py-3">Client ID</th><th className="px-4 py-3">Token</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Webhook</th><th className="px-4 py-3">Tạo lúc</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead><tbody>{clients.data?.data.map((client) => <ClientRow key={client.id} client={client} onSecret={setSecret} />)}</tbody></table></div>}
        </div>

        <p className="mt-4 text-xs text-gray-500"><Check className="mr-1 inline h-3.5 w-3.5 text-green-600" />Không có xoá client: chỉ bật/tắt để giữ lịch sử audit, webhook và đối soát.</p>
      </div>
      {showCreate && <CreateDialog onClose={() => setShowCreate(false)} onCreated={(client) => { setShowCreate(false); setSecret(client); }} />}
      {secret && <SecretDialog value={secret} onClose={() => setSecret(null)} />}
    </PagePermissionGuard>
  );
}
