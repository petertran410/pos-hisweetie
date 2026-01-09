import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { noteTemplatesApi, NoteTemplate } from "../api/note-templates";
import { toast } from "sonner";

export const useNoteTemplates = () => {
  return useQuery({
    queryKey: ["noteTemplates"],
    queryFn: noteTemplatesApi.getNoteTemplates,
  });
};

export const useNoteTemplate = (id: number) => {
  return useQuery({
    queryKey: ["noteTemplate", id],
    queryFn: () => noteTemplatesApi.getNoteTemplate(id),
    enabled: !!id,
  });
};

export const useCreateNoteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: noteTemplatesApi.createNoteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["noteTemplates"] });
      toast.success("Tạo ghi chú thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể tạo ghi chú");
    },
  });
};

export const useUpdateNoteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      noteTemplatesApi.updateNoteTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["noteTemplates"] });
      toast.success("Cập nhật ghi chú thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể cập nhật ghi chú");
    },
  });
};

export const useDeleteNoteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: noteTemplatesApi.deleteNoteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["noteTemplates"] });
      toast.success("Xóa ghi chú thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể xóa ghi chú");
    },
  });
};
