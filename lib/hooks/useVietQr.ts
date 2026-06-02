import { useMutation } from "@tanstack/react-query";
import { lookupBusinessByTaxCode, VietQrBusiness } from "../api/vietqr";

/**
 * Hook tra cứu thông tin theo mã số thuế qua VietQR.io.
 * Không tự hiển thị toast — để component quyết định thông báo và việc điền dữ liệu.
 */
export function useTaxCodeLookup() {
  return useMutation<VietQrBusiness, Error, string>({
    mutationFn: (taxCode: string) => lookupBusinessByTaxCode(taxCode),
  });
}
