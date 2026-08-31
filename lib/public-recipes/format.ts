import type { PublicRecipeCard } from "./types";

type RecipeYield = PublicRecipeCard["yield"];

export function formatYield(value: RecipeYield) {
  const quantity = value.quantity == null ? "-" : value.quantity;
  const amount = value.quantityUnit ? `${quantity} ${value.quantityUnit}` : `${quantity}`;
  return value.unit ? `${amount} / ${value.unit}` : amount;
}

export function costPerUnitLabel(value: RecipeYield) {
  return `Chi phí / ${value.quantityUnit || value.unit || "đơn vị"}`;
}
