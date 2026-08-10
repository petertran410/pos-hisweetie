"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import {
  Check,
  Loader2,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useDropdownPosition } from "@/components/ui/filters/useDropdownPosition";
import { useCategories } from "@/lib/hooks/useCategories";
import { useProducts } from "@/lib/hooks/useProducts";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import {
  useDeletePurchasingConfig,
  usePurchasingConfigs,
  useResolvedPurchasingConfig,
  useSavePurchasingConfig,
} from "@/lib/hooks/usePurchasingPlanning";
import {
  CONFIG_SOURCE_LABEL,
  PURCHASING_CONFIG_FIELDS,
  type PurchasingConfigField,
  type PurchasingConfigPatch,
  type PurchasingConfigEntity,
  type PurchasingConfigScope,
} from "@/lib/types/purchasing-planning";

const SCOPES: Array<{ value: PurchasingConfigScope; label: string }> = [
  { value: "GLOBAL", label: "GLOBAL" },
  { value: "CATEGORY", label: "CATEGORY" },
  { value: "SUPPLIER", label: "SUPPLIER" },
  { value: "SKU", label: "SKU" },
];

const FIELD_META: Record<
  PurchasingConfigField,
  { label: string; hint: string; step: string; min: number; integer?: boolean }
> = {
  leadTimeDays: {
    label: "Thời gian giao hàng",
    hint: "ngày",
    step: "1",
    min: 0,
    integer: true,
  },
  safetyDays: {
    label: "Số ngày dự phòng",
    hint: "ngày",
    step: "1",
    min: 0,
    integer: true,
  },
  coverageDays: {
    label: "Chu kỳ đặt hàng",
    hint: "ngày",
    step: "1",
    min: 1,
    integer: true,
  },
  growthFactor: {
    label: "Hệ số điều chỉnh",
    hint: "ví dụ 1.15",
    step: "0.01",
    min: 0,
  },
  moq: {
    label: "Đặt tối thiểu (MOQ)",
    hint: "đơn vị",
    step: "1",
    min: 1,
    integer: true,
  },
};

type FormValues = Record<PurchasingConfigField, string>;

interface Props {
  open: boolean;
  onClose: () => void;
  initialSku?: { id: number; code: string; name: string } | null;
}

export function PurchasingPlanningConfigModal({ open, onClose, initialSku }: Props) {
  const [scope, setScope] = useState<PurchasingConfigScope>(
    initialSku ? "SKU" : "GLOBAL"
  );
  const [entityId, setEntityId] = useState<number | undefined>(initialSku?.id);
  const [selectedEntity, setSelectedEntity] = useState<PurchasingConfigEntity | null>(
    initialSku ?? null
  );
  const [listSearch, setListSearch] = useState("");
  const [skuSearch, setSkuSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [debouncedSkuSearch, setDebouncedSkuSearch] = useState("");
  const [debouncedSupplierSearch, setDebouncedSupplierSearch] = useState("");
  const { register, reset, handleSubmit, formState } = useForm<FormValues>();

  const configsQuery = usePurchasingConfigs();
  const resolvedQuery = useResolvedPurchasingConfig(scope, entityId);
  const saveMutation = useSavePurchasingConfig();
  const deleteMutation = useDeletePurchasingConfig();

  const { data: suppliersResponse, isLoading: suppliersLoading } = useSuppliers({
    name: debouncedSupplierSearch,
    pageSize: 50,
    currentItem: 0,
    isActive: true,
  });
  const { data: productsResponse, isLoading: productsLoading } = useProducts(
    { search: debouncedSkuSearch, limit: 50, isActive: true },
    { enabled: open && scope === "SKU" }
  );
  const { data: childCategories } = useCategories("child", { enabled: open });

  useEffect(() => {
    const overrides = resolvedQuery.data?.overrides;
    if (!overrides) return;
    reset(
      Object.fromEntries(
        PURCHASING_CONFIG_FIELDS.map((field) => [
          field,
          overrides[field] === undefined ? "" : String(overrides[field]),
        ])
      ) as FormValues
    );
  }, [resolvedQuery.data, reset]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSkuSearch(skuSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [skuSearch]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSupplierSearch(supplierSearch.trim()),
      300
    );
    return () => clearTimeout(timer);
  }, [supplierSearch]);

  const entityOptions = useMemo(() => {
    if (scope === "CATEGORY") {
      return (childCategories ?? []).map((category) => ({
        value: String(category.id),
        label: category.name,
      }));
    }
    return [];
  }, [
    scope,
    childCategories,
  ]);

  const skuEntities = useMemo(
    () =>
      (productsResponse?.data ?? []).map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
      })),
    [productsResponse]
  );

  const supplierEntities = useMemo(
    () =>
      (suppliersResponse?.data ?? []).map((supplier) => ({
        id: supplier.id,
        code: supplier.code,
        name: supplier.name,
      })),
    [suppliersResponse]
  );

  const visibleConfigs = useMemo(() => {
    const query = listSearch.trim().toLowerCase();
    return (configsQuery.data?.groups ?? []).filter(
      (config) =>
        config.scopeType === scope &&
        (!query ||
          `${config.entity?.code ?? ""} ${config.entity?.name ?? "Toàn hệ thống"}`
            .toLowerCase()
            .includes(query))
    );
  }, [configsQuery.data, scope, listSearch]);

  if (!open || typeof document === "undefined") return null;

  const selectScope = (nextScope: PurchasingConfigScope) => {
    setScope(nextScope);
    setEntityId(undefined);
    setSelectedEntity(null);
    setListSearch("");
    setSkuSearch("");
    setSupplierSearch("");
    reset();
  };

  const onSubmit = handleSubmit(async (values) => {
    if (scope !== "GLOBAL" && entityId === undefined) {
      toast.error("Vui lòng chọn đối tượng cấu hình");
      return;
    }
    const configId = resolvedQuery.data?.configId ?? null;
    const isUpdate = configId !== null;
    const rawValues: PurchasingConfigPatch = {};
    for (const field of PURCHASING_CONFIG_FIELDS) {
      if (isUpdate && !formState.dirtyFields[field]) continue;
      const raw = values[field]?.trim();
      if (raw === "" || raw === undefined) {
        if (isUpdate && resolvedQuery.data?.overrides[field] !== undefined) {
          rawValues[field] = null;
        }
        continue;
      }
      rawValues[field] = Number(raw);
    }
    if (!Object.keys(rawValues).length) {
      toast.error(
        isUpdate ? "Không có thay đổi để lưu" : "Nhập ít nhất một giá trị override"
      );
      return;
    }
    try {
      await saveMutation.mutateAsync({
        configId,
        data: isUpdate
          ? rawValues
          : {
              scopeType: scope,
              ...(entityId === undefined ? {} : { scopeId: entityId }),
              ...rawValues,
            },
      });
      toast.success("Đã lưu cấu hình. Cần tính lại đề xuất để áp dụng giá trị mới.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không lưu được cấu hình");
    }
  });

  const resetField = async (field: PurchasingConfigField) => {
    const configId = resolvedQuery.data?.configId;
    if (!configId || resolvedQuery.data?.overrides[field] === undefined) return;
    try {
      await saveMutation.mutateAsync({ configId, data: { [field]: null } });
      toast.success(`Đã bỏ override ${FIELD_META[field].label}. Cần tính lại đề xuất.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không reset được cấu hình");
    }
  };

  const deleteConfig = async () => {
    const configId = resolvedQuery.data?.configId;
    if (!configId) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Xóa toàn bộ override?",
      text: "Đối tượng này sẽ quay về dùng cấu hình kế thừa.",
      showCancelButton: true,
      confirmButtonText: "Xóa cấu hình",
      cancelButtonText: "Bỏ qua",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteMutation.mutateAsync(configId);
      toast.success("Đã xóa cấu hình. Cần tính lại đề xuất.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xóa được cấu hình");
    }
  };

  const busy = saveMutation.isPending || deleteMutation.isPending;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pp-config-title"
        className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[88vh] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b px-4 py-3 sm:px-6">
          <div>
            <h2 id="pp-config-title" className="flex items-center gap-2 font-semibold text-gray-900">
              <Settings2 className="h-5 w-5 text-brand" /> Cấu hình dự kiến đặt hàng
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Override theo cấp. Quy cách đóng gói được lấy từ Product và không cấu hình tại đây.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 overflow-x-auto border-b px-3 sm:px-6">
          {SCOPES.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => selectScope(tab.value)}
              className={`border-b-2 px-4 py-3 text-sm font-medium ${
                scope === tab.value
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="max-h-56 overflow-y-auto border-b bg-gray-50 p-3 md:max-h-none md:border-r md:border-b-0">
            <input
              type="search"
              value={listSearch}
              onChange={(event) => setListSearch(event.target.value)}
              placeholder="Tìm override nhanh..."
              className="mb-3 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            />
            {configsQuery.isLoading ? (
              <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-brand" /></div>
            ) : configsQuery.isError ? (
              <p className="p-3 text-sm text-red-600">Không tải được danh sách cấu hình.</p>
            ) : !visibleConfigs.length ? (
              <p className="p-3 text-sm text-gray-500">Chưa có override ở cấp này.</p>
            ) : (
              <div className="space-y-2">
                {visibleConfigs.map((config) => (
                  <button
                    key={config.id}
                    type="button"
                    onClick={() => {
                      setEntityId(config.scopeId ?? undefined);
                      setSelectedEntity(config.entity);
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      resolvedQuery.data?.configId === config.id
                        ? "border-brand bg-brand-soft"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}>
                    <div className="truncate text-sm font-medium">
                      {config.entity?.code ? `${config.entity.code} · ` : ""}
                      {config.entity?.name ?? "Toàn hệ thống"}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(config.overrides).map(([field, value]) => (
                        <span key={field} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                          {FIELD_META[field as PurchasingConfigField].label}: {value}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {scope !== "GLOBAL" && (
                <div className="mb-5">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {scope === "CATEGORY" ? "Nhóm hàng" : scope === "SUPPLIER" ? "Nhà cung cấp" : "Sản phẩm"}
                  </label>
                  {scope === "SKU" || scope === "SUPPLIER" ? (
                    <AsyncConfigEntitySelect
                      selected={selectedEntity}
                      query={scope === "SKU" ? skuSearch : supplierSearch}
                      onQueryChange={scope === "SKU" ? setSkuSearch : setSupplierSearch}
                      options={scope === "SKU" ? skuEntities : supplierEntities}
                      loading={
                        scope === "SKU"
                          ? productsLoading || skuSearch.trim() !== debouncedSkuSearch
                          : suppliersLoading ||
                            supplierSearch.trim() !== debouncedSupplierSearch
                      }
                      onChange={(entity) => {
                        setSelectedEntity(entity);
                        setEntityId(entity?.id);
                      }}
                    />
                  ) : (
                    <SearchableSelect
                      options={entityOptions}
                      value={entityId === undefined ? "" : String(entityId)}
                      onChange={(value) => {
                        const nextId = value ? Number(value) : undefined;
                        setEntityId(nextId);
                        const option = (childCategories ?? []).find(
                          (category) => category.id === nextId
                        );
                        setSelectedEntity(option ?? null);
                      }}
                      placeholder="Chọn đối tượng..."
                      searchPlaceholder="Tìm theo tên..."
                      clearable
                    />
                  )}
                </div>
              )}

              {resolvedQuery.isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
              ) : resolvedQuery.isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Không tải được cấu hình effective của đối tượng.
                </div>
              ) : resolvedQuery.data ? (
                <div className="space-y-3">
                  {PURCHASING_CONFIG_FIELDS.map((field) => {
                    const effective = resolvedQuery.data.fields[field];
                    const hasOverride = resolvedQuery.data.overrides[field] !== undefined;
                    return (
                      <div key={field} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_180px_150px_auto] sm:items-center">
                        <div>
                          <label htmlFor={`pp-${field}`} className="text-sm font-medium text-gray-800">
                            {FIELD_META[field].label}
                          </label>
                          <div className="text-xs text-gray-400">{FIELD_META[field].hint}</div>
                        </div>
                        <div>
                          <div className="mb-1 text-[10px] font-medium tracking-wide text-gray-400 uppercase">Raw override</div>
                          <input
                            id={`pp-${field}`}
                            type="number"
                            step={FIELD_META[field].step}
                            min={FIELD_META[field].min}
                            placeholder="Kế thừa"
                            {...register(field, {
                              validate: (value) => {
                                if (value === "") return true;
                                const numeric = Number(value);
                                if (
                                  !Number.isFinite(numeric) ||
                                  numeric < FIELD_META[field].min
                                ) {
                                  return `Giá trị phải ≥ ${FIELD_META[field].min}`;
                                }
                                if (
                                  FIELD_META[field].integer &&
                                  !Number.isInteger(numeric)
                                ) {
                                  return "Giá trị phải là số nguyên";
                                }
                                return true;
                              },
                            })}
                            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
                          />
                          {formState.errors[field] && (
                            <p className="mt-1 text-xs text-red-600">{formState.errors[field]?.message}</p>
                          )}
                        </div>
                        <div>
                          <div className="mb-1 text-[10px] font-medium tracking-wide text-gray-400 uppercase">Effective</div>
                          {effective ? (
                            <>
                              <div className="text-sm font-semibold tabular-nums">
                                {effective.value.toLocaleString("vi-VN")}
                              </div>
                              <div className="truncate text-[11px] text-gray-500">
                                {effective.inherited ? "Kế thừa" : "Override"} · {CONFIG_SOURCE_LABEL[effective.source]} · {effective.sourceLabel}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-gray-400">
                              Chưa có dữ liệu effective/source
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          title="Bỏ override field này"
                          disabled={!hasOverride || busy}
                          onClick={() => resetField(field)}
                          className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35">
                          <RotateCcw className="h-3.5 w-3.5" /> Reset
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : scope !== "GLOBAL" && entityId === undefined ? (
                <div className="rounded-xl border border-dashed p-10 text-center text-sm text-gray-500">
                  Chọn một đối tượng để xem raw override, effective value và nguồn kế thừa.
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-gray-50 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={deleteConfig}
                disabled={!resolvedQuery.data?.configId || busy}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-35">
                <Trash2 className="h-4 w-4" /> Xóa override
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-100">
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={!resolvedQuery.data || busy}
                  className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface AsyncConfigEntitySelectProps {
  selected: PurchasingConfigEntity | null;
  query: string;
  onQueryChange: (query: string) => void;
  options: PurchasingConfigEntity[];
  loading: boolean;
  onChange: (entity: PurchasingConfigEntity | null) => void;
}

function AsyncConfigEntitySelect({
  selected,
  query,
  onQueryChange,
  options,
  loading,
  onChange,
}: AsyncConfigEntitySelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const position = useDropdownPosition(open, triggerRef, 320);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const label = selected
    ? `${selected.code ? `${selected.code} · ` : ""}${selected.name}`
    : "Chọn đối tượng...";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm hover:border-gray-400">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <span className={`min-w-0 flex-1 truncate ${selected ? "text-gray-900" : "text-gray-400"}`}>
          {label}
        </span>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Bỏ chọn"
            onClick={(event) => {
              event.stopPropagation();
              onChange(null);
              onQueryChange("");
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              onChange(null);
              onQueryChange("");
            }}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-4 w-4" />
          </span>
        )}
      </button>

      {open && position &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            className="fixed z-[10000] flex flex-col overflow-hidden rounded-xl border bg-white shadow-xl"
            style={{
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              ...(position.dropUp
                ? { top: position.top, transform: "translateY(-100%)" }
                : { top: position.top }),
            }}>
            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setOpen(false);
                      triggerRef.current?.focus();
                    }
                  }}
                  placeholder="Nhập mã hoặc tên..."
                  className="w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
                />
              </div>
            </div>

            <div className="overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm...
                </div>
              ) : options.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-gray-500">
                  Không tìm thấy kết quả
                </div>
              ) : (
                options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={selected?.id === option.id}
                    onClick={() => {
                      onChange(option);
                      onQueryChange("");
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 border-b border-gray-50 px-3 py-2.5 text-left hover:bg-gray-50 ${
                      selected?.id === option.id ? "bg-brand-soft" : ""
                    }`}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-800">
                        {option.name}
                      </div>
                      {option.code && (
                        <div className="truncate text-xs text-gray-500">
                          {option.code}
                        </div>
                      )}
                    </div>
                    {selected?.id === option.id && (
                      <Check className="h-4 w-4 shrink-0 text-brand" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
