"use client";

import { AlertCircle } from "lucide-react";

interface DeliveryInfoCardProps {
  delivery:
    | {
        receiver?: string | null;
        contactNumber?: string | null;
        address?: string | null;
        locationName?: string | null;
        wardName?: string | null;
      }
    | null
    | undefined;
  customerAddresses?: Array<{
    isDefault?: boolean;
    wardName?: string | null;
    newWardName?: string | null;
    cityName?: string | null;
    newCityName?: string | null;
  }> | null;
  onUpdateToNewAddress?: (wardName: string, cityName: string) => void;
}

export function DeliveryInfoCard({
  delivery,
  customerAddresses,
  onUpdateToNewAddress,
}: DeliveryInfoCardProps) {
  if (!delivery) return null;

  const defaultAddr =
    customerAddresses?.find((a) => a.isDefault) || customerAddresses?.[0];

  // Phát hiện địa chỉ đã sáp nhập (newWardName tồn tại) và khác với snapshot delivery
  // const hasAddressChange =
  //   !!defaultAddr?.newWardName &&
  //   (defaultAddr.newWardName !== delivery.wardName ||
  //     defaultAddr.newCityName !== delivery.locationName);

  const rows = [
    { label: "Người nhận", value: delivery.receiver },
    { label: "Điện thoại", value: delivery.contactNumber },
    { label: "Địa chỉ", value: delivery.address },
    { label: "Khu vực", value: delivery.locationName },
    { label: "Phường/Xã", value: delivery.wardName },
  ];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="flex items-start px-3 py-2 gap-3 border-b border-gray-100 last:border-b-0">
          <span className="text-sm text-gray-500 w-28 flex-shrink-0">
            {label}:
          </span>
          <span className="text-sm text-gray-900">{value || "-"}</span>
        </div>
      ))}

      {/* {hasAddressChange && defaultAddr && (
        <div className="px-3 py-2 bg-amber-50 border-t border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-amber-800">
              <p className="font-medium">
                Địa chỉ trên đã thay đổi sau khi sáp nhập.
              </p>
              <p className="mt-0.5">
                Bạn có muốn đổi thành địa chỉ mới:{" "}
                <strong>
                  {[defaultAddr.newWardName, defaultAddr.newCityName]
                    .filter(Boolean)
                    .join(" - ")}
                </strong>
                ?
              </p>
            </div>
            {onUpdateToNewAddress && (
              <button
                onClick={() =>
                  onUpdateToNewAddress(
                    defaultAddr.newWardName!,
                    defaultAddr.newCityName || ""
                  )
                }
                className="px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors flex-shrink-0 whitespace-nowrap">
                Đổi địa chỉ
              </button>
            )}
          </div>
        </div>
      )} */}
    </div>
  );
}
