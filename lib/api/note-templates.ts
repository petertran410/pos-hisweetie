import { apiClient } from "../config/api";

export interface NoteTemplate {
  id: number;
  content: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const noteTemplatesApi = {
  getNoteTemplates: (): Promise<NoteTemplate[]> => {
    return apiClient.get("/note-templates");
  },

  getNoteTemplate: (id: number): Promise<NoteTemplate> => {
    return apiClient.get(`/note-templates/${id}`);
  },

  createNoteTemplate: (data: {
    content: string;
    sortOrder?: number;
  }): Promise<NoteTemplate> => {
    return apiClient.post("/note-templates", data);
  },

  updateNoteTemplate: (
    id: number,
    data: { content: string; sortOrder?: number }
  ): Promise<NoteTemplate> => {
    return apiClient.put(`/note-templates/${id}`, data);
  },

  deleteNoteTemplate: (id: number): Promise<void> => {
    return apiClient.delete(`/note-templates/${id}`);
  },
};
