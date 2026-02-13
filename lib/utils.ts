export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatDate(date: string | Date): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN");
}

export function formatNumberInput(value: string): string {
  const number = value.replace(/\D/g, "");
  if (number === "") return "";
  return new Intl.NumberFormat("en-US").format(Number(number));
}

export function parseNumberInput(value: string): number {
  return Number(value.replace(/,/g, "")) || 0;
}
