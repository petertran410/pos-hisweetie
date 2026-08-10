"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import {
  createEmptyRecipeForm,
  RecipeForm,
} from "@/components/recipes/RecipeForm";
import { RecipePayload } from "@/lib/api/recipes";

const STORAGE_KEY = "recipe-tabs";

interface RecipeDraftTab {
  id: string;
  defaultNumber: number;
  form: RecipePayload;
  isDirty: boolean;
}

const createTab = (defaultNumber: number): RecipeDraftTab => ({
  id: `recipe-tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  defaultNumber,
  form: createEmptyRecipeForm(),
  isDirty: false,
});

const tabLabel = (tab: RecipeDraftTab) =>
  tab.form.name.trim() || `Công thức ${tab.defaultNumber}`;

/** Số thứ tự nhỏ nhất chưa dùng, tránh nhãn nhảy bậc khi đóng/mở tab nhiều lần. */
const nextDefaultNumber = (tabs: RecipeDraftTab[]) => {
  const used = new Set(tabs.map((tab) => tab.defaultNumber));
  let candidate = 1;
  while (used.has(candidate)) candidate += 1;
  return candidate;
};

export default function NewRecipePage() {
  const router = useRouter();
  const [tabs, setTabs] = useState<RecipeDraftTab[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Hydrate the workspace from localStorage once on mount. */
    const savedTabs = localStorage.getItem(STORAGE_KEY);
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs) as RecipeDraftTab[];
        const validTabs = parsed.filter(
          (tab) =>
            tab &&
            typeof tab.id === "string" &&
            typeof tab.defaultNumber === "number" &&
            tab.form &&
            typeof tab.form.name === "string",
        );
        if (validTabs.length) {
          setTabs(validTabs);
          setActiveTabId(validTabs[0].id);
          setIsInitialized(true);
          return;
        }
      } catch (error) {
        console.error("Không thể khôi phục bản nháp công thức:", error);
      }
    }

    const initialTab = createTab(1);
    setTabs([initialTab]);
    setActiveTabId(initialTab.id);
    setIsInitialized(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const hasDraft = tabs.some((tab) => tab.isDirty);

  useEffect(() => {
    if (!isInitialized) return;
    const drafts = tabs.filter((tab) => tab.isDirty);
    if (drafts.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isInitialized, tabs]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeTabLabel = activeTab ? tabLabel(activeTab) : "";

  // Tab đang chọn phải nằm trong vùng nhìn thấy, kể cả khi nhãn giãn ra lúc gõ tên.
  useEffect(() => {
    if (!activeTabId) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    activeTabRef.current?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [activeTabId, activeTabLabel, tabs.length]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const isSaveCombo =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
      if (!isSaveCombo) return;
      if (document.querySelector(".swal2-container")) return;
      event.preventDefault();
      saveRef.current?.();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const addTab = () => {
    const newTab = createTab(nextDefaultNumber(tabs));
    setTabs((current) => [...current, newTab]);
    setActiveTabId(newTab.id);
  };

  const removeTab = useCallback(
    (tabId: string) => {
      setTabs((current) => {
        const tabIndex = current.findIndex((tab) => tab.id === tabId);
        if (tabIndex < 0) return current;

        const remaining = current.filter((tab) => tab.id !== tabId);
        if (!remaining.length) {
          const newTab = createTab(1);
          setActiveTabId(newTab.id);
          return [newTab];
        }

        if (tabId === activeTabId) {
          setActiveTabId(remaining[Math.max(0, tabIndex - 1)].id);
        }
        return remaining;
      });
    },
    [activeTabId],
  );

  const closeTab = async (tabId: string) => {
    const closingTab = tabs.find((tab) => tab.id === tabId);
    if (!closingTab) return;
    if (closingTab.isDirty) {
      const result = await Swal.fire({
        title: "Đóng bản nháp công thức?",
        text: "Các thay đổi trong tab này sẽ bị xóa.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Đóng tab",
        cancelButtonText: "Ở lại",
        confirmButtonColor: "#C0392B",
      });
      if (!result.isConfirmed) return;
    }
    removeTab(tabId);
  };

  const handleSaveSuccess = useCallback(
    (recipeId: number) => {
      if (activeTab) removeTab(activeTab.id);
      toast.success("Đã tạo công thức", {
        action: {
          label: "Mở công thức",
          onClick: () => router.push(`/san-pham/pha-che/${recipeId}`),
        },
      });
    },
    [activeTab, removeTab, router],
  );

  const tabsRow = (
    <nav
      className="-mx-1 flex min-w-0 items-center gap-2 overflow-x-auto px-1 py-1"
      aria-label="Các công thức đang tạo"
    >
      {tabs.map((tab) => {
        const label = tabLabel(tab);
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            ref={isActive ? activeTabRef : undefined}
            className={`flex min-w-0 shrink-0 items-center rounded-lg border text-sm ${isActive ? "border-brand bg-cyan-50 text-[#0D3B42]" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            style={isActive ? undefined : { borderColor: "var(--dt-border)" }}
          >
            <button
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              title={label}
              aria-current={isActive ? "page" : undefined}
              className="flex max-w-56 min-h-11 items-center truncate rounded-l-lg px-3 font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset focus-visible:outline-none"
            >
              <span className="truncate">{label}</span>
            </button>
            <button
              type="button"
              onClick={() => void closeTab(tab.id)}
              aria-label={`Đóng ${label}`}
              className="flex h-11 w-11 items-center justify-center rounded-r-lg text-gray-400 hover:bg-black/5 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset focus-visible:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={addTab}
        aria-label="Thêm công thức mới"
        title="Thêm công thức mới"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white text-brand hover:bg-cyan-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:outline-none"
        style={{ borderColor: "var(--dt-border)" }}
      >
        <Plus className="h-5 w-5" />
      </button>
    </nav>
  );

  const workspaceStatus = hasDraft ? (
    <span
      aria-live="polite"
      className="hidden items-center gap-1.5 text-xs text-[#3A6B74] lg:flex"
    >
      <Check className="h-3.5 w-3.5 text-emerald-600" />
      Đã lưu nháp
    </span>
  ) : null;

  return (
    <PagePermissionGuard resource="recipes" action="create">
      {activeTab ? (
        <RecipeForm
          key={activeTab.id}
          mode="create"
          initialForm={activeTab.form}
          initialDirty={activeTab.isDirty}
          workspaceTabs={tabsRow}
          workspaceStatus={workspaceStatus}
          registerSave={(handler) => {
            saveRef.current = handler;
          }}
          onFormChange={(form) =>
            setTabs((current) =>
              current.map((tab) =>
                tab.id === activeTab.id ? { ...tab, form } : tab,
              ),
            )
          }
          onDirtyChange={(isDirty) =>
            setTabs((current) =>
              current.map((tab) =>
                tab.id === activeTab.id ? { ...tab, isDirty } : tab,
              ),
            )
          }
          onSaveSuccess={handleSaveSuccess}
          onLeave={() => router.push("/san-pham/pha-che")}
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-[#f5fafb] text-gray-500">
          Đang khởi tạo...
        </div>
      )}
    </PagePermissionGuard>
  );
}
