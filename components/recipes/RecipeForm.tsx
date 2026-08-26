"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  AlertCircle,
  Beaker,
  ClipboardList,
  EyeOff,
  Film,
  FlaskConical,
  GripVertical,
  Info,
  MessageCircle,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  RecipeIngredientPayload,
  RecipeMediaPayload,
  RecipePayload,
  RecipeStepPayload,
  RecipeType,
  recipesApi,
} from "@/lib/api/recipes";
import {
  useCreateRecipe,
  useCreateRecipeCategory,
  usePublishRecipe,
  useRecipe,
  useRecipeCategories,
  useUnpublishRecipe,
  useUpdateRecipe,
} from "@/lib/hooks/useRecipes";
import { useCan } from "@/lib/hooks/useCan";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { RecipeComments } from "@/components/recipes/RecipeComments";
import { RecipeProductPicker } from "@/components/recipes/RecipeProductPicker";
import { RecipeReferencePicker } from "@/components/recipes/RecipeReferencePicker";
import { filterVideoFiles, VIDEO_ALLOWED_MIMES } from "@/lib/utils/video-validation";

interface Props {
  mode: "create" | "edit";
  recipeId?: number;
  initialForm?: RecipePayload;
  initialDirty?: boolean;
  workspaceTabs?: ReactNode;
  workspaceStatus?: ReactNode;
  registerSave?: (handler: () => void) => void;
  onFormChange?: (form: RecipePayload) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onSaveSuccess?: (recipeId: number) => void;
  onLeave?: () => void;
}

interface FormErrors {
  name?: string;
  quantity?: string;
  unit?: string;
  ingredients?: Record<number, string>;
}

type Tab = "info" | "recipe" | "comment";

export const createEmptyRecipeForm = (): RecipePayload => ({
  code: "",
  name: "",
  type: "FINISHED_PRODUCT",
  categoryId: null,
  outputProductId: null,
  description: "",
  quantity: 1,
  quantityUnit: "ml",
  unit: "ly",
  storage: "",
  ingredients: [],
  steps: [],
  media: [],
});

const inputClass =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-50 disabled:text-gray-500";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";
const INGREDIENT_UNITS = ["ml", "gram", "lát", "quả"] as const;
const normalizeIngredientUnit = (unit?: string | null) => {
  const normalized = unit?.trim().toLowerCase();
  if (normalized === "g" || normalized === "gr") return "gram";
  return INGREDIENT_UNITS.find((option) => option === normalized) || "gram";
};
const money = (value?: number | null) =>
  value == null
    ? "—"
    : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(Number(value)))}đ`;
const ingredientUnitCost = (row: RecipeIngredientPayload) => {
  if (row.includeInCost === false) return null;
  if (row.sourceType === "CUSTOM") return Number(row.customPrice || 0);
  if (row.sourceType === "PRODUCT") {
    return row.product?.unitCost == null ? null : Number(row.product.unitCost);
  }
  if (row.unitCostSnapshot != null) return Number(row.unitCostSnapshot);
  if (row.recipeReference?.costPerOutputUnit != null) return Number(row.recipeReference.costPerOutputUnit);
  return null;
};
const ingredientLineCost = (row: RecipeIngredientPayload) => {
  const unitCost = ingredientUnitCost(row);
  return unitCost == null ? null : unitCost * Number(row.quantity || 0);
};
const totalIngredientCost = (ingredients: RecipeIngredientPayload[]) =>
  ingredients.reduce((total, row) => total + (ingredientLineCost(row) || 0), 0);
const totalIngredientQuantities = (ingredients: RecipeIngredientPayload[]) => {
  const totals = new Map<string, number>();
  for (const row of ingredients) {
    const unit = normalizeIngredientUnit(row.unit || row.customUnit);
    totals.set(unit, (totals.get(unit) || 0) + Number(row.quantity || 0));
  }
  return Array.from(
    totals,
    ([unit, quantity]) =>
      `${new Intl.NumberFormat("vi-VN").format(quantity)} ${unit}`,
  ).join(" · ");
};

export function RecipeForm({
  mode,
  recipeId,
  initialForm,
  initialDirty = false,
  workspaceTabs,
  workspaceStatus,
  registerSave,
  onFormChange,
  onDirtyChange,
  onSaveSuccess,
  onLeave,
}: Props) {
  const router = useRouter();
  const {
    data: existing,
    isLoading,
    isError,
    refetch,
  } = useRecipe(mode === "edit" ? recipeId : undefined);
  const { data: categories = [] } = useRecipeCategories();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const publishRecipe = usePublishRecipe();
  const unpublishRecipe = useUnpublishRecipe();
  const createCategory = useCreateRecipeCategory();
  const canUpdate = useCan("recipes", "update");
  const canPublish = useCan("recipes", "publish");
  const canViewCost = useCan("recipes", "view_cost");
  const editable = mode === "create" || canUpdate;
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [form, setForm] = useState<RecipePayload>(() =>
    initialForm ? initialForm : createEmptyRecipeForm(),
  );
  const [isDirty, setIsDirty] = useState(initialDirty);
  const [publishing, setPublishing] = useState(false);
  const [recipeUnits, setRecipeUnits] = useState(["ly", "can", "khay", "nồi"]);
  const [uploadingMedia, setUploadingMedia] = useState({
    IMAGE: false,
    VIDEO: false,
  });
  const [draggingIngredient, setDraggingIngredient] = useState<number | null>(
    null,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const draggingIngredientRef = useRef<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const onFormChangeRef = useRef(onFormChange);
  const onDirtyChangeRef = useRef(onDirtyChange);
  const saveRef = useRef<() => void>(() => {});
  onFormChangeRef.current = onFormChange;
  onDirtyChangeRef.current = onDirtyChange;

  useEffect(() => {
    registerSave?.(() => saveRef.current());
  }, [registerSave]);

  useEffect(() => {
    if (mode === "create") onFormChangeRef.current?.(form);
  }, [form, mode]);

  useEffect(() => {
    if (mode === "create") onDirtyChangeRef.current?.(isDirty);
  }, [isDirty, mode]);

  useEffect(() => {
    if (!existing) return;
    const version = existing;
    setForm({
      code: existing.code,
      name: existing.name,
      type: existing.type,
      categoryId: existing.categoryId || null,
      outputProductId: existing.outputProductId || null,
      description: existing.description || "",
      quantity: existing.quantity == null ? 1 : Number(existing.quantity),
      quantityUnit: existing.quantityUnit || "ml",
      unit: existing.unit || "ly",
      storage: existing.storage || "",
      changeNote: version?.changeNote || "",
      ingredients: (version?.ingredients || []).map((row) => ({
        ...row,
        quantity: Number(row.quantity),
        unit: normalizeIngredientUnit(row.unit || row.customUnit),
        customUnit:
          row.sourceType === "CUSTOM"
            ? normalizeIngredientUnit(row.customUnit || row.unit)
            : row.customUnit,
        customPrice:
          row.customPrice == null ? undefined : Number(row.customPrice),
      })),
      steps: version?.steps || [],
      media: version?.images || [],
    });
    if (existing.unit)
      setRecipeUnits((units) =>
        units.includes(existing.unit!) ? units : [...units, existing.unit!],
      );
    setIsDirty(false);
  }, [existing, canUpdate]);

  // Create mode tự lưu nháp vào localStorage nên không cần cảnh báo mất dữ liệu.
  useEffect(() => {
    if (mode === "create") return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty, mode]);

  const setField = <K extends keyof RecipePayload>(
    key: K,
    value: RecipePayload[K],
  ) =>
    setForm((current) => {
      const next = { ...current, [key]: value };
      setIsDirty(true);
      return next;
    });

  const cleanPayload = (): RecipePayload => {
    const payload: RecipePayload = {
      name: form.name.trim(),
      type: form.type,
      categoryId: form.categoryId || undefined,
      outputProductId: form.outputProductId || undefined,
      description: form.description?.trim() || undefined,
      quantity: form.quantity ?? null,
      quantityUnit: form.quantityUnit || null,
      unit: form.unit?.trim() || null,
      storage: form.storage?.trim() || null,
      ingredients: (form.ingredients || []).map((row, index) => ({
        sourceType: row.sourceType,
        productId: row.sourceType === "PRODUCT" ? row.productId : undefined,
        recipeReferenceId:
          row.sourceType === "SEMI_FINISHED"
            ? row.recipeReferenceId
            : undefined,
        ingredientId:
          row.sourceType === "CUSTOM" ? row.ingredientId : undefined,
        customName:
          row.sourceType === "CUSTOM" ? row.customName?.trim() : undefined,
        customUnit:
          row.sourceType === "CUSTOM" ? row.customUnit || row.unit : undefined,
        customPrice:
          row.sourceType === "CUSTOM" ? (row.customPrice ?? 0) : undefined,
        quantity: Number(row.quantity),
        unit: row.unit?.trim() || undefined,
        includeInCost: row.includeInCost !== false,
        isInternal: row.isInternal || false,
        isTemporary: row.isTemporary || false,
        note: row.note?.trim() || undefined,
        sortOrder: index,
      })),
      steps: (form.steps || []).map((row, index) => ({
        title: row.title?.trim() || undefined,
        content: row.content.trim(),
        tools: row.tools,
        notes: row.notes?.trim() || undefined,
        sortOrder: index,
      })),
      media: (form.media || []).map((row, index) => ({
        mediaType: row.mediaType,
        fileUrl: row.fileUrl,
        fileName: row.fileName,
        mimeType: row.mimeType,
        altText: row.altText,
        sortOrder: index,
      })),
    };

    // Mã chỉ được gửi khi tạo mới; update giữ mã recipe bất biến.
    if (mode === "create") {
      payload.code = form.code?.trim() || undefined;
      if (form.changeNote?.trim()) {
        payload.changeNote = form.changeNote.trim();
      }
    }
    return payload;
  };

  const ingredientError = (row: RecipeIngredientPayload) => {
    if (!row.quantity || row.quantity <= 0)
      return "Định lượng nguyên liệu phải lớn hơn 0";
    if (row.sourceType === "PRODUCT" && !row.productId)
      return "Hãy chọn sản phẩm cho nguyên liệu Product";
    if (row.sourceType === "SEMI_FINISHED" && !row.recipeReferenceId)
      return "Hãy chọn công thức bán thành phẩm";
    if (row.sourceType === "CUSTOM" && !row.customName?.trim())
      return "Hãy nhập tên nguyên liệu ngoài";
    return null;
  };

  const collectErrors = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = "Tên công thức không được để trống";
    if (!form.quantity || form.quantity <= 0)
      next.quantity = "Định lượng công thức phải lớn hơn 0";
    else if (!form.quantityUnit)
      next.quantity = "Đơn vị định lượng không được để trống";
    if (!form.unit?.trim()) next.unit = "Đơn vị công thức không được để trống";
    const rows: Record<number, string> = {};
    (form.ingredients || []).forEach((row, index) => {
      const error = ingredientError(row);
      if (error) rows[index] = error;
    });
    if (Object.keys(rows).length) next.ingredients = rows;
    return next;
  };

  const firstErrorMessage = (found: FormErrors) => {
    if (found.name) return found.name;
    if (found.quantity) return found.quantity;
    if (found.unit) return found.unit;
    const rows = found.ingredients;
    if (!rows) return null;
    const index = Number(Object.keys(rows)[0]);
    return `Nguyên liệu ${index + 1}: ${rows[index]}`;
  };

  const validateField = (field: "name" | "quantity" | "unit") => {
    const found = collectErrors();
    setErrors((current) => ({ ...current, [field]: found[field] }));
  };

  const validateIngredientRow = (index: number) => {
    const row = (form.ingredients || [])[index];
    if (!row) return;
    const error = ingredientError(row);
    setErrors((current) => {
      const rows = { ...(current.ingredients || {}) };
      if (error) rows[index] = error;
      else delete rows[index];
      return { ...current, ingredients: rows };
    });
  };

  const save = async () => {
    const found = collectErrors();
    const error = firstErrorMessage(found);
    if (error) {
      setErrors(found);
      if (found.name) nameInputRef.current?.focus();
      return toast.error(error);
    }
    setErrors({});
    try {
      if (mode === "create") {
        const created = await createRecipe.mutateAsync(cleanPayload());
        setIsDirty(false);
        if (onSaveSuccess) onSaveSuccess(created.id);
        else router.replace(`/san-pham/pha-che/${created.id}`);
      } else {
        await updateRecipe.mutateAsync({ id: recipeId!, data: cleanPayload() });
        setIsDirty(false);
      }
    } catch {}
  };

  const publish = async () => {
    if (!recipeId) return;
    const found = collectErrors();
    const error = firstErrorMessage(found);
    if (error) {
      setErrors(found);
      return toast.error(error);
    }
    if (!(form.ingredients || []).length)
      return toast.error("Công thức phải có ít nhất một nguyên liệu");
    const result = await Swal.fire({
      title: "Publish công thức?",
      text: "Công thức sẽ hiển thị công khai cho khách hàng.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Publish",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#00B7CC",
    });
    if (!result.isConfirmed) return;
    setPublishing(true);
    try {
      if (editable)
        await updateRecipe.mutateAsync({ id: recipeId, data: cleanPayload() });
      await publishRecipe.mutateAsync({
        id: recipeId,
        changeNote: form.changeNote || undefined,
      });
      setIsDirty(false);
    } catch {
    } finally {
      setPublishing(false);
    }
  };

  saveRef.current = () => {
    const busy = createRecipe.isPending || updateRecipe.isPending || publishing;
    if (!editable || busy || !isDirty) return;
    void save();
  };

  const leaveForm = async () => {
    if (onLeave) return onLeave();
    if (!isDirty) return router.push("/san-pham/pha-che");
    const result = await Swal.fire({
      title: "Bạn có thay đổi chưa lưu",
      text: "Nếu rời trang, các thay đổi này sẽ bị mất.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Rời trang",
      cancelButtonText: "Ở lại",
      confirmButtonColor: "#C0392B",
    });
    if (result.isConfirmed) {
      setIsDirty(false);
      router.push("/san-pham/pha-che");
    }
  };

  const addIngredient = () => {
    setField("ingredients", [
      ...(form.ingredients || []),
      {
        sourceType: "PRODUCT",
        quantity: 1,
        unit: "gram",
        includeInCost: true,
      },
    ]);
  };
  const updateIngredient = (
    index: number,
    patch: Partial<RecipeIngredientPayload>,
  ) => {
    const rows = [...(form.ingredients || [])];
    rows[index] = { ...rows[index], ...patch };
    setIsDirty(true);
    setField("ingredients", rows);
  };
  const removeIngredient = (index: number) =>
    setField(
      "ingredients",
      (form.ingredients || []).filter((_, i) => i !== index),
    );
  const moveIngredient = (from: number, to: number) => {
    const rows = [...(form.ingredients || [])];
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= rows.length ||
      to >= rows.length
    )
      return;
    const [moved] = rows.splice(from, 1);
    rows.splice(to, 0, moved);
    draggingIngredientRef.current = to;
    setDraggingIngredient(to);
    setField("ingredients", rows);
  };

  const startIngredientDrag = (
    index: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    draggingIngredientRef.current = index;
    setDraggingIngredient(index);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const dragIngredient = (event: React.PointerEvent<HTMLButtonElement>) => {
    const from = draggingIngredientRef.current;
    if (from == null) return;
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-ingredient-index]");
    const to = target ? Number(target.dataset.ingredientIndex) : NaN;
    if (Number.isInteger(to) && to !== from) moveIngredient(from, to);
  };

  const stopIngredientDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingIngredientRef.current = null;
    setDraggingIngredient(null);
  };

  const addStep = () =>
    setField("steps", [
      ...(form.steps || []),
      { title: `Bước ${(form.steps || []).length + 1}`, content: "" },
    ]);
  const updateStep = (index: number, patch: Partial<RecipeStepPayload>) => {
    const rows = [...(form.steps || [])];
    rows[index] = { ...rows[index], ...patch };
    setIsDirty(true);
    setField("steps", rows);
  };

  const createCategoryQuickly = async () => {
    const result = await Swal.fire({
      title: "Tạo nhóm công thức",
      input: "text",
      inputLabel: "Tên nhóm",
      inputPlaceholder: "VD: Trà trái cây",
      showCancelButton: true,
      confirmButtonText: "Tạo nhóm",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#00B7CC",
      inputValidator: (value) =>
        value.trim() ? undefined : "Tên nhóm không được để trống",
    });
    if (!result.isConfirmed) return;
    try {
      const category = await createCategory.mutateAsync({
        name: result.value.trim(),
        type: form.type,
      });
      setField("categoryId", category.id);
    } catch {}
  };

  const createRecipeUnit = async () => {
    const result = await Swal.fire({
      title: "Thêm đơn vị",
      input: "text",
      inputLabel: "Tên đơn vị",
      inputPlaceholder: "VD: bình",
      showCancelButton: true,
      confirmButtonText: "Thêm",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#00B7CC",
      inputValidator: (value) =>
        value.trim() ? undefined : "Đơn vị không được để trống",
    });
    if (!result.isConfirmed) return;
    const unit = result.value.trim().toLowerCase();
    setRecipeUnits((units) =>
      units.includes(unit) ? units : [...units, unit],
    );
    setField("unit", unit);
  };

  const uploadMedia = async (files: File[], mediaType: "IMAGE" | "VIDEO") => {
    if (!files.length) return;
    let payload = files;
    if (mediaType === "VIDEO") {
      const { accepted } = await filterVideoFiles(files);
      payload = accepted.map((entry) => entry.file);
      if (!payload.length) return;
    }
    setUploadingMedia((current) => ({ ...current, [mediaType]: true }));
    try {
      const result = await recipesApi.uploadMedia(payload);
      const uploaded: RecipeMediaPayload[] = result.items.map((item) => ({
        mediaType,
        fileUrl: item.url,
        fileName: item.originalname,
        mimeType: item.mimetype,
      }));
      setForm((current) => {
        const next = {
          ...current,
          media: [...(current.media || []), ...uploaded],
        };
        setIsDirty(true);
        return next;
      });
      if (result.errors.length)
        toast.error(`${result.errors.length} file không upload được`);
      if (uploaded.length) toast.success(`Đã upload ${uploaded.length} file`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể upload media",
      );
    } finally {
      setUploadingMedia((current) => ({ ...current, [mediaType]: false }));
    }
  };

  const removeMedia = (index: number) =>
    setField(
      "media",
      (form.media || []).filter((_, itemIndex) => itemIndex !== index),
    );

  if (mode === "edit" && isLoading) {
    return (
      <div
        className="flex h-full items-center justify-center bg-[#f5fafb]"
        aria-label="Đang tải công thức"
      >
        <div className="w-full max-w-3xl space-y-4 p-6">
          <div className="h-16 animate-pulse rounded-xl bg-white" />
          <div className="h-64 animate-pulse rounded-xl bg-white" />
          <div className="h-40 animate-pulse rounded-xl bg-white" />
        </div>
      </div>
    );
  }

  if (mode === "edit" && (isError || !existing)) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f5fafb] p-6">
        <div
          className="max-w-md rounded-xl border bg-white p-8 text-center"
          style={{ borderColor: "var(--dt-border)" }}
        >
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-[#0D3B42]">
            Không thể mở công thức
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Công thức không tồn tại hoặc dữ liệu chưa thể tải.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="min-h-11 rounded-lg border px-4 text-sm font-medium text-brand"
              style={{ borderColor: "var(--dt-border)" }}
            >
              Thử lại
            </button>
            <button
              type="button"
              onClick={() => router.push("/san-pham/pha-che")}
              className="min-h-11 rounded-lg bg-brand px-4 text-sm font-medium text-white"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs: Array<{
    key: Tab;
    label: string;
    icon: typeof Info;
    visible: boolean;
  }> = [
    { key: "info", label: "Thông tin", icon: Info, visible: true },
    { key: "recipe", label: "Công thức", icon: FlaskConical, visible: true },
    { key: "comment", label: "Bình luận", icon: MessageCircle, visible: mode === "edit" },
  ];
  const saving = createRecipe.isPending || updateRecipe.isPending;

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#f5fafb] pb-20 md:pb-8">
      <header
        className="sticky top-0 z-20 border-b bg-white"
        style={{ borderColor: "var(--dt-border)" }}
      >
        <div
          className={`mx-auto flex max-w-none gap-3 px-3 py-3 md:px-6 ${mode === "create" ? "flex-wrap items-center md:flex-nowrap" : "items-center justify-between"}`}
        >
          <div
            className={`flex min-w-0 items-center gap-2 md:gap-3 ${mode === "create" ? "" : "flex-1"}`}
          >
            <button
              type="button"
              onClick={leaveForm}
              aria-label="Quay lại danh sách công thức"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {mode === "create" ? (
              <h1 className="sr-only">Tạo công thức pha chế</h1>
            ) : (
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-gray-900 md:text-xl">
                  {existing?.name}
                </h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-mono">{existing?.code}</span>
                </div>
              </div>
            )}
          </div>
          {/* Cùng hàng với action từ md; dưới md tự xuống hàng riêng nhờ flex-wrap. */}
          {mode === "create" && (
            <div className="order-last min-w-0 basis-full md:order-none md:flex-1 md:basis-auto">
              {workspaceTabs}
            </div>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {workspaceStatus}
            {mode === "edit" && recipeId && existing?.status === "PUBLISHED" && canPublish && (
              <button
                type="button"
                onClick={async () => {
                  const result = await Swal.fire({
                    title: "Bỏ phiên bản công khai?",
                    text: `Công thức sẽ chuyển về trạng thái bản nháp và không hiển thị cho khách hàng.`,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Bỏ publish",
                    cancelButtonText: "Hủy",
                    confirmButtonColor: "#0D3B42",
                  });
                  if (!result.isConfirmed) return;
                  try {
                    await unpublishRecipe.mutateAsync(recipeId);
                  } catch {}
                }}
                disabled={unpublishRecipe.isPending}
                title="Bỏ phiên bản công khai — công thức sẽ chuyển về DRAFT"
                className="flex min-h-11 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-50"
                style={{ borderColor: "var(--dt-border)" }}
              >
                <EyeOff className="h-4 w-4" />
                <span className="hidden lg:inline">
                  {unpublishRecipe.isPending ? "Đang xử lý..." : "Bỏ publish"}
                </span>
              </button>
            )}
            {editable && (
              <button
                type="button"
                onClick={save}
                disabled={saving || publishing || !isDirty}
                title={
                  !isDirty
                    ? "Chưa có thay đổi để lưu"
                    : mode === "create"
                      ? "Tạo công thức"
                      : "Lưu nháp"
                }
                className="flex min-h-11 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:outline-none disabled:opacity-50"
                style={{ borderColor: "var(--dt-border)" }}
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {mode === "create"
                    ? saving
                      ? "Đang tạo..."
                      : "Tạo công thức"
                    : "Lưu nháp"}
                </span>
              </button>
            )}
            {mode === "edit" &&
              canPublish &&
              existing?.status !== "PUBLISHED" && (
                <button
                  type="button"
                  onClick={publish}
                  disabled={publishing || saving}
                  className="flex min-h-11 items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {publishing ? "Đang xuất bản..." : "Xuất bản"}
                  </span>
                </button>
              )}
          </div>
        </div>
        {mode === "edit" && (
          <nav
            className="mx-auto hidden max-w-none gap-1 px-6 md:flex"
            role="tablist"
            aria-label="Nội dung công thức"
          >
            {tabs
              .filter((tab) => tab.visible)
              .map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex min-h-11 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${activeTab === tab.key ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-800"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-none p-3 md:p-6">
        {!editable && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-[#0D3B42]">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div>
              <div className="font-semibold">Chế độ chỉ xem</div>
              <p className="mt-0.5 text-[#3A6B74]">
                Tài khoản của bạn chưa có quyền chỉnh sửa công thức này.
              </p>
            </div>
          </div>
        )}
        {(mode === "create" || activeTab === "info") && (
          <div
            className={`grid items-start gap-4 ${mode === "edit" ? "xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.7fr)_minmax(320px,0.7fr)]" : "xl:grid-cols-[minmax(0,58fr)_minmax(320px,42fr)]"}`}
          >
            <Section title="Thông tin cơ bản" icon={Beaker}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mã công thức">
                  <input
                    disabled={!editable || mode === "edit"}
                    value={form.code || ""}
                    onChange={(e) => setField("code", e.target.value)}
                    placeholder="Tự sinh nếu để trống"
                    className={inputClass}
                    style={{ borderColor: "var(--dt-border)" }}
                  />
                </Field>
                <Field label="Tên công thức *">
                  <input
                    ref={nameInputRef}
                    disabled={!editable}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    onBlur={() => validateField("name")}
                    aria-invalid={errors.name ? true : undefined}
                    className={inputClass}
                    style={{
                      borderColor: errors.name ? "#C0392B" : "var(--dt-border)",
                    }}
                  />
                  <FieldError message={errors.name} />
                </Field>
                <Field label="Loại">
                  <select
                    disabled={!editable}
                    value={form.type}
                    onChange={(e) =>
                      setField("type", e.target.value as RecipeType)
                    }
                    className={inputClass}
                    style={{ borderColor: "var(--dt-border)" }}
                  >
                    <option value="FINISHED_PRODUCT">Thành phẩm</option>
                    <option value="SEMI_FINISHED">Bán thành phẩm</option>
                  </select>
                </Field>
                <Field label="Nhóm">
                  <SearchableSelect
                    clearable
                    disabled={!editable}
                    value={form.categoryId ? String(form.categoryId) : ""}
                    onChange={(value) =>
                      setField("categoryId", value ? Number(value) : null)
                    }
                    placeholder="Chưa phân nhóm"
                    searchPlaceholder="Tìm nhóm..."
                    options={categories
                      .filter((c) => !c.type || c.type === form.type)
                      .map((c) => ({ value: String(c.id), label: c.name }))}
                    footer={
                      editable ? (
                        <button
                          type="button"
                          onClick={createCategoryQuickly}
                          disabled={createCategory.isPending}
                          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand hover:bg-cyan-50 disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />
                          Tạo nhóm mới
                        </button>
                      ) : undefined
                    }
                  />
                </Field>
                <div>
                  <span className={labelClass}>Định lượng</span>
                  <div className="grid grid-cols-[minmax(0,1fr)_100px_minmax(120px,0.8fr)] gap-3">
                    <NumberField
                      label="Số lượng"
                      hideLabel
                      value={form.quantity}
                      disabled={!editable}
                      invalid={!!errors.quantity}
                      onBlur={() => validateField("quantity")}
                      onChange={(value) => setField("quantity", value)}
                    />
                    <Field label="Đơn vị định lượng" hideLabel>
                      <select
                        disabled={!editable}
                        value={form.quantityUnit || "ml"}
                        onChange={(e) =>
                          setField(
                            "quantityUnit",
                            e.target.value as "ml" | "gram",
                          )
                        }
                        className={inputClass}
                        style={{ borderColor: "var(--dt-border)" }}
                      >
                        <option value="ml">ml</option>
                        <option value="gram">gram</option>
                      </select>
                    </Field>
                    <Field label="Đơn vị thành phẩm" hideLabel>
                      <select
                        disabled={!editable}
                        value={form.unit || ""}
                        onChange={(e) =>
                          e.target.value === "__new__"
                            ? createRecipeUnit()
                            : setField("unit", e.target.value)
                        }
                        onBlur={() => validateField("unit")}
                        aria-invalid={errors.unit ? true : undefined}
                        className={inputClass}
                        style={{
                          borderColor: errors.unit
                            ? "#C0392B"
                            : "var(--dt-border)",
                        }}
                      >
                        <option value="">Đơn vị thành phẩm</option>
                        {recipeUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                        {editable && (
                          <option value="__new__">+ Thêm đơn vị mới</option>
                        )}
                      </select>
                    </Field>
                  </div>
                  <FieldError message={errors.quantity || errors.unit} />
                </div>
                <Field label="Bảo quản">
                  <input
                    disabled={!editable}
                    value={form.storage || ""}
                    onChange={(e) => setField("storage", e.target.value)}
                    placeholder="VD: Bảo quản lạnh 2–8°C"
                    className={inputClass}
                    style={{ borderColor: "var(--dt-border)" }}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Mô tả">
                    <textarea
                      disabled={!editable}
                      rows={5}
                      value={form.description || ""}
                      onChange={(e) => setField("description", e.target.value)}
                      className={inputClass}
                      style={{ borderColor: "var(--dt-border)" }}
                    />
                  </Field>
                </div>
              </div>
            </Section>
            <Section title="Media" icon={Film}>
              <div className="space-y-5">
                <MediaUploadGroup
                  label="Hình ảnh"
                  accept="image/*"
                  mediaType="IMAGE"
                  icon={<Upload className="h-5 w-5" />}
                  files={form.media || []}
                  editable={editable}
                  uploading={uploadingMedia.IMAGE}
                  onUpload={(files) => uploadMedia(files, "IMAGE")}
                  onRemove={removeMedia}
                />
                <MediaUploadGroup
                  label="Video"
                  accept={VIDEO_ALLOWED_MIMES.join(",")}
                  mediaType="VIDEO"
                  icon={<Upload className="h-5 w-5" />}
                  files={form.media || []}
                  editable={editable}
                  uploading={uploadingMedia.VIDEO}
                  onUpload={(files) => uploadMedia(files, "VIDEO")}
                  onRemove={removeMedia}
                />
              </div>
            </Section>
            {mode === "edit" && recipeId && (
              <RecipeComments recipeId={recipeId} />
            )}
          </div>
        )}

        {(mode === "create" || activeTab === "recipe") && (
          <div
            className={`grid items-start gap-4 ${mode === "edit" ? "xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.7fr)_minmax(320px,0.7fr)]" : "mt-4 xl:grid-cols-[minmax(0,58fr)_minmax(360px,42fr)]"}`}
          >
            <Section
              title={`Nguyên liệu (${(form.ingredients || []).length})`}
              icon={FlaskConical}
              action={
                editable ? (
                  <button
                    onClick={addIngredient}
                    className="flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm nguyên liệu
                  </button>
                ) : undefined
              }
            >
              <div className="space-y-3">
                {(form.ingredients || []).length === 0 && (
                  <Empty text="Chưa có nguyên liệu. Thêm ít nhất một nguyên liệu trước khi publish." />
                )}
                {(form.ingredients || []).map((row, index) => {
                  const selectedSemiOption = row.recipeReference
                    ? {
                        id: row.recipeReference.id,
                        code: row.recipeReference.code,
                        name: row.recipeReference.name,
                      }
                    : undefined;
                  return (
                    <div
                      key={`${row.id || "new"}-${index}`}
                      data-ingredient-index={index}
                      className={`rounded-xl border bg-[#fbfefe] p-3 transition md:p-4 ${draggingIngredient === index ? "border-brand bg-cyan-50 shadow-lg ring-2 ring-brand/20" : ""}`}
                      style={{
                        borderColor:
                          draggingIngredient === index
                            ? undefined
                            : "var(--dt-border)",
                      }}
                    >
                      <div className="overflow-x-auto">
                        <div
                          className={`grid min-w-[760px] gap-3 md:items-end ${mode === "create" ? "md:grid-cols-12" : canViewCost ? "md:grid-cols-[44px_140px_minmax(200px,1fr)_100px_90px_90px_110px_auto]" : "md:grid-cols-[44px_140px_minmax(200px,1fr)_100px_90px_90px_auto]"}`}
                        >
                        {editable && (
                          <button
                            type="button"
                            onPointerDown={(event) =>
                              startIngredientDrag(index, event)
                            }
                            onPointerMove={dragIngredient}
                            onPointerUp={stopIngredientDrag}
                            onPointerCancel={stopIngredientDrag}
                            aria-label={`Kéo để sắp xếp nguyên liệu ${index + 1}`}
                            title="Giữ và kéo để đổi vị trí"
                            className={`flex h-11 w-11 touch-none cursor-grab items-center justify-center rounded-lg border bg-white text-gray-400 hover:border-brand hover:text-brand active:cursor-grabbing ${mode === "create" ? "md:col-span-1" : ""}`}
                            style={{ borderColor: "var(--dt-border)" }}
                          >
                            <GripVertical className="h-5 w-5" />
                          </button>
                        )}
                        {!editable && <div className="hidden md:block" />}
                        <Field
                          label="Nguồn"
                          className={
                            mode === "create" ? "md:col-span-3" : undefined
                          }
                        >
                          <select
                            disabled={!editable}
                            value={row.sourceType}
                            onChange={(e) =>
                              updateIngredient(index, {
                                sourceType: e.target
                                  .value as RecipeIngredientPayload["sourceType"],
                                productId: undefined,
                                recipeReferenceId: undefined,
                                customName: undefined,
                              })
                            }
                            className={inputClass}
                            style={{ borderColor: "var(--dt-border)" }}
                          >
                            <option value="PRODUCT">Product</option>
                            <option value="SEMI_FINISHED">
                              Bán thành phẩm
                            </option>
                            <option value="CUSTOM">Nguyên liệu ngoài</option>
                          </select>
                        </Field>
                        {row.sourceType === "PRODUCT" && (
                          <Field
                            label="Sản phẩm"
                            className={
                              mode === "create" ? "md:col-span-7" : undefined
                            }
                          >
                            <RecipeProductPicker
                              disabled={!editable}
                              value={row.productId}
                              selectedProduct={row.product}
                              showCost={canViewCost}
                              onChange={(product) =>
                                updateIngredient(index, {
                                  productId: product?.id,
                                  product,
                                  unit: normalizeIngredientUnit(row.unit),
                                })
                              }
                            />
                          </Field>
                        )}
                        {row.sourceType === "SEMI_FINISHED" && (
                          <Field
                            label="Công thức bán thành phẩm"
                            className={
                              mode === "create" ? "md:col-span-7" : undefined
                            }
                          >
                            <RecipeReferencePicker
                              disabled={!editable}
                              excludeId={recipeId}
                              selected={selectedSemiOption}
                              onChange={(recipe) =>
                                updateIngredient(index, {
                                  recipeReferenceId: recipe?.id,
                                  recipeReference: recipe
                                    ? {
                                        id: recipe.id,
                                        code: recipe.code,
                                        name: recipe.name,
                                        type: "SEMI_FINISHED",
                                        status: "PUBLISHED",
                                      }
                                    : undefined,
                                  unit: normalizeIngredientUnit(row.unit),
                                })
                              }
                            />
                          </Field>
                        )}
                        {row.sourceType === "CUSTOM" && (
                          <Field
                            label="Tên nguyên liệu"
                            className={
                              mode === "create" ? "md:col-span-7" : undefined
                            }
                          >
                            <input
                              disabled={!editable}
                              value={row.customName || ""}
                              onChange={(e) =>
                                updateIngredient(index, {
                                  customName: e.target.value,
                                })
                              }
                              className={inputClass}
                              style={{ borderColor: "var(--dt-border)" }}
                            />
                          </Field>
                        )}
                        <NumberField
                          label="Định lượng"
                          className={
                            mode === "create"
                              ? "md:col-span-2 md:col-start-2"
                              : undefined
                          }
                          value={row.quantity}
                          disabled={!editable}
                          invalid={!!errors.ingredients?.[index]}
                          onBlur={() => validateIngredientRow(index)}
                          onChange={(v) =>
                            updateIngredient(index, { quantity: v || 0 })
                          }
                        />
                        <Field
                          label="Đơn vị"
                          className={
                            mode === "create" ? "md:col-span-2" : undefined
                          }
                        >
                          <select
                            disabled={!editable}
                            value={normalizeIngredientUnit(
                              row.unit || row.customUnit,
                            )}
                            onChange={(e) =>
                              updateIngredient(index, {
                                unit: e.target.value,
                                customUnit:
                                  row.sourceType === "CUSTOM"
                                    ? e.target.value
                                    : row.customUnit,
                              })
                            }
                            className={inputClass}
                            style={{ borderColor: "var(--dt-border)" }}
                          >
                            {INGREDIENT_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </Field>
                        {row.sourceType === "CUSTOM" ? (
                          <NumberField
                            label="Đơn giá cost"
                            className={
                              mode === "create" ? "md:col-span-3" : undefined
                            }
                            value={row.customPrice}
                            disabled={!editable}
                            onChange={(v) =>
                              updateIngredient(index, { customPrice: v || 0 })
                            }
                          />
                        ) : row.sourceType === "PRODUCT" || row.sourceType === "SEMI_FINISHED" ? (
                          <Field
                            label="Đơn giá cost"
                            className={
                              mode === "create" ? "md:col-span-3" : undefined
                            }
                          >
                            <div
                              className="flex h-[42px] items-center rounded-lg border bg-gray-50 px-3 font-mono text-sm font-semibold text-[#0D3B42]"
                              style={{ borderColor: "var(--dt-border)" }}
                            >
                              {money(ingredientUnitCost(row))}
                            </div>
                          </Field>
                        ) : null}
                        {canViewCost && (
                          <Field
                            label="Giá cost"
                            className={
                              mode === "create" ? "md:col-span-3" : undefined
                            }
                          >
                            <div
                              className="flex h-[42px] items-center rounded-lg border bg-[#E8F4F5] px-3 font-mono text-sm font-semibold text-[#0D3B42]"
                              style={{ borderColor: "var(--dt-border)" }}
                            >
                              {money(ingredientLineCost(row))}
                            </div>
                          </Field>
                        )}
                        {editable && (
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            aria-label={`Xóa nguyên liệu ${index + 1}`}
                            className={`flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 ${mode === "create" ? "md:col-start-12 md:row-start-1" : ""}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      </div>
                      <FieldError message={errors.ingredients?.[index]} />
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            disabled={!editable}
                            checked={row.includeInCost !== false}
                            onChange={(e) =>
                              updateIngredient(index, {
                                includeInCost: e.target.checked,
                              })
                            }
                          />{" "}
                          Tính vào giá cost
                        </label>
                        {canViewCost && row.sourceType !== "PRODUCT" && (
                          <span className="text-xs text-gray-500">
                            Đơn giá:{" "}
                            <span className="font-mono font-medium text-gray-700">
                              {money(ingredientUnitCost(row))}
                            </span>{" "}
                            /{" "}
                            {normalizeIngredientUnit(
                              row.unit || row.customUnit,
                            )}
                          </span>
                        )}
                        <input
                          disabled={!editable}
                          value={row.note || ""}
                          onChange={(e) =>
                            updateIngredient(index, { note: e.target.value })
                          }
                          placeholder="Ghi chú nguyên liệu..."
                          className="min-w-[220px] flex-1 border-0 bg-transparent text-xs text-gray-600 outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
                {canViewCost && (
                  <div
                    className={`mt-4 flex flex-col gap-2 rounded-xl border bg-[#E8F4F5] px-4 py-3 md:flex-row md:items-center md:justify-between ${mode === "create" ? "" : ""}`}
                    style={{ borderColor: "var(--dt-border)" }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#3A6B74]">
                        Tổng giá cost
                      </div>
                      <div className="mt-0.5 text-xs text-[#3A6B74]">
                        Tổng định lượng:{" "}
                        <span className="font-medium text-[#0D3B42]">
                          {totalIngredientQuantities(form.ingredients || []) ||
                            "—"}
                        </span>
                      </div>
                    </div>
                    <div className="font-mono text-xl font-semibold text-[#0D3B42] md:text-right">
                      {money(totalIngredientCost(form.ingredients || []))}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            <Section
              title={`Quy trình (${(form.steps || []).length} bước)`}
              icon={ClipboardList}
              action={
                editable ? (
                  <button
                    onClick={addStep}
                    className="flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm bước
                  </button>
                ) : undefined
              }
            >
              <div className="space-y-3">
                {(form.steps || []).length === 0 && (
                  <Empty text="Chưa có hướng dẫn pha chế." />
                )}
                {(form.steps || []).map((step, index) => (
                  <div
                    key={`${step.id || "new"}-${index}`}
                    className="flex gap-3 rounded-xl border p-3 md:p-4"
                    style={{ borderColor: "var(--dt-border)" }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f4f5] text-sm font-bold text-[#0D3B42]">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="space-y-3">
                        <input
                          disabled={!editable}
                          value={step.title || ""}
                          onChange={(e) =>
                            updateStep(index, { title: e.target.value })
                          }
                          placeholder={`Bước ${index + 1}`}
                          className={`${inputClass} font-medium`}
                          style={{ borderColor: "var(--dt-border)" }}
                        />
                        <textarea
                          disabled={!editable}
                          rows={3}
                          value={step.content}
                          onChange={(e) =>
                            updateStep(index, { content: e.target.value })
                          }
                          placeholder="Mô tả thao tác..."
                          className={inputClass}
                          style={{ borderColor: "var(--dt-border)" }}
                        />
                      </div>
                    </div>
                    {editable && (
                      <button
                        type="button"
                        onClick={() =>
                          setField(
                            "steps",
                            (form.steps || []).filter((_, i) => i !== index),
                          )
                        }
                        aria-label={`Xóa bước ${index + 1}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            {mode === "edit" && recipeId && (
              <RecipeComments recipeId={recipeId} />
            )}
          </div>
        )}

        {mode === "edit" && recipeId && activeTab === "comment" && (
          <div className="md:hidden">
            <RecipeComments recipeId={recipeId} />
          </div>
        )}
      </main>

      {mode === "edit" && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_20px_rgba(13,59,66,0.08)] md:hidden"
          role="tablist"
          aria-label="Nội dung công thức"
          style={{
            gridTemplateColumns: `repeat(${tabs.filter((t) => t.visible).length}, minmax(0,1fr))`,
            borderColor: "var(--dt-border)",
          }}
        >
          {tabs
            .filter((tab) => tab.visible)
            .map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 px-1 py-2 text-xs ${activeTab === tab.key ? "text-brand" : "text-gray-500"}`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
        </nav>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: typeof Info;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl border bg-white"
      style={{ borderColor: "var(--dt-border)" }}
    >
      <header
        className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-5"
        style={{ borderColor: "var(--dt-border)" }}
      >
        <h2 className="flex items-center gap-2 font-semibold text-[#0D3B42]">
          <Icon className="h-5 w-5 text-brand" />
          {title}
        </h2>
        {action}
      </header>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-[#C0392B]">
      {message}
    </p>
  );
}
function Field({
  label,
  children,
  className,
  hideLabel,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  hideLabel?: boolean;
}) {
  return (
    <label className={className}>
      <span className={hideLabel ? "sr-only" : labelClass}>{label}</span>
      {children}
    </label>
  );
}
function NumberField({
  label,
  value,
  disabled,
  onChange,
  className,
  hideLabel,
  invalid,
  onBlur,
}: {
  label: string;
  value?: number | null;
  disabled?: boolean;
  onChange: (value: number | null) => void;
  className?: string;
  hideLabel?: boolean;
  invalid?: boolean;
  onBlur?: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue = draft ?? value ?? "";

  return (
    <Field label={label} className={className} hideLabel={hideLabel}>
      <input
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        disabled={disabled}
        value={displayValue}
        aria-invalid={invalid ? true : undefined}
        onFocus={() => setDraft(value == null ? "" : String(value))}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          onChange(next === "" ? null : Number(next));
        }}
        onBlur={() => {
          setDraft(null);
          onBlur?.();
        }}
        className={inputClass}
        style={{ borderColor: invalid ? "#C0392B" : "var(--dt-border)" }}
      />
    </Field>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed py-12 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}
function MediaUploadGroup({
  label,
  accept,
  mediaType,
  icon,
  files,
  editable,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  accept: string;
  mediaType: "IMAGE" | "VIDEO";
  icon: React.ReactNode;
  files: RecipeMediaPayload[];
  editable: boolean;
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const items = files
    .map((file, index) => ({ file, index }))
    .filter(({ file }) => file.mediaType === mediaType);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#0D3B42]">
          {label} ({items.length})
        </h3>
        {editable && (
          <label
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium text-brand hover:bg-cyan-50"
            style={{ borderColor: "var(--dt-border)" }}
          >
            {icon}
            {uploading ? "Đang upload..." : `Thêm ${label.toLowerCase()}`}
            <input
              type="file"
              multiple
              accept={accept}
              disabled={uploading}
              onChange={(event) => {
                onUpload(Array.from(event.target.files || []));
                event.target.value = "";
              }}
              className="sr-only"
            />
          </label>
        )}
      </div>
      {items.length === 0 ? (
        <div
          className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-gray-500"
          style={{ borderColor: "var(--dt-border)" }}
        >
          Chưa có {label.toLowerCase()}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map(({ file, index }) => (
            <div
              key={`${file.fileUrl}-${index}`}
              className="group relative overflow-hidden rounded-xl border bg-[#F5FAFB]"
              style={{ borderColor: "var(--dt-border)" }}
            >
              {mediaType === "IMAGE" ? (
                <Image
                  unoptimized
                  width={320}
                  height={320}
                  src={file.fileUrl}
                  alt={file.altText || file.fileName || "Hình công thức"}
                  className="aspect-square w-full max-h-56 object-cover"
                />
              ) : (
                <video
                  src={file.fileUrl}
                  controls
                  preload="metadata"
                  className="aspect-video w-full max-h-56 bg-black object-contain"
                />
              )}
              {editable && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  aria-label={`Xóa ${file.fileName || label}`}
                  className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-red-600 shadow hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <div className="truncate px-2 py-2 text-xs text-gray-600">
                {file.fileName || label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
