interface InventoryPriceSource {
  refType?: string | null;
}

export function canViewInventoryTransactionPrice(
  log: InventoryPriceSource,
  canViewCostPrice: boolean,
  canViewSalePrice: boolean,
): boolean {
  switch (log.refType) {
    case "invoice":
    case "return_order":
    case "consignment":
    case "consignment_return":
      return canViewSalePrice;
    case "purchase_order":
    case "supplier_return":
      return canViewCostPrice;
    default:
      return canViewCostPrice && canViewSalePrice;
  }
}
