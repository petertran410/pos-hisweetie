import type { StepperMilestone } from "@/components/journey/JourneyStepper";
import {
  NPP_STAGE_LABEL,
  NPP_STAGE_ORDER,
  isManufactured,
} from "@/lib/new-product-price/constants";
import type { NppTicket } from "@/lib/types/new-product-price";

/** Mốc tiến trình của phiếu (Đề xuất → … → Hoàn thành); Hàng sản xuất bỏ qua CEO. */
export function stageMilestones(
  t: Pick<NppTicket, "stage" | "parentName">,
): StepperMilestone[] {
  const current = NPP_STAGE_ORDER.indexOf(t.stage);
  const skipCeo = isManufactured(t.parentName);
  return NPP_STAGE_ORDER.map((stage, i) => {
    const skipped = stage === "CEO" && skipCeo;
    return {
      key: stage,
      label: NPP_STAGE_LABEL[stage],
      done: t.stage === "DONE" || (current >= 0 && i < current),
      active: i === current && t.stage !== "DONE",
      at: null,
      ref: null,
      note: skipped
        ? "Bỏ qua"
        : t.stage === "ENDED" && i === 0
          ? "Đã kết thúc"
          : null,
    };
  });
}
