"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CartItem, DeliveryInfo } from "@/app/(dashboard)/ban-hang/page";
import type { Consignment } from "@/lib/types/consignment";
import { CONSIGNMENT_STATUS } from "@/lib/types/consignment";
import {
  useCreateConsignment,
  useUpdateConsignment,
} from "@/lib/hooks/useConsignments";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { useCan } from "@/lib/hooks/useCan";
import { priceBooksApi } from "@/lib/api";
import {
  getDefaultAddress,
  addressToDeliveryInfo,
} from "@/lib/utils/customer-address";
import { ProductSearchDropdown } from "@/components/pos/ProductSearchDropdown";
import { OrderItemsList } from "@/components/pos/OrderItemsList";
import { ConsignmentCart } from "./ConsignmentCart";
import { X } from "lucide-react";

interface ConsignmentFormProps {
  consignment?: Consignment | null;
  onClose?: () => void;
}

const EMPTY_DELIVERY: DeliveryInfo = {
  receiver: "",
  contactNumber: "",
  detailAddress: "",
  locationName: "",
  wardName: "",
  weight: 0,
  weightUnit: "g",
  length: 10,
  width: 10,
  height: 10,
  noteForDriver: "",
};

export function ConsignmentForm({ consignment }: ConsignmentFormProps) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const { selectedBranch } = useBranchStore();

  const createConsignment = useCreateConsignment();
  const updateConsignment = useUpdateConsignment();

  const canEditPrice = useCan("pos_price", "update");
  const canEditDiscount = useCan("pos_discount", "update");
  const canViewInventory = useCan("pos_inventory", "view");

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedPriceBookId, setSelectedPriceBookId] = useState<number | null>(
    null
  );
  const [selectedPriceBookName, setSelectedPriceBookName] = useState<
    string | null
  >(null);
  const [discount, setDiscount] = useState(0);
  const [discountRatio, setDiscountRatio] = useState(0);
  const [orderNote, setOrderNote] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>(EMPTY_DELIVERY);
  const [soldById, setSoldById] = useState<number | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null
  );
  const [consignStatus, setConsignStatus] = useState("pending");

  const branchId = consignment?.branchId || selectedBranch?.id;

  // Sau khi đã xử lý kho (>= PACKED) thì khóa form.
  const isFormDisabled =
    !!consignment && consignment.status >= CONSIGNMENT_STATUS.PACKED;

  // Nạp dữ liệu khi edit.
  useEffect(() => {
    if (!consignment) return;
    setCartItems(
      (consignment.items || []).map((item) => ({
        rowId: `${item.productId}_normal_${item.id}`,
        product: {
          id: item.productId,
          code: item.productCode,
          name: item.productName,
          basePrice: Number(item.price),
          inventories: item.product?.inventories,
        },
        quantity: Number(item.quantity),
        price: Number(item.price),
        discount: Number(item.discount),
        note: item.note || undefined,
        conditionType: "normal",
      }))
    );
    setSelectedCustomer(consignment.customer || null);
    setSelectedPriceBookId(consignment.priceBookId ?? null);
    setSelectedPriceBookName(consignment.priceBookName ?? null);
    setDiscount(Number(consignment.discount) || 0);
    setDiscountRatio(Number(consignment.discountRatio) || 0);
    setOrderNote(consignment.description || "");
    setSoldById(consignment.soldById ?? null);
    setConsignStatus(
      consignment.consignStatus === "confirmed" ? "confirmed" : "pending"
    );
    if (consignment.delivery) {
      setDeliveryInfo({
        receiver: consignment.delivery.receiver || "",
        contactNumber: consignment.delivery.contactNumber || "",
        detailAddress: consignment.delivery.address || "",
        locationName: consignment.delivery.locationName || "",
        wardName: consignment.delivery.wardName || "",
        weight: Number(consignment.delivery.weight) || 0,
        weightUnit: consignment.delivery.weightUnit || "g",
        length: Number(consignment.delivery.length) || 10,
        width: Number(consignment.delivery.width) || 10,
        height: Number(consignment.delivery.height) || 10,
        noteForDriver: consignment.delivery.noteForDriver || "",
      });
    }
  }, [consignment]);

  const updateCartItem = (rowId: string, updates: Partial<CartItem>) => {
    setCartItems((prev) =>
      prev.map((it) => (it.rowId === rowId ? { ...it, ...updates } : it))
    );
  };

  const removeFromCart = (rowId: string) => {
    setCartItems((prev) => prev.filter((it) => it.rowId !== rowId));
  };

  const duplicateCartItem = (item: CartItem) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((it) => it.rowId === item.rowId);
      const clone: CartItem = {
        ...item,
        rowId: `${item.product.id}_${item.conditionType || "normal"}_${Date.now()}_${Math.random()}`,
        quantity: 1,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  };

  const addToCart = async (
    product: any,
    conditionType: string = "normal",
    quantity: number = 1
  ) => {
    if (isFormDisabled) return;
    let productPrice = Number(product.basePrice);

    if (selectedPriceBookId && selectedPriceBookId !== 0) {
      try {
        const priceInfo = await priceBooksApi.getPriceForProduct({
          productId: product.id,
          branchId: selectedBranch?.id,
          priceBookId: selectedPriceBookId ?? undefined,
        });
        if (priceInfo.priceBookId === selectedPriceBookId) {
          productPrice = priceInfo.price;
        } else {
          productPrice = Number(product.basePrice);
          toast.warning(
            `Sản phẩm "${product.name}" không có trong bảng giá đang chọn, dùng giá gốc ${productPrice.toLocaleString()}`
          );
        }
      } catch {
        productPrice = Number(product.basePrice);
      }
    }

    setCartItems((prev) => [
      {
        rowId: `${product.id}_${conditionType}_${Date.now()}`,
        product,
        quantity,
        price: productPrice,
        discount: 0,
        conditionType,
      },
      ...prev,
    ]);
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    if (customer) {
      const addr = getDefaultAddress(customer.addresses);
      const info = addressToDeliveryInfo(customer, addr);
      setSelectedAddressId(addr?.id ?? null);
      setDeliveryInfo((prev) => ({ ...prev, ...info }));
    } else {
      setSelectedAddressId(null);
      setDeliveryInfo(EMPTY_DELIVERY);
    }
  };

  const handleSelectAddress = (addr: any) => {
    setSelectedAddressId(addr?.id ?? null);
    const info = addressToDeliveryInfo(selectedCustomer, addr);
    setDeliveryInfo((prev) => ({ ...prev, ...info }));
  };

  const handlePriceBookSelect = async (
    priceBookId: number | null,
    priceBookName: string | null
  ) => {
    setSelectedPriceBookId(priceBookId);
    setSelectedPriceBookName(priceBookName);
    // Re-price toàn bộ dòng theo bảng giá mới.
    if (priceBookId && priceBookId !== 0 && cartItems.length > 0) {
      const repriced = await Promise.all(
        cartItems.map(async (it) => {
          try {
            const priceInfo = await priceBooksApi.getPriceForProduct({
              productId: it.product.id,
              branchId: selectedBranch?.id,
              priceBookId,
            });
            const newPrice =
              priceInfo.priceBookId === priceBookId
                ? priceInfo.price
                : Number(it.product.basePrice);
            return { ...it, price: newPrice };
          } catch {
            return it;
          }
        })
      );
      setCartItems(repriced);
    }
  };

  const handleSubmit = async () => {
    if (!branchId) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }
    if (!selectedCustomer?.id) {
      toast.error("Vui lòng chọn khách hàng");
      return;
    }
    if (cartItems.length === 0) {
      toast.error("Vui lòng thêm ít nhất một sản phẩm");
      return;
    }
    if (cartItems.some((it) => it.quantity <= 0)) {
      toast.error("Vui lòng nhập số lượng hợp lệ cho tất cả sản phẩm");
      return;
    }

    const payload: any = {
      customerId: selectedCustomer.id,
      branchId,
      priceBookId: selectedPriceBookId ?? undefined,
      soldById: soldById ?? currentUser?.id,
      consignStatus,
      description: orderNote,
      discountAmount: Number(discount) || 0,
      discountRatio: Number(discountRatio) || 0,
      items: cartItems.map((it) => ({
        productId: Number(it.product.id),
        quantity: Number(it.quantity),
        unitPrice: Number(it.price),
        discount: Number(it.discount) || 0,
        note: it.note || "",
        conditionType: it.conditionType || "normal",
      })),
      delivery: {
        receiver: deliveryInfo.receiver,
        contactNumber: deliveryInfo.contactNumber,
        address: deliveryInfo.detailAddress,
        locationName: deliveryInfo.locationName,
        wardName: deliveryInfo.wardName,
        weight: deliveryInfo.weight,
        weightUnit: deliveryInfo.weightUnit,
        length: deliveryInfo.length,
        width: deliveryInfo.width,
        height: deliveryInfo.height,
        noteForDriver: deliveryInfo.noteForDriver,
      },
    };

    try {
      if (consignment?.id) {
        await updateConsignment.mutateAsync({
          id: consignment.id,
          data: payload,
        });
      } else {
        await createConsignment.mutateAsync(payload);
      }
      router.push("/don-hang/ky-gui");
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra");
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header: nút đóng + product search */}
      <div className="bg-white border-b px-3 lg:px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.push("/don-hang/ky-gui")}
          className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-base lg:text-lg font-semibold shrink-0 whitespace-nowrap">
          {consignment ? "Cập nhật phiếu ký gửi" : "Tạo phiếu ký gửi"}
        </h2>
        <div className="flex-1 max-w-xl">
          {!isFormDisabled && (
            <ProductSearchDropdown
              onAddProduct={addToCart}
              selectedPriceBookId={selectedPriceBookId}
            />
          )}
        </div>
      </div>

      {/* Body 2 cột */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="flex flex-col w-full lg:w-[60%] min-h-0 flex-1 lg:flex-none">
          <OrderItemsList
            cartItems={cartItems}
            onUpdateItem={updateCartItem}
            onRemoveItem={removeFromCart}
            onDuplicateItem={duplicateCartItem}
            discount={discount}
            onDiscountChange={setDiscount}
            discountRatio={discountRatio}
            onDiscountRatioChange={setDiscountRatio}
            orderNote={orderNote}
            onOrderNoteChange={setOrderNote}
            selectedCustomerId={selectedCustomer?.id}
            canEditPrice={canEditPrice}
            canEditDiscount={canEditDiscount}
            canViewInventory={canViewInventory}
            className="w-full flex-1 bg-white flex flex-col min-h-0"
          />
        </div>

        <ConsignmentCart
          className="w-full lg:w-[40%] h-full bg-white border-l flex flex-col min-h-0"
          cartItems={cartItems}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={handleCustomerSelect}
          selectedPriceBookId={selectedPriceBookId}
          selectedPriceBookName={selectedPriceBookName}
          onSelectPriceBook={handlePriceBookSelect}
          discount={discount}
          discountRatio={discountRatio}
          onDiscountChange={setDiscount}
          deliveryInfo={deliveryInfo}
          onDeliveryInfoChange={setDeliveryInfo}
          onSelectAddress={handleSelectAddress}
          selectedAddressId={selectedAddressId}
          soldById={soldById}
          onSellerChange={setSoldById}
          consignStatus={consignStatus}
          onConsignStatusChange={setConsignStatus}
          onSubmit={handleSubmit}
          isEditMode={!!consignment}
          isSubmitting={
            createConsignment.isPending || updateConsignment.isPending
          }
          disabled={isFormDisabled}
        />
      </div>
    </div>
  );
}
