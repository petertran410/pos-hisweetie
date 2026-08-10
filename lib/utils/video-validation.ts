"use client";

import { toast } from "sonner";

export const VIDEO_ALLOWED_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
] as const;

export const VIDEO_MAX_DURATION_SECONDS = 5 * 60; // 5 phút
export const VIDEO_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB - trùng với backend

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds - minutes * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const readVideoDuration = (file: File): Promise<number | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (video.duration === Infinity || Number.isNaN(video.duration)) {
        resolve(null);
      } else {
        resolve(video.duration);
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });

export interface VideoValidationResult {
  file: File;
  duration: number | null;
}

export interface VideoValidationFailure {
  file: File;
  reason: string;
}

const isAllowedVideoMime = (mime: string) =>
  VIDEO_ALLOWED_MIMES.includes(mime as (typeof VIDEO_ALLOWED_MIMES)[number]);

export async function filterVideoFiles(
  files: File[],
): Promise<{ accepted: VideoValidationResult[]; rejected: VideoValidationFailure[] }> {
  const accepted: VideoValidationResult[] = [];
  const rejected: VideoValidationFailure[] = [];

  for (const file of files) {
    const mime = file.type.toLowerCase();
    if (!isAllowedVideoMime(mime)) {
      rejected.push({
        file,
        reason: `Định dạng "${mime || "không rõ"}" không được hỗ trợ. Chỉ chấp nhận MP4, WebM, MOV, M4V.`,
      });
      continue;
    }
    if (file.size > VIDEO_MAX_SIZE_BYTES) {
      rejected.push({
        file,
        reason: `Dung lượng ${(file.size / 1024 / 1024).toFixed(1)}MB vượt quá giới hạn 50MB.`,
      });
      continue;
    }
    const duration = await readVideoDuration(file);
    if (duration != null && duration > VIDEO_MAX_DURATION_SECONDS) {
      rejected.push({
        file,
        reason: `Video dài ${formatDuration(duration)} vượt quá giới hạn ${VIDEO_MAX_DURATION_SECONDS / 60} phút.`,
      });
      continue;
    }
    accepted.push({ file, duration });
  }

  if (rejected.length) {
    const firstReason = rejected[0]?.reason;
    const summary = rejected.length === 1 && firstReason
      ? firstReason
      : `${rejected.length} video không hợp lệ.`;
    toast.error(summary);
  }

  return { accepted, rejected };
}