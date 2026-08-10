"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MessageCircle, Pencil, Send, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";
import { useCan } from "@/lib/hooks/useCan";
import {
  useCreateRecipeComment,
  useDeleteRecipeComment,
  useRecipeComments,
  useUpdateRecipeComment,
} from "@/lib/hooks/useRecipes";
import { useAuthStore } from "@/lib/store/auth";

export function RecipeComments({ recipeId, compact = false }: { recipeId: number; compact?: boolean }) {
  const { data: comments = [], isLoading } = useRecipeComments(recipeId);
  const createComment = useCreateRecipeComment(recipeId);
  const updateComment = useUpdateRecipeComment(recipeId);
  const deleteComment = useDeleteRecipeComment(recipeId);
  const canComment = useCan("recipes", "comment");
  const userId = useAuthStore((state) => state.user?.id);
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [comments.length]);

  const submit = async () => {
    const value = content.trim();
    if (!value) return;
    await createComment.mutateAsync(value);
    setContent("");
  };

  const remove = async (id: number) => {
    const result = await Swal.fire({
      title: "Xóa bình luận?",
      text: "Thao tác này không thể hoàn tác.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
    });
    if (result.isConfirmed) await deleteComment.mutateAsync(id);
  };

  return (
    <section className="rounded-xl border bg-white" style={{ borderColor: "var(--dt-border)" }}>
      <header className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--dt-border)" }}>
        <MessageCircle className="h-5 w-5 text-brand" />
        <h2 className="font-semibold text-[#0D3B42]">Comment ({comments.length})</h2>
      </header>
      <div className={`${compact ? "max-h-72" : "max-h-[420px]"} space-y-3 overflow-y-auto bg-[#f8fbfb] p-4`}>
        {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-brand" /></div>}
        {!isLoading && comments.length === 0 && <p className="py-6 text-center text-sm text-gray-500">Chưa có bình luận.</p>}
        {comments.map((comment) => {
          const mine = comment.authorId === userId;
          const editing = editingId === comment.id;
          return (
            <div key={comment.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border bg-white text-gray-700"}`} style={!mine ? { borderColor: "var(--dt-border)" } : undefined}>
                <div className={`mb-1 flex items-center gap-2 text-xs ${mine ? "text-cyan-100" : "text-gray-500"}`}>
                  <span className="font-medium">{comment.author.name}</span>
                  <span>{new Date(comment.createdAt).toLocaleString("vi-VN")}</span>
                </div>
                {editing ? (
                  <div className="flex items-end gap-2">
                    <textarea autoFocus rows={2} value={editingContent} onChange={(event) => setEditingContent(event.target.value)} className="min-w-48 flex-1 rounded-lg border px-2 py-1 text-gray-800 outline-none" />
                    <button type="button" aria-label="Lưu bình luận" onClick={async () => { const value = editingContent.trim(); if (!value) return; await updateComment.mutateAsync({ id: comment.id, content: value }); setEditingId(null); }}><Check className="h-4 w-4" /></button>
                    <button type="button" aria-label="Hủy sửa" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{comment.content}</p>
                )}
                {mine && canComment && !editing && (
                  <div className="mt-1 flex justify-end gap-2 text-cyan-100">
                    <button type="button" aria-label="Sửa bình luận" onClick={() => { setEditingId(comment.id); setEditingContent(comment.content); }}><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="Xóa bình luận" onClick={() => remove(comment.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t p-3" style={{ borderColor: "var(--dt-border)" }}>
        {canComment ? (
          <div className="flex items-end gap-2">
            <textarea
              rows={compact ? 1 : 2}
              maxLength={2000}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }}
              placeholder="Nhập bình luận..."
              className="min-h-11 flex-1 resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
              style={{ borderColor: "var(--dt-border)" }}
            />
            <button type="button" aria-label="Gửi bình luận" disabled={!content.trim() || createComment.isPending} onClick={submit} className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-white disabled:opacity-50">
              {createComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        ) : <p className="text-sm text-gray-500">Bạn không có quyền gửi bình luận.</p>}
      </div>
    </section>
  );
}
