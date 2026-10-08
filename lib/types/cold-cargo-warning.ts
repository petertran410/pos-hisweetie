export interface ColdCargoItem {
  invoiceId: number;
  invoiceCode: string;
  productId: number | null;
  productCode: string;
  productName: string;
}

export interface ColdCargoWarning {
  hasColdItems?: boolean;
  coldItemCount?: number;
  coldItems?: ColdCargoItem[];
}
