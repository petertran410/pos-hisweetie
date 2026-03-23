"use client";

import { ReactNode } from "react";
import { useCan } from "@/lib/hooks/useCan";

interface CanProps {
  resource: string;
  action: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ resource, action, fallback = null, children }: CanProps) {
  const allowed = useCan(resource, action);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
