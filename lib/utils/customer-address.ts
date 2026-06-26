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

// So khớp 1 CustomerAddress với snapshot delivery đã lưu trong OrderDelivery/InvoiceDelivery.
// Trả về address tương ứng, hoặc null nếu không match được.
// Logic khớp: address (chi tiết) + wardName (ưu tiên newWardName) + cityName (ưu tiên newCityName) + receiver + contactNumber
export function findAddressFromDelivery(
  addresses: CustomerAddress[] | null | undefined,
  delivery?: {
    address?: string | null;
    locationName?: string | null;
    wardName?: string | null;
    receiver?: string | null;
    contactNumber?: string | null;
  } | null
): CustomerAddress | null {
  if (!addresses || addresses.length === 0 || !delivery) return null;

  const norm = (s?: string | null) => (s || "").trim().toLowerCase();

  const deliveryAddress = norm(delivery.address);
  const deliveryWard = norm(delivery.wardName);
  const deliveryCity = norm(delivery.locationName);
  const deliveryReceiver = norm(delivery.receiver);
  const deliveryPhone = norm(delivery.contactNumber);

  // 1) Khớp chính xác: address + (newWardName|wardName) + (newCityName|cityName) + receiver + contactNumber
  const exact = addresses.find((a) => {
    const aAddr = norm(a.address);
    const aWard = norm(a.newWardName) || norm(a.wardName);
    const aCity = norm(a.newCityName) || norm(a.cityName);
    const aReceiver = norm(a.receiver);
    const aPhone = norm(a.contactNumber);

    return (
      aAddr === deliveryAddress &&
      aWard === deliveryWard &&
      aCity === deliveryCity &&
      aReceiver === deliveryReceiver &&
      aPhone === deliveryPhone
    );
  });
  if (exact) return exact;

  // 2) Khớp lỏng hơn: address + ward + city (bỏ qua receiver/phone vì có thể đã thay đổi)
  const partial = addresses.find((a) => {
    const aAddr = norm(a.address);
    const aWard = norm(a.newWardName) || norm(a.wardName);
    const aCity = norm(a.newCityName) || norm(a.cityName);

    return (
      aAddr === deliveryAddress && aWard === deliveryWard && aCity === deliveryCity
    );
  });
  if (partial) return partial;

  // 3) Khớp chỉ address (chi tiết đường/số nhà) — fallback cuối
  const byDetail = addresses.find((a) => norm(a.address) === deliveryAddress);
  if (byDetail) return byDetail;

  return null;
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
