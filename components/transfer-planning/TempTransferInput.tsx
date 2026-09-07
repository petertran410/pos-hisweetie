"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { transferPlanningApi } from "@/lib/api/transfer-planning";

interface TempTransferInputProps {
  productId: number;
  quantity: number;
}

export function TempTransferInput({
  productId,
  quantity,
}: TempTransferInputProps) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(String(quantity));
  const [isSaving, setIsSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const desiredRef = useRef(quantity);
  const savedRef = useRef(quantity);
  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!savingRef.current && desiredRef.current === savedRef.current) {
      savedRef.current = quantity;
      desiredRef.current = quantity;
      setValue(isFocused && quantity === 0 ? "" : String(quantity));
    }
  }, [quantity, isFocused]);

  const persist = useCallback(async () => {
    if (savingRef.current || desiredRef.current === savedRef.current) return;
    const sent = desiredRef.current;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await transferPlanningApi.saveTempQuantity(productId, sent);
      savedRef.current = sent;
      queryClient.invalidateQueries({ queryKey: ["transfer-temp-quantities"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-planning"] });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu Tạm chuyển",
      );
      if (desiredRef.current === sent) {
        desiredRef.current = savedRef.current;
        setValue(String(savedRef.current));
      }
    } finally {
      savingRef.current = false;
      setIsSaving(false);
      if (desiredRef.current !== savedRef.current) void persist();
    }
  }, [productId, queryClient]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void persist(), 600);
  }, [persist]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (desiredRef.current !== savedRef.current) void persist();
    },
    [persist],
  );

  return (
    <div
      className="relative ml-auto w-[92px]"
      onClick={(event) => event.stopPropagation()}
    >
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onFocus={() => {
          setIsFocused(true);
          if (desiredRef.current === 0) {
            setValue("");
          }
        }}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "") {
            desiredRef.current = 0;
            setValue("");
            scheduleSave();
            return;
          }
          const digits = raw.replace(/\D/g, "");
          const next = digits === "" ? 0 : Number.parseInt(digits, 10);
          if (!Number.isSafeInteger(next) || next < 0) return;
          setValue(digits);
          desiredRef.current = next;
          scheduleSave();
        }}
        onBlur={() => {
          setIsFocused(false);
          if (timerRef.current) clearTimeout(timerRef.current);
          if (desiredRef.current === 0) {
            setValue("0");
          } else {
            setValue(String(desiredRef.current));
          }
          void persist();
        }}
        aria-label="Tạm chuyển"
        className={`h-8 w-full rounded-md border border-gray-300 bg-white px-2 pr-7 text-right font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary ${
          desiredRef.current === 0 && !isFocused
            ? "text-gray-400"
            : "text-gray-900"
        }`}
      />
      {isSaving && (
        <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-gray-400" />
      )}
    </div>
  );
}
