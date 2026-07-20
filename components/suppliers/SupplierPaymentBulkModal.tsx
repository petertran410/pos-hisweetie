"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseOrdersApi } from "@/lib/api/purchase-orders";
import { cashflowsApi } from "@/lib/api/cashflows";
import { useAuthStore } from "@/lib/store/auth";
import { formatCurrency } from "@/lib/utils";
import {
  X,
  Calendar,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useBranchStore } from "@/lib/store/branch";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import { createPortal } from "react-dom";
import { useSupplier } from "@/lib/hooks/useSuppliers";
import { useExchangeRate } from "@/lib/hooks/useExchangeRate";
import { useUsersForFilter } from "@/lib/hooks/useUsers";

interface SupplierPaymentBulkModalProps {
  supplierId: number;
  supplierDebt: number;
  onClose: () => void;
}

const formatNumberInput = (
  value: string,
  maximumFractionDigits?: number
): string => {
  const numericValue = value.replace(/,/g, "");
  if (!numericValue || isNaN(Number(numericValue))) return "0";
  return Number(numericValue).toLocaleString("en-US", {
    maximumFractionDigits,
  });
};

const parseNumberInput = (value: string): number => {
  const numericValue = value.replace(/,/g, "");
  return Number(numericValue) || 0;
};

const getSafeCNYAmount = (amountVND: number, exchangeRate: number): number => {
  if (amountVND <= 0 || exchangeRate <= 0) return 0;
  return Math.floor((amountVND * 100) / exchangeRate) / 100;
};

const formatCNY = (value: number) =>
  `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value)} CNY`;

const formatDateTime = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const parseDateTime = (value: string) => {
  const parts = value.trim().split(" ");
  if (parts.length !== 2) return new Date();

  const dateParts = parts[0].split("/");
  const timeParts = parts[1].split(":");

  if (dateParts.length !== 3 || timeParts.length !== 2) return new Date();

  const day = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1;
  const year = parseInt(dateParts[2]);
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);

  return new Date(year, month, day, hours, minutes);
};

const formatExchangeRateInput = (
  value: number | string | undefined
): string => {
  if (value == null || value === "") return "";
  const normalized = String(value).replace(/,/g, "");
  if (!/^\d*(?:\.\d*)?$/.test(normalized)) return "";

  const [integerPart = "", decimalPart] = normalized.split(".");
  const formattedInteger = integerPart
    ? new Intl.NumberFormat("en-US").format(Number(integerPart))
    : "";

  if (decimalPart !== undefined) {
    return `${formattedInteger}.${decimalPart.slice(0, 2)}`;
  }

  return formattedInteger;
};

export function SupplierPaymentBulkModal({
  supplierId,
  supplierDebt,
  onClose,
}: SupplierPaymentBulkModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();

  const { data: supplierData } = useSupplier(supplierId);
  const isImport = useMemo(() => {
    return (
      supplierData?.supplierGroupDetails?.some(
        (d) => d.supplierGroupId === 1
      ) ?? false
    );
  }, [supplierData]);

  const [exchangeRate, setExchangeRate] = useState("");
  const lastValidExchangeRate = useRef(0);
  const liveRateQuery = useExchangeRate("CNY", "VND");

  const [transDate, setTransDate] = useState("");
  const [transDateTime, setTransDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [collectorUserId, setCollectorUserId] = useState<string>("");
  const [showCollectorDropdown, setShowCollectorDropdown] = useState(false);
  const [method, setMethod] = useState("cash");
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [allocateToPurchaseOrders, setAllocateToPurchaseOrders] =
    useState(true);
  const [purchaseOrderPayments, setPurchaseOrderPayments] = useState<
    Record<number, string>
  >({});
  const [purchaseOrderDebtOffsets, setPurchaseOrderDebtOffsets] = useState<
    Record<number, string>
  >({});
  const debtOffsetsInitialized = useRef(false);

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [mounted, setMounted] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);
  const collectorDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const { data: usersData } = useUsersForFilter();
  const users = usersData || [];
  const { data: bankAccountsData } = useBankAccountsForPayment();
  const bankAccounts = bankAccountsData || [];

  const { data: poData, isLoading } = useQuery({
    queryKey: ["purchase-orders", "supplier", supplierId, "unpaid"],
    queryFn: () =>
      purchaseOrdersApi.getAll({
        supplierId,
        pageSize: 1000,
      }),
    enabled: !!supplierId,
  });

  const createPayment = useMutation({
    mutationFn: cashflowsApi.createSupplierPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-debt-timeline"] });
      alert("Trả tiền nhà cung cấp thành công!");
      onClose();
    },
    onError: (error: any) => {
      alert(error.message || "Có lỗi xảy ra khi trả tiền");
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user?.id) {
      setCollectorUserId(user.id.toString());
      setTransDateTime(new Date());
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        collectorDropdownRef.current &&
        !collectorDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCollectorDropdown(false);
      }
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
      if (
        timePickerRef.current &&
        !timePickerRef.current.contains(event.target as Node)
      ) {
        setShowTimePicker(false);
      }
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAccountDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unpaidPurchaseOrders = useMemo(() => {
    return (
      (poData as any)?.data
        ?.filter((po: any) => {
          const debtAmount = Number(po.debtAmount);
          if (debtAmount <= 0) return false;
          if (po.isDraft) return false;
          if (po.status === 2) return false; // CANCELLED
          return true;
        })
        .sort(
          (a: any, b: any) =>
            new Date(a.purchaseDate).getTime() -
            new Date(b.purchaseDate).getTime()
        ) || []
    );
  }, [poData]);

  const hasCNYOrders = unpaidPurchaseOrders.some(
    (po: any) => po.currency === "CNY"
  );

  const isCNYOrder = (po: any) => po.currency === "CNY";
  const getInputAmountVND = (po: any, value: string, rate: number) =>
    isCNYOrder(po)
      ? Math.round(parseNumberInput(value) * rate)
      : parseNumberInput(value);
  const getPOOriginalRate = (po: any) => Number(po.exchangeRate) || 1;
  const getPOForeignTotal = (po: any) =>
    Number(po.subTotal || po.total) / getPOOriginalRate(po);
  const getPOForeignPaid = (po: any) => {
    const originalRate = getPOOriginalRate(po);
    const paymentTotal = (po.payments || []).reduce(
      (sum: number, payment: any) =>
        sum +
        (payment.foreignAmount != null
          ? Number(payment.foreignAmount)
          : Number(payment.amount || 0) / originalRate),
      0
    );
    const offsetTotal = (po.supplierReturns || []).reduce(
      (sum: number, offset: any) =>
        sum +
        (offset.refundedForeignAmount != null
          ? Number(offset.refundedForeignAmount)
          : Number(offset.refundedAmount || 0) / originalRate),
      0
    );
    return paymentTotal + offsetTotal;
  };
  const getPOForeignDebt = (po: any) =>
    Math.max(0, getPOForeignTotal(po) - getPOForeignPaid(po));

  useEffect(() => {
    if (
      (isImport || hasCNYOrders) &&
      liveRateQuery.data?.rate &&
      !exchangeRate
    ) {
      const liveRate = Number(liveRateQuery.data.rate);
      setExchangeRate(formatExchangeRateInput(liveRate));
      lastValidExchangeRate.current = liveRate;
    }
  }, [isImport, hasCNYOrders, liveRateQuery.data, exchangeRate]);

  const totalPages = Math.ceil(unpaidPurchaseOrders.length / pageSize);
  const paginatedPOs = unpaidPurchaseOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const availableCredit = useMemo(() => {
    const totalUnpaid = unpaidPurchaseOrders.reduce(
      (sum: number, po: any) => sum + Number(po.debtAmount),
      0
    );
    return Math.max(0, totalUnpaid - supplierDebt);
  }, [unpaidPurchaseOrders, supplierDebt]);

  useEffect(() => {
    if (debtOffsetsInitialized.current || unpaidPurchaseOrders.length === 0)
      return;

    const effectiveRateVal = parseNumberInput(exchangeRate) || 0;
    if (isCNYOrder(unpaidPurchaseOrders[0]) && effectiveRateVal <= 0) return;
    debtOffsetsInitialized.current = true;

    if (availableCredit <= 0) return;

    const oldestPO = unpaidPurchaseOrders[0];

    let defaultOffset: number;
    if (isCNYOrder(oldestPO)) {
      const maxOffsetVND = Math.min(
        availableCredit,
        Number(oldestPO.debtAmount)
      );
      defaultOffset = Math.min(
        getSafeCNYAmount(maxOffsetVND, effectiveRateVal),
        getPOForeignDebt(oldestPO)
      );
    } else {
      defaultOffset = Math.min(availableCredit, Number(oldestPO.debtAmount));
    }
    if (defaultOffset > 0) {
      setPurchaseOrderDebtOffsets({
        [oldestPO.id]: formatNumberInput(
          defaultOffset.toString(),
          isCNYOrder(oldestPO) ? 2 : undefined
        ),
      });
    }
  }, [unpaidPurchaseOrders, availableCredit, exchangeRate]);

  const handlePODebtOffsetChange = (poId: number, value: string) => {
    const po = unpaidPurchaseOrders.find((p: any) => p.id === poId);
    if (!po) return;

    const numericValue = parseNumberInput(value);
    const effectiveRateVal = parseNumberInput(exchangeRate) || 1;

    if (isCNYOrder(po)) {
      const otherTotalVND = Object.entries(purchaseOrderDebtOffsets)
        .filter(([id]) => Number(id) !== poId)
        .reduce(
          (sum, [id, amt]) => {
            const otherPO = unpaidPurchaseOrders.find(
              (item: any) => item.id === Number(id)
            );
            return (
              sum +
              (otherPO
                ? getInputAmountVND(otherPO, amt, effectiveRateVal)
                : 0)
            );
          },
          0
        );

      const remainingCreditVND = Math.max(0, availableCredit - otherTotalVND);
      const maxAmountVND = Math.min(Number(po.debtAmount), remainingCreditVND);
      const maxAmountCNY = Math.min(
        getSafeCNYAmount(maxAmountVND, effectiveRateVal),
        getPOForeignDebt(po)
      );
      const limitedValue = Math.min(numericValue, maxAmountCNY);
      const formatted =
        numericValue <= maxAmountCNY
          ? formatExchangeRateInput(value)
          : formatNumberInput(limitedValue.toString(), 2);
      const appliedOffsetCNY = parseNumberInput(formatted);

      setPurchaseOrderDebtOffsets((prev) => ({
        ...prev,
        [poId]: formatted,
      }));

      // Cap lại tiền trả nếu vượt phần còn lại sau cấn trừ
      const currentPaymentCNY = parseNumberInput(
        purchaseOrderPayments[poId] || "0"
      );
      const debtAfterOffsetVND = Math.max(
        0,
        Number(po.debtAmount) - Math.round(appliedOffsetCNY * effectiveRateVal)
      );
      const maxPaymentCNY = getSafeCNYAmount(
        debtAfterOffsetVND,
        effectiveRateVal
      );
      const maxForeignPaymentCNY = Math.max(
        0,
        getPOForeignDebt(po) - appliedOffsetCNY
      );
      const limitedPaymentCNY = Math.min(
        maxPaymentCNY,
        maxForeignPaymentCNY
      );
      if (currentPaymentCNY > limitedPaymentCNY) {
        setPurchaseOrderPayments((prev) => ({
          ...prev,
          [poId]: formatNumberInput(limitedPaymentCNY.toString(), 2),
        }));
      }
    } else {
      const otherTotal = Object.entries(purchaseOrderDebtOffsets)
        .filter(([id]) => Number(id) !== poId)
        .reduce((sum, [id, amt]) => {
          const otherPO = unpaidPurchaseOrders.find(
            (item: any) => item.id === Number(id)
          );
          return (
            sum +
            (otherPO
              ? getInputAmountVND(otherPO, amt, effectiveRateVal)
              : 0)
          );
        }, 0);

      const remaining = Math.max(0, availableCredit - otherTotal);
      const maxAmount = Math.min(Number(po.debtAmount), remaining);
      const limitedValue = Math.min(numericValue, maxAmount);
      const formatted = formatNumberInput(limitedValue.toString());
      setPurchaseOrderDebtOffsets((prev) => ({
        ...prev,
        [poId]: formatted,
      }));

      // Cap lại tiền trả nếu vượt phần còn lại sau cấn trừ
      const currentPayment = parseNumberInput(
        purchaseOrderPayments[poId] || "0"
      );
      const maxPayment = Math.max(0, Number(po.debtAmount) - limitedValue);
      if (currentPayment > maxPayment) {
        setPurchaseOrderPayments((prev) => ({
          ...prev,
          [poId]: formatNumberInput(maxPayment.toString()),
        }));
      }
    }
  };

  const handleDateSelect = (date: Date) => {
    const newDateTime = new Date(transDateTime);
    newDateTime.setFullYear(date.getFullYear());
    newDateTime.setMonth(date.getMonth());
    newDateTime.setDate(date.getDate());
    setTransDateTime(newDateTime);
    setShowDatePicker(false);
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    const newDateTime = new Date(transDateTime);
    newDateTime.setHours(hours);
    newDateTime.setMinutes(minutes);
    setTransDateTime(newDateTime);
    setShowTimePicker(false);
  };

  const handleTotalAmountChange = (
    value: string,
    rateInput = exchangeRate,
    debtOffsets = purchaseOrderDebtOffsets
  ) => {
    const formatted = formatNumberInput(value);
    setTotalAmount(formatted);

    if (allocateToPurchaseOrders && unpaidPurchaseOrders.length > 0) {
      const numericAmount = parseNumberInput(value);
      if (numericAmount > 0) {
        const newPayments: Record<number, string> = {};
        const effectiveRateVal = parseNumberInput(rateInput) || 1;

        let remainingVND = numericAmount;
        for (const po of unpaidPurchaseOrders) {
          if (remainingVND <= 0) break;
          const debtOffsetVND = getInputAmountVND(
            po,
            debtOffsets[po.id] || "0",
            effectiveRateVal
          );
          const maxForPOVND = Math.max(
            0,
            Number(po.debtAmount) - debtOffsetVND
          );
          const maxForeignVND = isCNYOrder(po)
            ? Math.round(
                Math.max(
                  0,
                  getPOForeignDebt(po) -
                    parseNumberInput(debtOffsets[po.id] || "0")
                ) * effectiveRateVal
              )
            : maxForPOVND;
          const paymentVND = Math.min(
            remainingVND,
            maxForPOVND,
            maxForeignVND
          );
          if (isCNYOrder(po)) {
            const paymentCNY = getSafeCNYAmount(paymentVND, effectiveRateVal);
            if (paymentCNY <= 0) continue;
            newPayments[po.id] = formatNumberInput(paymentCNY.toString(), 2);
            remainingVND -= Math.round(paymentCNY * effectiveRateVal);
          } else {
            newPayments[po.id] = formatNumberInput(paymentVND.toString());
            remainingVND -= paymentVND;
          }
        }

        setPurchaseOrderPayments(newPayments);
      } else {
        setPurchaseOrderPayments({});
      }
    }
  };

  const handleExchangeRateChange = (value: string) => {
    const nextRateInput = formatExchangeRateInput(value);
    const previousRate = lastValidExchangeRate.current;
    const nextRate = parseNumberInput(nextRateInput);
    let nextDebtOffsets = purchaseOrderDebtOffsets;

    if (previousRate > 0 && nextRate > 0) {
      let remainingCreditVND = availableCredit;
      nextDebtOffsets = {};

      for (const po of unpaidPurchaseOrders) {
        if (!isCNYOrder(po)) {
          const currentOffset = purchaseOrderDebtOffsets[po.id];
          if (currentOffset) nextDebtOffsets[po.id] = currentOffset;
          remainingCreditVND -= parseNumberInput(currentOffset || "0");
          continue;
        }
        const currentOffsetCNY = parseNumberInput(
          purchaseOrderDebtOffsets[po.id] || "0"
        );
        if (currentOffsetCNY <= 0) continue;

        const currentOffsetVND = Math.round(currentOffsetCNY * previousRate);
        const maxOffsetVND = Math.min(
          currentOffsetVND,
          Number(po.debtAmount),
          remainingCreditVND
        );
        const nextOffsetCNY = getSafeCNYAmount(maxOffsetVND, nextRate);
        if (nextOffsetCNY <= 0) continue;

        nextDebtOffsets[po.id] = formatNumberInput(nextOffsetCNY.toString(), 2);
        remainingCreditVND -= Math.round(nextOffsetCNY * nextRate);
      }

      setPurchaseOrderDebtOffsets(nextDebtOffsets);
      lastValidExchangeRate.current = nextRate;
    }

    setExchangeRate(nextRateInput);
    if (nextRate > 0) {
      handleTotalAmountChange(totalAmount, nextRateInput, nextDebtOffsets);
    } else {
      setPurchaseOrderPayments({});
    }
  };

  const handlePOPaymentChange = (poId: number, value: string) => {
    const po = unpaidPurchaseOrders.find((p: any) => p.id === poId);
    if (!po) return;

    const numericValue = parseNumberInput(value);

    if (isCNYOrder(po)) {
      const effectiveRateVal = parseNumberInput(exchangeRate) || 1;
      const debtOffsetCNY = parseNumberInput(
        purchaseOrderDebtOffsets[poId] || "0"
      );
      const debtOffsetVND = Math.round(debtOffsetCNY * effectiveRateVal);
      const maxAmountVND = Math.max(0, Number(po.debtAmount) - debtOffsetVND);
      const maxAmountCNY = Math.min(
        getSafeCNYAmount(maxAmountVND, effectiveRateVal),
        Math.max(0, getPOForeignDebt(po) - debtOffsetCNY)
      );
      const limitedValue = Math.min(numericValue, maxAmountCNY);
      const formatted =
        numericValue <= maxAmountCNY
          ? formatExchangeRateInput(value)
          : formatNumberInput(limitedValue.toString(), 2);
      setPurchaseOrderPayments((prev) => ({
        ...prev,
        [poId]: formatted,
      }));
    } else {
      const debtOffsetForPO = parseNumberInput(
        purchaseOrderDebtOffsets[poId] || "0"
      );
      const maxAmount = Math.max(0, Number(po.debtAmount) - debtOffsetForPO);
      const limitedValue = Math.min(numericValue, maxAmount);
      const formatted = formatNumberInput(limitedValue.toString());
      setPurchaseOrderPayments((prev) => ({
        ...prev,
        [poId]: formatted,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!selectedBranch) {
      alert("Vui lòng chọn chi nhánh");
      return;
    }

    if (!collectorUserId) {
      alert("Vui lòng chọn người chi");
      return;
    }

    const rate = parseNumberInput(exchangeRate);
    if (hasCNYOrders && rate <= 0) {
      alert("Vui lòng nhập tỉ giá quy đổi hợp lệ");
      return;
    }
    const finalTransDate = transDate ? parseDateTime(transDate) : transDateTime;

    const debtOffsetsToApply = Object.entries(purchaseOrderDebtOffsets)
      .filter(([_, amount]) => parseNumberInput(amount) > 0)
      .map(([poId, amount]) => {
        const po = unpaidPurchaseOrders.find(
          (item: any) => item.id === Number(poId)
        );
        const inputAmount = parseNumberInput(amount);
        const cny = po && isCNYOrder(po);
        return {
          purchaseOrderId: Number(poId),
          amount: cny ? Math.round(inputAmount * rate) : inputAmount,
          exchangeRate: cny ? rate : undefined,
          foreignAmount: cny ? inputAmount : undefined,
        };
      });
    const hasDebtOffsets = debtOffsetsToApply.length > 0;

    if (
      method === "transfer" &&
      !selectedAccountId &&
      (parseNumberInput(totalAmount) > 0 ||
        Object.values(purchaseOrderPayments).some(
          (v) => parseNumberInput(v) > 0
        ))
    ) {
      alert("Vui lòng chọn tài khoản ngân hàng");
      return;
    }

    const totalDebtOffset = debtOffsetsToApply.reduce(
      (sum, d) => sum + d.amount,
      0
    );
    const availableCreditVND = availableCredit;
    if (totalDebtOffset > availableCreditVND) {
      alert(
        `Tổng cấn trừ nợ (${formatCurrency(totalDebtOffset)}) vượt quá giới hạn cho phép (${formatCurrency(availableCreditVND)})`
      );
      return;
    }

    let purchaseOrdersToPay: Array<{
      purchaseOrderId: number;
      amount: number;
      exchangeRate?: number;
      foreignAmount?: number;
    }> = [];
    let finalTotalAmount = parseNumberInput(totalAmount);

    if (allocateToPurchaseOrders) {
      purchaseOrdersToPay = Object.entries(purchaseOrderPayments)
        .filter(([_, amount]) => parseNumberInput(amount) > 0)
        .map(([poId, amount]) => {
          const po = unpaidPurchaseOrders.find(
            (item: any) => item.id === Number(poId)
          );
          const inputAmount = parseNumberInput(amount);
          const cny = po && isCNYOrder(po);
          return {
            purchaseOrderId: Number(poId),
            amount: cny ? Math.round(inputAmount * rate) : inputAmount,
            exchangeRate: cny ? rate : undefined,
            foreignAmount: cny ? inputAmount : undefined,
          };
        });

      if (
        finalTotalAmount <= 0 &&
        purchaseOrdersToPay.length === 0 &&
        !hasDebtOffsets
      ) {
        alert("Vui lòng nhập số tiền thanh toán hoặc cấn trừ nợ");
        return;
      }

      if (finalTotalAmount <= 0 && purchaseOrdersToPay.length > 0) {
        finalTotalAmount = purchaseOrdersToPay.reduce(
          (sum, p) => sum + p.amount,
          0
        );
      }

      const debtOffsetByPO = new Map(
        debtOffsetsToApply.map((offset) => [
          offset.purchaseOrderId,
          offset.amount,
        ])
      );
      for (const payment of purchaseOrdersToPay) {
        const po = unpaidPurchaseOrders.find(
          (item: any) => item.id === payment.purchaseOrderId
        );
        const totalApplied =
          payment.amount + (debtOffsetByPO.get(payment.purchaseOrderId) || 0);
        if (po && totalApplied > Number(po.debtAmount)) {
          alert(
            `Tổng tiền trả và cấn trừ cho phiếu ${po.code} (${formatCurrency(totalApplied)}) vượt quá công nợ (${formatCurrency(Number(po.debtAmount))}). Vui lòng nhập lại số tiền.`
          );
          return;
        }
      }
    } else {
      if (finalTotalAmount <= 0 && !hasDebtOffsets) {
        alert("Vui lòng nhập số tiền thanh toán");
        return;
      }
    }

    await createPayment.mutateAsync({
      supplierId,
      totalAmount: finalTotalAmount,
      branchId: selectedBranch.id,
      transDate: finalTransDate.toISOString(),
      method,
      collectorUserId: Number(collectorUserId),
      description,
      allocateToPurchaseOrders,
      purchaseOrders:
        purchaseOrdersToPay.length > 0 ? purchaseOrdersToPay : undefined,
      debtOffsets:
        debtOffsetsToApply.length > 0 ? debtOffsetsToApply : undefined,
      accountId: selectedAccountId || undefined,
    });
  };

  const selectedCollector = users.find(
    (u: any) => u.id === Number(collectorUserId)
  );

  const methodLabels: Record<string, string> = {
    cash: "Tiền mặt",
    transfer: "Chuyển khoản",
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99]">
      <div className="bg-white rounded-lg max-w-[84rem] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold">Trả tiền nhà cung cấp</h3>
            <p className="text-sm text-gray-600">
              Nợ hiện tại: {formatCurrency(supplierDebt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Thời gian
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={transDate}
                  onChange={(e) => setTransDate(e.target.value)}
                  placeholder={formatDateTime(transDateTime)}
                  className="w-full px-3 py-2 border rounded-lg pr-20"
                />
                <div className="absolute right-3 top-2.5 flex items-center gap-2">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    type="button">
                    <Calendar className="w-4 h-4 text-gray-400 cursor-pointer" />
                  </button>
                  <button
                    onClick={() => setShowTimePicker(!showTimePicker)}
                    type="button">
                    <Clock className="w-4 h-4 text-gray-400 cursor-pointer" />
                  </button>
                </div>

                {showDatePicker && (
                  <div
                    ref={datePickerRef}
                    className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-4 z-50">
                    <div className="text-center mb-2">
                      <select
                        value={transDateTime.getMonth()}
                        onChange={(e) => {
                          const newDate = new Date(transDateTime);
                          newDate.setMonth(Number(e.target.value));
                          setTransDateTime(newDate);
                        }}
                        className="border rounded px-2 py-1 mr-2">
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            Tháng {i + 1}
                          </option>
                        ))}
                      </select>
                      <select
                        value={transDateTime.getFullYear()}
                        onChange={(e) => {
                          const newDate = new Date(transDateTime);
                          newDate.setFullYear(Number(e.target.value));
                          setTransDateTime(newDate);
                        }}
                        className="border rounded px-2 py-1">
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - 5 + i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 42 }, (_, i) => {
                        const firstDay = new Date(
                          transDateTime.getFullYear(),
                          transDateTime.getMonth(),
                          1
                        );
                        const startDay = firstDay.getDay();
                        const dayNumber = i - startDay + 1;
                        const daysInMonth = new Date(
                          transDateTime.getFullYear(),
                          transDateTime.getMonth() + 1,
                          0
                        ).getDate();

                        if (dayNumber < 1 || dayNumber > daysInMonth) {
                          return <div key={i} className="w-8 h-8" />;
                        }

                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const newDate = new Date(
                                transDateTime.getFullYear(),
                                transDateTime.getMonth(),
                                dayNumber
                              );
                              handleDateSelect(newDate);
                            }}
                            className={`w-8 h-8 rounded hover:bg-brand-soft ${
                              dayNumber === transDateTime.getDate()
                                ? "bg-brand text-white"
                                : ""
                            }`}>
                            {dayNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {showTimePicker && (
                  <div
                    ref={timePickerRef}
                    className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-4 z-50 w-64">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-2">Giờ</label>
                        <div className="h-40 overflow-y-auto border rounded">
                          {Array.from({ length: 24 }, (_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                handleTimeSelect(i, transDateTime.getMinutes())
                              }
                              className={`w-full px-2 py-1 text-left hover:bg-brand-soft ${
                                i === transDateTime.getHours()
                                  ? "bg-brand text-white"
                                  : ""
                              }`}>
                              {String(i).padStart(2, "0")}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm mb-2">Phút</label>
                        <div className="h-40 overflow-y-auto border rounded">
                          {Array.from({ length: 60 }, (_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                handleTimeSelect(transDateTime.getHours(), i)
                              }
                              className={`w-full px-2 py-1 text-left hover:bg-brand-soft ${
                                i === transDateTime.getMinutes()
                                  ? "bg-brand text-white"
                                  : ""
                              }`}>
                              {String(i).padStart(2, "0")}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative" ref={collectorDropdownRef}>
              <label className="block text-sm font-medium mb-2">
                Người chi
              </label>
              <button
                onClick={() => setShowCollectorDropdown(!showCollectorDropdown)}
                className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                <span className={selectedCollector ? "" : "text-gray-400"}>
                  {selectedCollector
                    ? selectedCollector.name
                    : "Chọn người chi"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showCollectorDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {users.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCollectorUserId(u.id.toString());
                        setShowCollectorDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100">
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <div
              className={`grid ${hasCNYOrders ? "grid-cols-3" : "grid-cols-2"} gap-4 mb-4`}>
              <div className="relative">
                <label className="block text-sm font-medium mb-2">
                  Phương thức thanh toán
                </label>
                <button
                  onClick={() => setShowMethodDropdown(!showMethodDropdown)}
                  className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                  <span>{methodLabels[method]}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showMethodDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => {
                        setMethod("cash");
                        setSelectedAccountId(null);
                        setShowMethodDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                      {method === "cash" && (
                        <span className="text-brand">✓</span>
                      )}
                      <span>Tiền mặt</span>
                    </button>
                    <button
                      onClick={() => {
                        setMethod("transfer");
                        setShowMethodDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                      {method === "transfer" && (
                        <span className="text-brand">✓</span>
                      )}
                      <span>Chuyển khoản</span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Số tiền (VND)
                </label>
                <input
                  type="text"
                  value={totalAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg text-right font-medium"
                />
                {hasCNYOrders && (
                  <span className="text-xs text-gray-500 mt-1 block">
                    Quy đổi:{" "}
                    <strong className="text-brand">
                      {new Intl.NumberFormat("en-US", {
                        maximumFractionDigits: 2,
                      }).format(
                        parseNumberInput(totalAmount) /
                          (parseNumberInput(exchangeRate) || 1)
                      )}{" "}
                      CNY
                    </strong>
                  </span>
                )}
              </div>

              {hasCNYOrders && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tỉ giá VND/CNY <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={exchangeRate}
                    onChange={(e) => handleExchangeRateChange(e.target.value)}
                    placeholder="Nhập tỉ giá..."
                    className="w-full px-3 py-2 border rounded-lg text-right font-semibold"
                  />
                </div>
              )}
            </div>

            {method === "transfer" && (
              <div className="relative" ref={accountDropdownRef}>
                <label className="block text-sm font-medium mb-2">
                  Tài khoản ngân hàng
                </label>
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                  <span className={selectedAccountId ? "" : "text-gray-400"}>
                    {selectedAccountId
                      ? (() => {
                          const account = bankAccounts.find(
                            (a: any) => a.id === selectedAccountId
                          );
                          return account
                            ? `${account.bankCode} - ${account.accountNumber}`
                            : "Chọn tài khoản";
                        })()
                      : "Chọn tài khoản"}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showAccountDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {bankAccounts.length > 0 ? (
                      bankAccounts.map((account: any) => (
                        <button
                          key={account.id}
                          onClick={() => {
                            setSelectedAccountId(account.id);
                            setShowAccountDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100">
                          <div className="font-medium text-sm">
                            {account.bankCode} - {account.accountNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            {account.accountHolder}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        Chưa có tài khoản ngân hàng
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Ghi chú</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              maxLength={1000}
              placeholder="Nhập ghi chú"
              className="w-full px-3 py-2 border rounded-lg resize-none"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allocateToPurchaseOrders}
                onChange={(e) => {
                  setAllocateToPurchaseOrders(e.target.checked);
                  if (!e.target.checked) {
                    setPurchaseOrderPayments({});
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">
                Phân bổ vào phiếu nhập
              </span>
            </label>
          </div>

          {allocateToPurchaseOrders && (
            <div className="border rounded-lg overflow-hidden">
              {availableCredit > 0 && (
                <div className="px-4 py-2 bg-brand-soft border-b text-xs text-brand-dark">
                  Có thể cấn trừ tối đa{" "}
                  <span className="font-semibold">
                    {formatCurrency(availableCredit)}
                    {hasCNYOrders && parseNumberInput(exchangeRate) > 0
                      ? ` (tương đương ${formatCNY(
                          availableCredit / parseNumberInput(exchangeRate)
                        )} theo tỉ giá thanh toán)`
                      : ""}
                  </span>{" "}
                  từ credit hiện có của nhà cung cấp
                </div>
              )}
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium">
                      Mã phiếu nhập
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium">
                      Thời gian
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium">
                      Giá trị phiếu
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium">
                      Đã trả
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium">
                      Còn cần trả
                    </th>
                    {availableCredit > 0 && (
                      <th className="px-4 py-3 text-right text-xs font-medium">
                        Cấn trừ nợ
                      </th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium">
                      Tiền trả
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidPurchaseOrders.length > 0 && (
                    <tr className="bg-gray-50 border-t font-semibold">
                      <td
                        colSpan={4}
                        className="px-4 py-2 text-right text-xs text-gray-600">
                        Tổng còn cần trả
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-red-600">
                        <span className="block">
                          {formatCurrency(
                            unpaidPurchaseOrders.reduce(
                              (sum: number, po: any) =>
                                sum + Number(po.debtAmount),
                              0
                            )
                          )}
                        </span>
                        {hasCNYOrders && (
                          <span className="block text-[10px] font-normal text-gray-500">
                            Phiếu CNY: {formatCNY(
                              unpaidPurchaseOrders.reduce(
                                (sum: number, po: any) =>
                                  sum +
                                  (isCNYOrder(po)
                                    ? getPOForeignDebt(po)
                                    : 0),
                                0
                              )
                            )}
                          </span>
                        )}
                      </td>
                      {availableCredit > 0 && <td />}
                      <td />
                    </tr>
                  )}
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={availableCredit > 0 ? 7 : 6}
                        className="px-4 py-8 text-center">
                        Đang tải...
                      </td>
                    </tr>
                  ) : unpaidPurchaseOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={availableCredit > 0 ? 7 : 6}
                        className="px-4 py-8 text-center text-gray-500">
                        Không có phiếu nhập nào cần thanh toán
                      </td>
                    </tr>
                  ) : (
                    paginatedPOs.map((po: any) => (
                      <tr key={po.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="text-brand">{po.code}</span>
                        </td>
                        <td className="px-4 py-3">
                          {new Date(po.purchaseDate).toLocaleString("en-US", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isCNYOrder(po) ? (
                            <>
                              <span>
                                {new Intl.NumberFormat("en-US", {
                                  maximumFractionDigits: 2,
                                }).format(
                                  getPOForeignTotal(po)
                                )}{" "}
                                CNY
                              </span>
                              <span className="block text-xs text-gray-400 font-normal">
                                ({formatCurrency(po.subTotal || po.total)})
                              </span>
                            </>
                          ) : (
                            formatCurrency(po.subTotal || po.total)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isCNYOrder(po) ? (
                            <>
                              <span>
                                {new Intl.NumberFormat("en-US", {
                                  maximumFractionDigits: 2,
                                }).format(
                                  getPOForeignPaid(po)
                                )}{" "}
                                CNY
                              </span>
                              <span className="block text-xs text-gray-400 font-normal">
                                ({formatCurrency(Number(po.paidAmount || 0))})
                              </span>
                            </>
                          ) : (
                            formatCurrency(Number(po.paidAmount || 0))
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {isCNYOrder(po) ? (
                            <>
                              <span className="text-brand">
                                {new Intl.NumberFormat("en-US", {
                                  maximumFractionDigits: 2,
                                }).format(
                                  getPOForeignDebt(po)
                                )}{" "}
                                CNY
                              </span>
                              <span className="block text-xs text-gray-400 font-normal">
                                ({formatCurrency(po.debtAmount)})
                              </span>
                            </>
                          ) : (
                            formatCurrency(po.debtAmount)
                          )}
                        </td>
                        {availableCredit > 0 && (
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={purchaseOrderDebtOffsets[po.id] || ""}
                              onChange={(e) =>
                                handlePODebtOffsetChange(po.id, e.target.value)
                              }
                              placeholder="0"
                              className="w-full px-2 py-1 border rounded text-right"
                            />
                            <span className="text-[10px] text-gray-400 block text-right">
                              Đơn vị: {isCNYOrder(po) ? "CNY" : "VND"}
                            </span>
                            {isCNYOrder(po) && purchaseOrderDebtOffsets[po.id] && (
                              <span className="text-[10px] text-gray-400 block text-right">
                                ={" "}
                                {formatCurrency(
                                  Math.round(
                                    parseNumberInput(
                                      purchaseOrderDebtOffsets[po.id]
                                    ) * (parseNumberInput(exchangeRate) || 1)
                                  )
                                )}
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={purchaseOrderPayments[po.id] || ""}
                            onChange={(e) =>
                              handlePOPaymentChange(po.id, e.target.value)
                            }
                            placeholder="0"
                            className="w-full px-2 py-1 border rounded text-right"
                          />
                          <span className="text-[10px] text-gray-400 block text-right">
                            Đơn vị: {isCNYOrder(po) ? "CNY" : "VND"}
                          </span>
                          {isCNYOrder(po) && purchaseOrderPayments[po.id] && (
                            <span className="text-[10px] text-gray-400 block text-right">
                              ={" "}
                              {formatCurrency(
                                Math.round(
                                  parseNumberInput(
                                    purchaseOrderPayments[po.id]
                                  ) * (parseNumberInput(exchangeRate) || 1)
                                )
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                  <div className="text-sm text-gray-600">
                    Hiển thị {paginatedPOs.length} /{" "}
                    {unpaidPurchaseOrders.length} phiếu nhập (Trang{" "}
                    {currentPage} / {totalPages})
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                      <ChevronLeft className="w-4 h-4" />
                      Trước
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                      Sau
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Bỏ qua
          </button>
          <button
            onClick={handleSubmit}
            disabled={createPayment.isPending}
            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50">
            {createPayment.isPending ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
