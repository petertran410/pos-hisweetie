import type { StepperMilestone } from "@/components/journey/JourneyStepper";
import { PC_STAGE_LABEL, PC_STAGE_ORDER } from "@/lib/price-change/constants";
import type { PcTicket } from "@/lib/types/price-change";

/** Mốc tiến trình: Đề xuất → Kế toán trưởng → CEO → Phòng Dữ Liệu → Hoàn thành. Chỉ đổi giá bán thì bỏ qua CEO. */
export function stageMilestones(
  t: Pick<PcTicket, "stage" | "hasCost">,
): StepperMilestone[] {
  const current = PC_STAGE_ORDER.indexOf(t.stage);
  return PC_STAGE_ORDER.map((stage, i) => ({
    key: stage,
    label: PC_STAGE_LABEL[stage],
    done: t.stage === "DONE" || (current >= 0 && i < current),
    active: i === current && t.stage !== "DONE",
    at: null,
    ref: null,
    note:
      stage === "CEO" && !t.hasCost
        ? "Bỏ qua"
        : t.stage === "ENDED" && i === 0
          ? "Đã kết thúc"
          : null,
  }));
}
