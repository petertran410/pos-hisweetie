import type { LeadCategory, LeadSource, LeadStatus } from "./lead";

export type LeadFormFieldType = "text" | "textarea" | "select" | "multiselect";

/** Trường Lead có sẵn (key cố định) hoặc câu hỏi thêm (key "q_…"). */
export interface LeadFormField {
  key: string;
  label: string;
  enabled: boolean;
  required: boolean;
  type?: LeadFormFieldType;
  options?: string[];
}

export interface LeadForm {
  id: number;
  slug: string;
  name: string;
  title: string;
  description: string | null;
  fields: LeadFormField[];
  source: LeadSource;
  channelPid: string | null;
  channelName: string | null;
  category: LeadCategory | null;
  cskhUserId: number | null;
  cskhUserName: string | null;
  successMessage: string | null;
  isActive: boolean;
  submissionCount: number;
  createdByName: string | null;
  createdAt: string;
}

export type LeadFormInput = Partial<
  Omit<LeadForm, "id" | "cskhUserName" | "submissionCount" | "createdByName" | "createdAt" | "category">
> & { category?: LeadCategory | "" };

export interface LeadFormAnswer {
  key: string;
  label: string;
  value: string;
}

export interface LeadFormSubmission {
  id: number;
  answers: LeadFormAnswer[];
  merged: boolean;
  createdAt: string;
  lead: { id: number; name: string; status: LeadStatus } | null;
}

/** Form công khai (chỉ trường đang bật) cho khách điền. */
export interface PublicLeadForm {
  slug: string;
  title: string;
  description: string | null;
  fields: Omit<LeadFormField, "enabled">[];
}
