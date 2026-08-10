"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Search, X } from "lucide-react";
import type { SemiFinishedRecipeOption } from "@/lib/api/recipes";
import { useSemiFinishedRecipeOptions } from "@/lib/hooks/useRecipes";
import { useDropdownPosition } from "@/components/ui/filters/useDropdownPosition";

export function RecipeReferencePicker({ selected, excludeId, disabled, onChange }: { selected?: SemiFinishedRecipeOption; excludeId?: number; disabled?: boolean; onChange: (recipe?: SemiFinishedRecipeOption) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const pos = useDropdownPosition(open, triggerRef, 300, 400);
  const { data: options = [], isFetching } = useSemiFinishedRecipeOptions(query || undefined, excludeId, open);
  const pending = input.trim() !== query;

  useEffect(() => { const timer = setTimeout(() => { setQuery(input.trim()); setHighlightedIndex(-1); }, 300); return () => clearTimeout(timer); }, [input]);
  useEffect(() => { const close = (event: MouseEvent) => { const target = event.target as Node; if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  useEffect(() => {
    itemRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const select = (recipe: SemiFinishedRecipeOption) => { onChange(recipe); setInput(""); setQuery(""); setOpen(false); };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { event.preventDefault(); if (input) setInput(""); else setOpen(false); return; }
    if (!open || pending || isFetching || !options.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setHighlightedIndex((index) => Math.min(index + 1, options.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setHighlightedIndex((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && highlightedIndex >= 0) { event.preventDefault(); select(options[highlightedIndex]); }
  };

  return <div ref={rootRef} className="relative"><div ref={triggerRef} className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input disabled={disabled} value={open ? input : selected ? `${selected.code} - ${selected.name}` : ""} onFocus={() => { setInput(""); setQuery(""); setOpen(true); }} onChange={(event) => { setInput(event.target.value); setOpen(true); }} onKeyDown={onKeyDown} role="combobox" aria-expanded={open} aria-controls={listboxId} aria-autocomplete="list" aria-label="Tìm công thức bán thành phẩm" placeholder="Tìm mã hoặc tên công thức..." className="w-full rounded-lg border bg-white py-2 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-50 disabled:text-gray-500" style={{ borderColor: "var(--dt-border)" }} />{!disabled && selected && !open && <button type="button" onClick={() => onChange(undefined)} aria-label="Bỏ chọn bán thành phẩm" className="absolute right-2 top-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button>}</div>{open && !disabled && pos && typeof document !== "undefined" && createPortal(<div id={listboxId} ref={panelRef} role="listbox" className="fixed z-[1000] overflow-y-auto rounded-xl border bg-white shadow-xl" style={{ left: pos.left, width: pos.width, maxHeight: pos.maxHeight, borderColor: "var(--dt-border)", ...(pos.dropUp ? { top: pos.top, transform: "translateY(-100%)" } : { top: pos.top }) }}>{selected && !input.trim() && <div className="border-b bg-cyan-50/60 px-3 py-2 text-xs font-medium text-[#3A6B74]" style={{ borderColor: "var(--dt-border)" }}>Đang chọn: {selected.code} - {selected.name}</div>}{(pending || isFetching) ? <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin text-brand" />Đang tìm công thức...</div> : options.length === 0 ? <div className="px-3 py-8 text-center text-sm text-gray-500">Không tìm thấy bán thành phẩm</div> : options.map((option, index) => <button key={option.id} ref={(element) => { itemRefs.current[index] = element; }} type="button" role="option" aria-selected={option.id === selected?.id} onMouseEnter={() => setHighlightedIndex(index)} onClick={() => select(option)} className={`flex w-full items-center justify-between gap-3 border-b px-3 py-2.5 text-left last:border-0 ${index === highlightedIndex ? "bg-cyan-50" : "hover:bg-gray-50"}`} style={{ borderColor: "var(--dt-border)" }}><span className="min-w-0"><span className="block truncate text-sm font-medium text-gray-900">{option.name}</span><span className="font-mono text-xs text-gray-500">{option.code}</span></span>{option.id === selected?.id && <Check className="h-4 w-4 shrink-0 text-brand" />}</button>)}</div>, document.body)}</div>;
}
