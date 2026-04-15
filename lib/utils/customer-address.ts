import { CustomerAddress } from "@/lib/types/customer";

export function getDefaultAddress(
  addresses?: CustomerAddress[]
): CustomerAddress | null {
  if (!addresses || addresses.length === 0) return null;
  return addresses.find((a) => a.isDefault) || addresses[0];
}

export function formatAddressFull(addr?: CustomerAddress | null): string {
  if (!addr) return "";

  // Ưu tiên địa chỉ mới
  if (addr.newCityName || addr.newWardName) {
    return [addr.address, addr.newWardName, addr.newCityName]
      .filter(Boolean)
      .join(", ");
  }

  return [addr.address, addr.wardName, addr.districtName, addr.cityName]
    .filter(Boolean)
    .join(", ");
}

export function formatAddressShort(addr?: CustomerAddress | null): string {
  if (!addr) return "";
  const label = addr.label || addr.receiver || "Địa chỉ";
  const place = addr.newCityName || addr.cityName || "";
  return place ? `${label} - ${place}` : label;
}

// Trả về DeliveryInfo partial từ 1 CustomerAddress
export function addressToDeliveryInfo(
  customer: any,
  addr?: CustomerAddress | null
) {
  if (!addr) {
    return {
      receiver: customer?.name || "",
      contactNumber: customer?.contactNumber || customer?.phone || "",
      detailAddress: "",
      locationName: "",
      wardName: "",
    };
  }

  return {
    receiver: addr.receiver || customer?.name || "",
    contactNumber:
      addr.contactNumber || customer?.contactNumber || customer?.phone || "",
    detailAddress: addr.address || "",
    locationName: addr.newCityName || addr.cityName || "",
    wardName: addr.newWardName || addr.wardName || "",
  };
}
