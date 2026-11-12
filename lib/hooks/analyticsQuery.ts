import { useEffect, useState } from "react";
import {
  hashKey,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";

// Cấu hình chung cho các query báo cáo Phân tích:
//   • Gom các lần đổi bộ lọc liên tiếp (vd. tick 3 tháng) thành 1 request (400 ms).
//   • Giữ số liệu 5 phút (khớp cache 5 phút ở backend; nút "Làm mới" để lấy mới).
//   • Không tự gửi lại khi lỗi/timeout — báo cáo nặng, gửi lại chỉ làm DB tải gấp 3.

const DEBOUNCE_MS = 400;
const STALE_MS = 5 * 60_000;

/**
 * Trả về cặp (queryKey, queryFn) chỉ đổi sau khi key đứng yên DEBOUNCE_MS.
 * Lần đầu không chờ. queryFn đi cùng đúng key của nó (không lệch tham số).
 */
function useDebouncedQueryArgs<F>(queryKey: QueryKey, queryFn: F) {
  const hash = hashKey(queryKey);
  const [state, setState] = useState({ hash, queryKey, queryFn });
  useEffect(() => {
    if (hash === state.hash) return;
    const t = setTimeout(
      () => setState({ hash, queryKey, queryFn }),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
    // queryKey/queryFn của lần render có hash mới đi kèm nhau; không cần theo dõi riêng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, state.hash]);
  return state;
}

export function useAnalyticsQuery<TData>(
  options: UseQueryOptions<TData, Error, TData, QueryKey>,
) {
  const { queryKey, queryFn } = useDebouncedQueryArgs(
    options.queryKey,
    options.queryFn,
  );
  return useQuery<TData, Error, TData, QueryKey>({
    retry: false,
    ...options,
    staleTime: Math.max(
      typeof options.staleTime === "number" ? options.staleTime : 0,
      STALE_MS,
    ),
    queryKey,
    queryFn,
  });
}
