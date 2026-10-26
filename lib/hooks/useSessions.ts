import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionsApi } from "@/lib/api/sessions";

const MY_KEY = ["auth-sessions", "me"] as const;
const userKey = (userId: number) => ["auth-sessions", "user", userId] as const;

export function useMySessions() {
  return useQuery({
    queryKey: MY_KEY,
    queryFn: sessionsApi.listMine,
    refetchOnWindowFocus: true,
  });
}

export function useRevokeMySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sessionsApi.revokeMine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MY_KEY }),
  });
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sessionsApi.revokeOthers(),
    onSuccess: () => qc.invalidateQueries({ queryKey: MY_KEY }),
  });
}

export function useUserSessions(userId: number | null, enabled = true) {
  return useQuery({
    queryKey: userKey(userId ?? 0),
    queryFn: () => sessionsApi.listOfUser(userId!),
    enabled: enabled && !!userId,
  });
}

export function useRevokeUserSession(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) =>
      sessionsApi.revokeOfUser(userId, sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKey(userId) }),
  });
}

export function useRevokeAllUserSessions(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sessionsApi.revokeAllOfUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKey(userId) }),
  });
}
