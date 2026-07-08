"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useCreateCashFlow } from "@/lib/hooks/useCashflows";
import { useCashFlowGroups } from "@/lib/hooks/useCashflowGroups";
import {
  useCustomer,
  useCustomers,
  useSearchCustomers,
} from "@/lib/hooks/useCustomers";
import { useSupplier, useSuppliers } from "@/lib/hooks/useSuppliers";
import { useExchangeRate } from "@/lib/hooks/useExchangeRate";
import { useUsers, useUsersForFilter } from "@/lib/hooks/useUsers";
import { useUnpaidInvoicesByPartner } from "@/lib/hooks/useInvoices";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { CreateCashFlowGroupModal } from "./CreateCashFlowGroupModal";
import { X, ChevronDown, Calendar, Clock } from "lucide-react";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import { useCollectionBranches } from "@/lib/hooks/useCashflowCollectionBranches";
import { CreateCashFlowCollectionBranchModal } from "./CreateCashFlowCollectionBranchModal";
import { invoicesApi } from "@/lib/api/invoices";
import { cashflowsApi } from "@/lib/api/cashflows";
import { purchaseOrdersApi } from "@/lib/api/purchase-orders";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface CreateCashFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "cash" | "bank" | "ewallet";
  isReceipt: boolean;
}

const TYPE_LABELS = {
  cash: "Tạo phiếu thu tiền mặt",
  bank: "Tạo phiếu thu ngân hàng",
  ewallet: "Tạo phiếu thu ví điện tử",
};

const PARTNER_TYPES = [
  { value: "C", label: "Khách hàng" },
  { value: "S", label: "Nhà cung cấp" },
  { value: "O", label: "Đối tác giao dịch" },
];

// ID nhóm NCC = "Nhập khẩu" — đối xứng logic ở OrderSupplierForm +
// SupplierPaymentBulkModal (groupId === 1 đánh dấu NCC nước ngoài).
const IMPORT_SUPPLIER_GROUP_ID = 1;

// Format số CNY (làm tròn 2 chữ số thập phân, dấu phẩy phân cách hàng nghìn)
const formatCNY = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value) + " CNY";

const formatNumberInput = (value: string) => {
  const number = value.replace(/\D/g, "");
  return new Intl.NumberFormat("en-US").format(Number(number) || 0);
};

const parseNumberInput = (value: string) => {
  return Number(value.replace(/,/g, "")) || 0;
};

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

export function CreateCashFlowModal({
  isOpen,
  onClose,
  type,
  isReceipt,
}: CreateCashFlowModalProps) {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const [transDate, setTransDate] = useState("");
  const [transDateTime, setTransDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [cashFlowGroupId, setCashFlowGroupId] = useState<string>("");
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [collectionBranchId, setCollectionBranchId] = useState<string>("");
  const [showCollectionBranchDropdown, setShowCollectionBranchDropdown] =
    useState(false);
  const [showCreateCollectionBranchModal, setShowCreateCollectionBranchModal] =
    useState(false);
  const [partnerType, setPartnerType] = useState("C");
  const [showPartnerTypeDropdown, setShowPartnerTypeDropdown] = useState(false);
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [debouncedPartnerSearch, setDebouncedPartnerSearch] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [collectorUserId, setCollectorUserId] = useState<string>("");

  const [showCollectorDropdown, setShowCollectorDropdown] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [usedForFinancialReporting, setUsedForFinancialReporting] =
    useState(false);
  const [affectDebt, setAffectDebt] = useState(true);
  const [allocateToInvoices, setAllocateToInvoices] = useState(true);
  const [invoicePayments, setInvoicePayments] = useState<
    Record<number, string>
  >({});

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const [invoiceDebtOffsets, setInvoiceDebtOffsets] = useState<
    Record<number, string>
  >({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ===== Tiền tệ ngoài nước (chỉ áp dụng cho phiếu chi NCC nước ngoài) =====
  const [exchangeRate, setExchangeRate] = useState("");
  // Phân bổ cho từng phiếu nhập (CNY)
  const [purchaseOrderPayments, setPurchaseOrderPayments] = useState<
    Record<number, string>
  >({});
  // Cấn trừ tiền trả thừa NCC vào PN còn nợ (CNY)
  const [purchaseOrderDebtOffsets, setPurchaseOrderDebtOffsets] = useState<
    Record<number, string>
  >({});
  const [poCurrentPage, setPoCurrentPage] = useState(1);
  const poDebtOffsetsInitialized = useRef(false);

  const debtOffsetsInitialized = useRef(false);

  // Fetch full supplier khi đã chọn NCC (cần supplierGroupDetails để detect
  // NCC nước ngoài — list suppliers dropdown không bao gồm).
  const { data: fullSupplierData } = useSupplier(
    partnerType === "S" && selectedPartner?.id ? selectedPartner.id : 0
  );
  const isImportSupplier = useMemo(() => {
    return (
      fullSupplierData?.supplierGroupDetails?.some(
        (d: any) => d.supplierGroupId === IMPORT_SUPPLIER_GROUP_ID
      ) ?? false
    );
  }, [fullSupplierData]);

  // Tiền tệ chỉ áp dụng cho phiếu chi NCC nước ngoài
  const showCurrencyFields =
    !isReceipt && partnerType === "S" && isImportSupplier;

  const liveRateQuery = useExchangeRate("CNY", "VND");

  // Auto-fill tỉ giá khi vừa chọn NCC nước ngoài (chỉ fill lần đầu, không
  // ghi đè khi user đã nhập tay)
  useEffect(() => {
    if (
      showCurrencyFields &&
      liveRateQuery.data?.rate &&
      !exchangeRate
    ) {
      setExchangeRate(String(liveRateQuery.data.rate));
    }
    if (!showCurrencyFields && exchangeRate) {
      setExchangeRate("");
    }
  }, [showCurrencyFields, liveRateQuery.data]);

  const { data: bankAccounts } = useBankAccountsForPayment();

  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const collectionBranchDropdownRef = useRef<HTMLDivElement>(null);
  const partnerTypeDropdownRef = useRef<HTMLDivElement>(null);
  const partnerDropdownRef = useRef<HTMLDivElement>(null);
  const collectorDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);

  const createCashFlow = useCreateCashFlow();
  const { data: cashFlowGroups } = useCashFlowGroups(isReceipt);
  const { data: collectionBranches } = useCollectionBranches();
  const branches = collectionBranches || [];
  const { data: customerSearchData } = useSearchCustomers(
    debouncedPartnerSearch || undefined
  );
  const { data: suppliersData } = useSuppliers({ pageSize: 100 });
  const { data: usersData } = useUsersForFilter();
  const { data: unpaidInvoicesData } = useQuery({
    queryKey: [
      "invoices",
      "customer",
      selectedPartner?.id,
      partnerType,
      "unpaid-for-cashflow",
    ],
    queryFn: () =>
      invoicesApi.getInvoices({
        customerIds: [selectedPartner!.id],
        limit: 1000,
      }),
    enabled: partnerType === "C" && !!selectedPartner?.id,
  });
  const { data: freshCustomerData } = useCustomer(
    partnerType === "C" && selectedPartner?.id ? selectedPartner.id : 0
  );

  // Fetch danh sách phiếu nhập chưa thanh toán cho NCC nước ngoài
  const { data: poData } = useQuery({
    queryKey: [
      "purchase-orders",
      "supplier",
      selectedPartner?.id,
      "unpaid",
      showCurrencyFields,
    ],
    queryFn: () =>
      purchaseOrdersApi.getAll({
        supplierId: selectedPartner!.id,
        pageSize: 1000,
      }),
    enabled: showCurrencyFields && !!selectedPartner?.id,
  });

  const groups = cashFlowGroups || [];
  const customers = customerSearchData?.data || [];
  const suppliers = suppliersData?.data || [];
  const users = usersData || [];
  const unpaidInvoices = useMemo(() => {
    if (partnerType !== "C" || !unpaidInvoicesData?.data) return [];
    return unpaidInvoicesData.data
      .filter((invoice: any) => {
        const debtAmount = Number(invoice.debtAmount);
        if (debtAmount <= 0) return false;
        if (invoice.status === 2) return false;
        const returnOrderAmount = Number(
          (invoice as any).returnOrderAmount || 0
        );
        if (returnOrderAmount >= debtAmount) return false;
        return true;
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.purchaseDate).getTime() -
          new Date(b.purchaseDate).getTime()
      );
  }, [unpaidInvoicesData, partnerType]);
  const totalPages = Math.ceil(unpaidInvoices.length / pageSize);
  const paginatedInvoices = unpaidInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const customerDebt =
    partnerType === "C" && selectedPartner
      ? Number(freshCustomerData?.totalDebt ?? selectedPartner.totalDebt ?? 0)
      : 0;

  // ===== Danh sách phiếu nhập chưa thanh toán (NCC nước ngoài) =====
  const unpaidPurchaseOrders = useMemo(() => {
    if (!showCurrencyFields || !(poData as any)?.data) return [];
    return (poData as any).data
      .filter((po: any) => {
        const debtAmount = Number(po.debtAmount);
        if (debtAmount <= 0) return false;
        if (po.isDraft) return false;
        if (po.status === 2) return false;
        return true;
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.purchaseDate).getTime() -
          new Date(b.purchaseDate).getTime()
      );
  }, [poData, showCurrencyFields]);
  const poTotalPages = Math.ceil(unpaidPurchaseOrders.length / pageSize);
  const paginatedPOs = unpaidPurchaseOrders.slice(
    (poCurrentPage - 1) * pageSize,
    poCurrentPage * pageSize
  );

  // Credit NCC = phần chênh giữa tổng debtAmount các PN và supplierDebt thực tế
  // (đối xứng availableCredit của KH)
  const availableCredit = useMemo(() => {
    if (partnerType !== "C" || !isReceipt || !selectedPartner) return 0;
    const totalUnpaid = unpaidInvoices.reduce(
      (sum: number, inv: any) => sum + Number(inv.debtAmount),
      0
    );
    return Math.max(0, totalUnpaid - customerDebt);
  }, [unpaidInvoices, customerDebt, partnerType, isReceipt, selectedPartner]);

  const importAvailableCredit = useMemo(() => {
    if (!showCurrencyFields) return 0;
    // Lấy supplierDebt từ fresh supplier (totalDebt) — supplierDebt của NCC
    const supplierDebt = Number(
      (fullSupplierData as any)?.debt ?? 0
    );
    const totalUnpaidPO = unpaidPurchaseOrders.reduce(
      (sum: number, po: any) => sum + Number(po.debtAmount),
      0
    );
    return Math.max(0, totalUnpaidPO - supplierDebt);
  }, [unpaidPurchaseOrders, fullSupplierData, showCurrencyFields]);

  // Tỉ giá hiệu lực cho các phép tính
  const effectiveRate = useMemo(() => {
    const r = parseNumberInput(exchangeRate);
    return r > 0 ? r : 1;
  }, [exchangeRate]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPartnerSearch(partnerSearch), 300);
    return () => clearTimeout(t);
  }, [partnerSearch]);

  useEffect(() => {
    if (isOpen && user?.id) {
      setCollectorUserId(user.id.toString());
      setTransDateTime(new Date());
    }
  }, [isOpen, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        groupDropdownRef.current &&
        !groupDropdownRef.current.contains(event.target as Node)
      ) {
        setShowGroupDropdown(false);
      }
      if (
        partnerTypeDropdownRef.current &&
        !partnerTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPartnerTypeDropdown(false);
      }
      if (
        partnerDropdownRef.current &&
        !partnerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPartnerDropdown(false);
      }
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
      if (
        collectionBranchDropdownRef.current &&
        !collectionBranchDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCollectionBranchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset debt offsets khi đổi partner
  useEffect(() => {
    setInvoiceDebtOffsets({});
    setPurchaseOrderDebtOffsets({});
    setPurchaseOrderPayments({});
    debtOffsetsInitialized.current = false;
    poDebtOffsetsInitialized.current = false;
    setCurrentPage(1);
    setPoCurrentPage(1);
  }, [selectedPartner?.id, showCurrencyFields]);

  // Auto-init debt offsets cho hóa đơn cũ nhất
  useEffect(() => {
    if (debtOffsetsInitialized.current || unpaidInvoices.length === 0) return;
    // Đợi freshCustomerData load để availableCredit tính đúng (CustomerSearchResult không có totalDebt)
    if (partnerType === "C" && selectedPartner?.id && !freshCustomerData)
      return;
    debtOffsetsInitialized.current = true;

    if (availableCredit <= 0) return;

    const oldestInvoice = unpaidInvoices[0];
    const defaultOffset = Math.min(
      availableCredit,
      Number(oldestInvoice.debtAmount)
    );
    if (defaultOffset > 0) {
      setInvoiceDebtOffsets({
        [oldestInvoice.id]: formatNumberInput(defaultOffset.toString()),
      });
    }
  }, [
    unpaidInvoices,
    availableCredit,
    freshCustomerData,
    selectedPartner?.id,
    partnerType,
  ]);

  // Auto-init debt offsets cho phiếu nhập cũ nhất (NCC nước ngoài — CNY)
  useEffect(() => {
    if (
      poDebtOffsetsInitialized.current ||
      unpaidPurchaseOrders.length === 0
    )
      return;
    poDebtOffsetsInitialized.current = true;

    const importCreditCNY = importAvailableCredit / effectiveRate;
    if (importCreditCNY <= 0) return;

    const oldestPO = unpaidPurchaseOrders[0];
    const poDebtCNY = Number(oldestPO.debtAmount) / effectiveRate;
    const defaultOffset = Math.min(importCreditCNY, poDebtCNY);
    if (defaultOffset > 0) {
      setPurchaseOrderDebtOffsets({
        [oldestPO.id]: formatNumberInput(defaultOffset.toString()),
      });
    }
  }, [
    unpaidPurchaseOrders,
    importAvailableCredit,
    effectiveRate,
  ]);

  const filteredPartners = useMemo(() => {
    if (partnerType === "C") return customers;
    if (partnerType === "S") {
      if (!partnerSearch) return suppliers;
      const q = partnerSearch.toLowerCase();
      return suppliers.filter(
        (s: any) =>
          s.name.toLowerCase().includes(q) ||
          (s.code ?? "").toLowerCase().includes(q) ||
          (s.phone ?? "").includes(q)
      );
    }
    return [];
  }, [partnerType, customers, suppliers, partnerSearch]);

  if (!isOpen) return null;

  const selectedGroup = groups.find(
    (g: any) => g.id === Number(cashFlowGroupId)
  );

  const selectedCollector = users.find(
    (u: any) => u.id === Number(collectorUserId)
  );

  const selectedPartnerType = PARTNER_TYPES.find(
    (pt) => pt.value === partnerType
  );

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

  const handleTransDateInput = (value: string) => {
    setTransDate(value);
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatNumberInput(value);
    setAmount(formatted);

    if (allocateToInvoices && unpaidInvoices.length > 0) {
      const numericAmount = parseNumberInput(value);
      let remaining = numericAmount;
      const newPayments: Record<number, string> = {};

      for (const invoice of unpaidInvoices) {
        if (remaining <= 0) break;

        const debtAmount = Number(invoice.debtAmount);
        const debtOffsetForInvoice = parseNumberInput(
          invoiceDebtOffsets[invoice.id] || "0"
        );
        const maxForInvoice = Math.max(0, debtAmount - debtOffsetForInvoice);
        const paymentForThisInvoice = Math.min(remaining, maxForInvoice);
        newPayments[invoice.id] = formatNumberInput(
          paymentForThisInvoice.toString()
        );
        remaining -= paymentForThisInvoice;
      }

      setInvoicePayments(newPayments);
    }

    // Auto phân bổ cho PN (NCC nước ngoài, CNY)
    if (
      showCurrencyFields &&
      allocateToInvoices &&
      unpaidPurchaseOrders.length > 0
    ) {
      const numericAmountVND = parseNumberInput(value);
      const rate = effectiveRate;
      let remainingCNY = numericAmountVND / rate;
      const newPOPayments: Record<number, string> = {};

      for (const po of unpaidPurchaseOrders) {
        if (remainingCNY <= 0) break;
        const poRate = Number(po.exchangeRate) || rate;
        const poDebtCNY = Number(po.debtAmount) / poRate;
        const debtOffsetCNY = parseNumberInput(
          purchaseOrderDebtOffsets[po.id] || "0"
        );
        const maxForPOCNY = Math.max(0, poDebtCNY - debtOffsetCNY);
        const paymentCNY = Math.min(remainingCNY, maxForPOCNY);
        newPOPayments[po.id] = formatNumberInput(paymentCNY.toString());
        remainingCNY -= paymentCNY;
      }
      setPurchaseOrderPayments(newPOPayments);
    }
  };

  // Handler cho ô "Tiền trả" (CNY) trong bảng PN
  const handlePOPaymentChange = (poId: number, value: string) => {
    const po = unpaidPurchaseOrders.find((p: any) => p.id === poId);
    if (!po) return;
    const poRate = Number(po.exchangeRate) || effectiveRate;
    const poDebtCNY = Number(po.debtAmount) / poRate;
    const debtOffsetCNY = parseNumberInput(
      purchaseOrderDebtOffsets[poId] || "0"
    );
    const maxCNY = Math.max(0, poDebtCNY - debtOffsetCNY);
    const numericValue = parseNumberInput(value);
    const limited = Math.min(numericValue, maxCNY);
    const formatted = formatNumberInput(limited.toString());
    setPurchaseOrderPayments((prev) => ({ ...prev, [poId]: formatted }));
  };

  // Handler cho ô "Cấn trừ" (CNY) trong bảng PN
  const handlePODebtOffsetChange = (poId: number, value: string) => {
    const po = unpaidPurchaseOrders.find((p: any) => p.id === poId);
    if (!po) return;
    const poRate = Number(po.exchangeRate) || effectiveRate;
    const poDebtCNY = Number(po.debtAmount) / poRate;
    const numericValue = parseNumberInput(value);
    const otherTotalCNY = Object.entries(purchaseOrderDebtOffsets)
      .filter(([id]) => Number(id) !== poId)
      .reduce((sum, [, amt]) => sum + parseNumberInput(amt), 0);
    const importCreditCNY = importAvailableCredit / effectiveRate;
    const remainingCNY = Math.max(0, importCreditCNY - otherTotalCNY);
    const maxAmountCNY = Math.min(poDebtCNY, remainingCNY);
    const limited = Math.min(numericValue, maxAmountCNY);
    const formatted = formatNumberInput(limited.toString());
    setPurchaseOrderDebtOffsets((prev) => ({ ...prev, [poId]: formatted }));

    // Cap lại tiền trả nếu vượt phần còn lại sau cấn trừ
    const currentPayment = parseNumberInput(
      purchaseOrderPayments[poId] || "0"
    );
    const maxPaymentCNY = Math.max(0, poDebtCNY - limited);
    if (currentPayment > maxPaymentCNY) {
      setPurchaseOrderPayments((prev) => ({
        ...prev,
        [poId]: formatNumberInput(maxPaymentCNY.toString()),
      }));
    }
  };

  const handleInvoicePaymentChange = (invoiceId: number, value: string) => {
    const invoice = unpaidInvoices.find((inv: any) => inv.id === invoiceId);
    if (!invoice) return;

    const debtOffsetForInvoice = parseNumberInput(
      invoiceDebtOffsets[invoiceId] || "0"
    );
    const maxAmount = Math.max(
      0,
      Number(invoice.debtAmount) - debtOffsetForInvoice
    );
    const numericValue = parseNumberInput(value);
    const limitedValue = Math.min(numericValue, maxAmount);

    const formatted = formatNumberInput(limitedValue.toString());
    setInvoicePayments((prev) => ({
      ...prev,
      [invoiceId]: formatted,
    }));

    const actualTotal = Object.entries({
      ...invoicePayments,
      [invoiceId]: formatted,
    }).reduce((sum, [_, amount]) => sum + parseNumberInput(amount), 0);

    setAmount(formatNumberInput(actualTotal.toString()));
  };

  const handleInvoiceDebtOffsetChange = (invoiceId: number, value: string) => {
    const invoice = unpaidInvoices.find((inv: any) => inv.id === invoiceId);
    if (!invoice) return;

    const otherTotal = Object.entries(invoiceDebtOffsets)
      .filter(([id]) => Number(id) !== invoiceId)
      .reduce((sum, [_, amt]) => sum + parseNumberInput(amt), 0);

    const remaining = Math.max(0, availableCredit - otherTotal);
    const maxAmount = Math.min(Number(invoice.debtAmount), remaining);
    const numericValue = parseNumberInput(value);
    const limitedValue = Math.min(numericValue, maxAmount);
    const formatted = formatNumberInput(limitedValue.toString());
    setInvoiceDebtOffsets((prev) => ({
      ...prev,
      [invoiceId]: formatted,
    }));

    // Cap lại tiền thu nếu vượt phần còn lại sau cấn trừ
    const currentPayment = parseNumberInput(invoicePayments[invoiceId] || "0");
    const maxPayment = Math.max(0, Number(invoice.debtAmount) - limitedValue);
    if (currentPayment > maxPayment) {
      const newPayments = {
        ...invoicePayments,
        [invoiceId]: formatNumberInput(maxPayment.toString()),
      };
      setInvoicePayments(newPayments);

      // Recalculate total amount
      const actualTotal = Object.entries(newPayments).reduce(
        (sum, [_, amt]) => sum + parseNumberInput(amt),
        0
      );
      setAmount(formatNumberInput(actualTotal.toString()));
    }
  };

  const handleSubmit = async () => {
    if (!selectedBranch?.id) {
      alert("Vui lòng chọn chi nhánh");
      return;
    }

    const numericAmount = parseNumberInput(amount);
    // Tính debtOffsets trước validation
    const debtOffsetsToApply =
      affectDebt && allocateToInvoices && availableCredit > 0
        ? Object.entries(invoiceDebtOffsets)
            .filter(([_, amt]) => parseNumberInput(amt) > 0)
            .map(([invoiceId, amt]) => ({
              invoiceId: Number(invoiceId),
              amount: parseNumberInput(amt),
            }))
        : [];

    const totalDebtOffset = debtOffsetsToApply.reduce(
      (sum, d) => sum + d.amount,
      0
    );

    if (totalDebtOffset > availableCredit) {
      alert(
        `Tổng cấn trừ nợ (${formatNumberInput(totalDebtOffset.toString())}) vượt quá giới hạn cho phép (${formatNumberInput(availableCredit.toString())})`
      );
      return;
    }

    // Validate tỉ giá khi chi NCC nước ngoài
    if (showCurrencyFields && (!exchangeRate || effectiveRate <= 0)) {
      alert("Vui lòng nhập tỉ giá VND/CNY hợp lệ");
      return;
    }

    // Tính purchaseOrders + debtOffsets cho NCC nước ngoài (CNY)
    const importPurchaseOrders: Array<{
      purchaseOrderId: number;
      amount: number;
      exchangeRate: number;
      foreignAmount: number;
    }> = [];
    const importDebtOffsets: Array<{
      purchaseOrderId: number;
      amount: number;
    }> = [];
    let finalTotalAmount = numericAmount;
    let totalForeignAmount = 0;

    if (showCurrencyFields && affectDebt && allocateToInvoices) {
      const rate = effectiveRate;
      for (const [poId, amt] of Object.entries(purchaseOrderPayments)) {
        const amtCNY = parseNumberInput(amt);
        if (amtCNY > 0) {
          const amountVND = Math.round(amtCNY * rate);
          importPurchaseOrders.push({
            purchaseOrderId: Number(poId),
            amount: amountVND,
            exchangeRate: rate,
            foreignAmount: amtCNY,
          });
          totalForeignAmount += amtCNY;
        }
      }
      for (const [poId, amt] of Object.entries(purchaseOrderDebtOffsets)) {
        const amtCNY = parseNumberInput(amt);
        if (amtCNY > 0) {
          importDebtOffsets.push({
            purchaseOrderId: Number(poId),
            amount: Math.round(amtCNY * rate),
          });
        }
      }
      // Tổng tiền trên cashflow = tổng tiền trả + tổng cấn trừ (VND)
      const totalPaymentsVND = importPurchaseOrders.reduce(
        (s, p) => s + p.amount,
        0
      );
      const totalOffsetsVND = importDebtOffsets.reduce(
        (s, d) => s + d.amount,
        0
      );
      if (
        importPurchaseOrders.length > 0 ||
        importDebtOffsets.length > 0
      ) {
        finalTotalAmount = totalPaymentsVND;
        // Tổng cấn trừ NCC tạo SupplierReturn riêng ngoài cashflow — không cộng vào amount
        // (đối xứng pattern SupplierPaymentBulkModal).
      }
    }

    const hasImportAllocations = importPurchaseOrders.length > 0;
    const hasImportOffsets = importDebtOffsets.length > 0;

    // Cho phép amount=0 nếu có debtOffsets (KH) hoặc import offsets
    if (
      (!numericAmount || numericAmount <= 0) &&
      debtOffsetsToApply.length === 0 &&
      !hasImportAllocations &&
      !hasImportOffsets
    ) {
      alert("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    if (!collectorUserId) {
      alert("Vui lòng chọn người thu");
      return;
    }

    let finalTransDate = transDateTime;
    if (transDate) {
      finalTransDate = parseDateTime(transDate);
    }

    const invoiceAllocations =
      affectDebt && allocateToInvoices
        ? Object.entries(invoicePayments)
            .filter(([_, amount]) => parseNumberInput(amount) > 0)
            .map(([invoiceId, amount]) => ({
              invoiceId: Number(invoiceId),
              amount: parseNumberInput(amount),
            }))
        : undefined;

    try {
      // ===== Rẽ nhánh: NCC nước ngoài có phân bổ PO → dùng
      // createSupplierPayment (đã có sẵn, đối xứng KH), ngược lại dùng
      // createCashFlow như cũ =====
      if (showCurrencyFields && (hasImportAllocations || hasImportOffsets || numericAmount > 0)) {
        const methodValue =
          type === "cash" ? "cash" : type === "bank" ? "transfer" : "ewallet";
        // Tổng VND gửi lên BE = tổng tiền trả (không cộng debtOffsets vì
        // BE tự tạo SupplierReturn cho phần cấn trừ).
        const totalAmountVND =
          importPurchaseOrders.length > 0
            ? importPurchaseOrders.reduce((s, p) => s + p.amount, 0)
            : numericAmount;
        const finalForeignAmount =
          importPurchaseOrders.length > 0
            ? totalForeignAmount
            : numericAmount / effectiveRate;
        await cashflowsApi.createSupplierPayment({
          supplierId: selectedPartner!.id,
          totalAmount: totalAmountVND,
          branchId: selectedBranch.id,
          transDate: finalTransDate.toISOString(),
          method: methodValue,
          accountId: selectedAccountId || undefined,
          description,
          allocateToPurchaseOrders:
            affectDebt && hasImportAllocations,
          purchaseOrders:
            affectDebt && importPurchaseOrders.length > 0
              ? importPurchaseOrders
              : undefined,
          debtOffsets:
            affectDebt && importDebtOffsets.length > 0
              ? importDebtOffsets
              : undefined,
        } as any);
      } else {
        await createCashFlow.mutateAsync({
          branchId: selectedBranch.id,
          isReceipt,
          amount: numericAmount,
          transDate: finalTransDate.toISOString(),
          method:
            type === "cash"
              ? "cash"
              : type === "bank"
              ? "transfer"
              : "ewallet",
          accountId: selectedAccountId || undefined,
          cashFlowGroupId: cashFlowGroupId
            ? Number(cashFlowGroupId)
            : undefined,
          collectionBranchId:
            type === "cash" && collectionBranchId
              ? Number(collectionBranchId)
              : undefined,
          partnerType,
          partnerId: selectedPartner?.id,
          partnerName: selectedPartner?.name || partnerSearch || undefined,
          description,
          usedForFinancialReporting: usedForFinancialReporting ? 1 : 0,
          collectorUserId: Number(collectorUserId),
          affectDebt,
          allocateToInvoices: affectDebt ? allocateToInvoices : false,
          invoiceAllocations:
            affectDebt && allocateToInvoices ? invoiceAllocations : undefined,
          debtOffsets:
            debtOffsetsToApply.length > 0 ? debtOffsetsToApply : undefined,
        });
      }

      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating cashflow:", error);
      alert("Có lỗi xảy ra khi tạo phiếu thu/chi");
    }
  };

  const resetForm = () => {
    setTransDate("");
    setTransDateTime(new Date());
    setCashFlowGroupId("");
    setCollectionBranchId("");
    setPartnerType("C");
    setPartnerSearch("");
    setSelectedPartner(null);
    setCollectorUserId(user?.id?.toString() || "");
    setAmount("");
    setDescription("");
    setUsedForFinancialReporting(false);
    setAffectDebt(true);
    setAllocateToInvoices(true);
    setInvoicePayments({});
    setSelectedAccountId(null);
    setShowAccountDropdown(false);
    setInvoiceDebtOffsets({});
    setExchangeRate("");
    setPurchaseOrderPayments({});
    setPurchaseOrderDebtOffsets({});
    setPoCurrentPage(1);
    debtOffsetsInitialized.current = false;
    poDebtOffsetsInitialized.current = false;
    setCurrentPage(1);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[900px] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              {isReceipt
                ? TYPE_LABELS[type]
                : TYPE_LABELS[type].replace("thu", "chi")}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Mã phiếu</label>
              <input
                type="text"
                placeholder="Tự động"
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Thời gian
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={transDate}
                  onChange={(e) => handleTransDateInput(e.target.value)}
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

            <div className="relative" ref={groupDropdownRef}>
              <label className="block text-sm font-medium mb-2">
                {isReceipt ? "Loại thu" : "Loại chi"}
              </label>
              <button
                onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                <span className={selectedGroup ? "" : "text-gray-400"}>
                  {selectedGroup ? selectedGroup.name : "Chọn loại thu/chi"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showGroupDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {groups.map((group: any) => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setCashFlowGroupId(group.id.toString());
                        setShowGroupDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100">
                      {group.name}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setShowCreateGroupModal(true);
                      setShowGroupDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-brand hover:bg-gray-100 border-t">
                    + Thêm loại thu/chi
                  </button>
                </div>
              )}
            </div>

            {type === "cash" && (
              <div className="relative" ref={collectionBranchDropdownRef}>
                <label className="block text-sm font-medium mb-2">Sổ cái</label>
                <button
                  onClick={() =>
                    setShowCollectionBranchDropdown(
                      !showCollectionBranchDropdown
                    )
                  }
                  className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                  <span className={collectionBranchId ? "" : "text-gray-400"}>
                    {collectionBranchId
                      ? branches.find(
                          (b: any) => b.id === Number(collectionBranchId)
                        )?.name
                      : "Chọn chi nhánh"}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showCollectionBranchDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {branches.map((branch: any) => (
                      <button
                        key={branch.id}
                        onClick={() => {
                          setCollectionBranchId(branch.id.toString());
                          setShowCollectionBranchDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100">
                        {branch.name}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setShowCreateCollectionBranchModal(true);
                        setShowCollectionBranchDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-brand hover:bg-gray-100 border-t">
                      + Thêm chi nhánh
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="relative" ref={collectorDropdownRef}>
              <label className="block text-sm font-medium mb-2">
                Người {isReceipt ? "thu" : "chi"}
              </label>
              <button
                onClick={() => setShowCollectorDropdown(!showCollectorDropdown)}
                className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                <span className={selectedCollector ? "" : "text-gray-400"}>
                  {selectedCollector
                    ? selectedCollector.name
                    : "Chọn người thu"}
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

            <div className="relative" ref={partnerTypeDropdownRef}>
              <label className="block text-sm font-medium mb-2">
                Đối tượng nộp
              </label>
              <button
                onClick={() =>
                  setShowPartnerTypeDropdown(!showPartnerTypeDropdown)
                }
                className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                <span>
                  {selectedPartnerType
                    ? selectedPartnerType.label
                    : "Chọn đối tượng"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showPartnerTypeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50">
                  {PARTNER_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      onClick={() => {
                        setPartnerType(pt.value);
                        setSelectedPartner(null);
                        setPartnerSearch("");
                        setShowPartnerTypeDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100">
                      {pt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={partnerDropdownRef}>
              <label className="block text-sm font-medium mb-2">
                Tên người nộp
              </label>
              <input
                type="text"
                value={selectedPartner ? selectedPartner.name : partnerSearch}
                onChange={(e) => {
                  setPartnerSearch(e.target.value);
                  setSelectedPartner(null);
                  if (partnerType !== "O") {
                    setShowPartnerDropdown(true);
                  }
                }}
                onFocus={() => {
                  if (partnerType !== "O") {
                    setShowPartnerDropdown(true);
                  }
                }}
                placeholder="Tên người nộp"
                className="w-full px-3 py-2 border rounded-lg"
              />

              {showPartnerDropdown && partnerType !== "O" && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {filteredPartners.length > 0 ? (
                    filteredPartners.map((partner: any) => (
                      <button
                        key={partner.id}
                        onClick={() => {
                          setSelectedPartner(partner);
                          setPartnerSearch("");
                          setShowPartnerDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100">
                        <div>{partner.name}</div>
                        <div className="text-sm text-gray-500">
                          {partner.code} - {partner.contactNumber}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500">
                      Không tìm thấy kết quả
                    </div>
                  )}
                </div>
              )}
            </div>

            {showCurrencyFields ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Số tiền (VND)
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg text-right text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tỉ giá VND/CNY <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={exchangeRate}
                    onChange={(e) => {
                      setExchangeRate(e.target.value);
                      // Recalculate phân bổ PO khi tỉ giá đổi
                      setTimeout(
                        () => handleAmountChange(amount),
                        0
                      );
                    }}
                    placeholder="Nhập tỉ giá..."
                    className="w-full px-3 py-2 border rounded-lg text-right font-semibold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Quy đổi (¥)
                  </label>
                  <div className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-right text-base text-brand font-medium">
                    {formatCNY(
                      parseNumberInput(amount) / (effectiveRate || 1)
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Số tiền</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg text-right text-lg"
                />
              </div>
            )}

            {(type === "bank" || type === "ewallet") && (
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Tài khoản {type === "bank" ? "ngân hàng" : "ví điện tử"}
                </label>
                <div ref={accountDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                    className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between hover:border-brand">
                    <span className="text-sm">
                      {selectedAccountId && bankAccounts
                        ? (() => {
                            const account = bankAccounts.find(
                              (a: any) => a.id === selectedAccountId
                            );
                            return account
                              ? `${account.bankCode} - ${account.accountNumber} - ${account.accountHolder}`
                              : "Chọn tài khoản";
                          })()
                        : "Chọn tài khoản"}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showAccountDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {bankAccounts && bankAccounts.length > 0 ? (
                        bankAccounts.map((account: any) => (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => {
                              setSelectedAccountId(account.id);
                              setShowAccountDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-brand-soft transition-colors border-b last:border-b-0">
                            <div className="font-medium text-sm">
                              {account.bankCode} - {account.accountNumber}
                            </div>
                            <div className="text-xs text-gray-600">
                              {account.accountHolder}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500 text-center py-4">
                          Chưa có tài khoản{" "}
                          {type === "bank" ? "ngân hàng" : "ví điện tử"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Ghi chú</label>
              <textarea
                value={description}
                maxLength={1000}
                onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                placeholder="Nhập ghi chú"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg resize-none"
              />
            </div>

            {partnerType === "C" && selectedPartner && (
              <div className="col-span-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={affectDebt}
                    onChange={(e) => {
                      setAffectDebt(e.target.checked);
                      if (!e.target.checked) {
                        setAllocateToInvoices(false);
                        setInvoicePayments({});
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <span className="text-sm font-medium">Tính vào công nợ</span>
                </label>

                {affectDebt && (
                  <div className="ml-6 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={allocateToInvoices}
                        onChange={() => setAllocateToInvoices(true)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">Phân bổ vào hóa đơn</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!allocateToInvoices}
                        onChange={() => {
                          setAllocateToInvoices(false);
                          setInvoicePayments({});
                        }}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">
                        Chỉ trừ vào công nợ, không phân bổ hóa đơn
                      </span>
                    </label>

                    {allocateToInvoices && unpaidInvoices.length > 0 && (
                      <div className="border rounded-lg overflow-hidden mt-2">
                        {availableCredit > 0 && (
                          <div className="px-4 py-2 bg-brand-soft border-b text-xs text-brand-dark">
                            Có thể cấn trừ tối đa{" "}
                            <span className="font-semibold">
                              {formatNumberInput(availableCredit.toString())}
                            </span>{" "}
                            từ credit hiện có của khách hàng
                          </div>
                        )}
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              <th className="px-3 py-2 text-left">
                                Mã hóa đơn
                              </th>
                              <th className="px-3 py-2 text-left">Thời gian</th>
                              <th className="px-3 py-2 text-right">
                                Giá trị hóa đơn
                              </th>
                              <th className="px-3 py-2 text-right">
                                Đã thu trước
                              </th>
                              <th className="px-3 py-2 text-right">
                                Còn cần thu
                              </th>
                              {availableCredit > 0 && (
                                <th className="px-3 py-2 text-right">
                                  Cấn trừ nợ
                                </th>
                              )}
                              <th className="px-3 py-2 text-right">Tiền thu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedInvoices.map((invoice: any) => (
                              <tr key={invoice.id} className="border-b">
                                <td className="px-3 py-2">{invoice.code}</td>
                                <td className="px-3 py-2">
                                  {new Date(
                                    invoice.purchaseDate
                                  ).toLocaleDateString("vi-VN")}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {formatNumberInput(
                                    invoice.grandTotal.toString()
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {formatNumberInput(
                                    invoice.paidAmount.toString()
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {formatNumberInput(
                                    invoice.debtAmount.toString()
                                  )}
                                </td>
                                {availableCredit > 0 && (
                                  <td className="px-3 py-2">
                                    <input
                                      type="text"
                                      value={
                                        invoiceDebtOffsets[invoice.id] || ""
                                      }
                                      onChange={(e) =>
                                        handleInvoiceDebtOffsetChange(
                                          invoice.id,
                                          e.target.value
                                        )
                                      }
                                      placeholder="0"
                                      className="w-full px-2 py-1 border rounded text-right"
                                    />
                                  </td>
                                )}
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={invoicePayments[invoice.id] || "0"}
                                    onChange={(e) =>
                                      handleInvoicePaymentChange(
                                        invoice.id,
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-2 py-1 border rounded text-right"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                            <div className="text-sm text-gray-600">
                              Hiển thị {paginatedInvoices.length} /{" "}
                              {unpaidInvoices.length} hóa đơn (Trang{" "}
                              {currentPage} / {totalPages})
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  setCurrentPage((p) => Math.max(1, p - 1))
                                }
                                disabled={currentPage === 1}
                                className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                                Trước
                              </button>
                              <button
                                onClick={() =>
                                  setCurrentPage((p) =>
                                    Math.min(totalPages, p + 1)
                                  )
                                }
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                                Sau
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {allocateToInvoices && unpaidInvoices.length === 0 && (
                      <div className="text-sm text-gray-500 italic">
                        Khách hàng không có hóa đơn nợ
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Khối phân bổ phiếu nhập cho NCC nước ngoài (CNY) */}
            {showCurrencyFields && selectedPartner && (
              <div className="col-span-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={affectDebt}
                    onChange={(e) => {
                      setAffectDebt(e.target.checked);
                      if (!e.target.checked) {
                        setAllocateToInvoices(false);
                        setPurchaseOrderPayments({});
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <span className="text-sm font-medium">
                    Tính vào công nợ NCC
                  </span>
                </label>

                {affectDebt && (
                  <div className="ml-6 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={allocateToInvoices}
                        onChange={() => setAllocateToInvoices(true)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">Phân bổ vào phiếu nhập</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!allocateToInvoices}
                        onChange={() => {
                          setAllocateToInvoices(false);
                          setPurchaseOrderPayments({});
                        }}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">
                        Chỉ trừ vào công nợ, không phân bổ phiếu nhập
                      </span>
                    </label>

                    {allocateToInvoices && unpaidPurchaseOrders.length > 0 && (
                      <div className="border rounded-lg overflow-hidden mt-2">
                        {importAvailableCredit > 0 && (
                          <div className="px-4 py-2 bg-brand-soft border-b text-xs text-brand-dark">
                            Có thể cấn trừ tối đa{" "}
                            <span className="font-semibold">
                              {formatCNY(
                                importAvailableCredit / effectiveRate
                              )}
                            </span>{" "}
                            từ credit hiện có của nhà cung cấp
                          </div>
                        )}
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              <th className="px-3 py-2 text-left">
                                Mã phiếu nhập
                              </th>
                              <th className="px-3 py-2 text-left">
                                Thời gian
                              </th>
                              <th className="px-3 py-2 text-right">
                                Giá trị phiếu (¥)
                              </th>
                              <th className="px-3 py-2 text-right">
                                Đã trả (¥)
                              </th>
                              <th className="px-3 py-2 text-right">
                                Còn cần trả (¥)
                              </th>
                              {importAvailableCredit > 0 && (
                                <th className="px-3 py-2 text-right">
                                  Cấn trừ nợ (¥)
                                </th>
                              )}
                              <th className="px-3 py-2 text-right">
                                Tiền trả (¥)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedPOs.map((po: any) => {
                              const poRate =
                                Number(po.exchangeRate) || effectiveRate;
                              const poDebtCNY =
                                Number(po.debtAmount) / poRate;
                              return (
                                <tr key={po.id} className="border-b">
                                  <td className="px-3 py-2 text-brand">
                                    {po.code}
                                  </td>
                                  <td className="px-3 py-2">
                                    {new Date(
                                      po.purchaseDate
                                    ).toLocaleDateString("vi-VN")}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <div>
                                      {formatCNY(
                                        Number(
                                          po.subTotal || po.total || 0
                                        ) / poRate
                                      )}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-normal">
                                      ({formatCurrency(po.subTotal || po.total)})
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <div>
                                      {formatCNY(
                                        Number(po.paidAmount || 0) / poRate
                                      )}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-normal">
                                      ({formatCurrency(po.paidAmount || 0)})
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">
                                    <div className="text-brand">
                                      {formatCNY(poDebtCNY)}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-normal">
                                      ({formatCurrency(po.debtAmount)})
                                    </div>
                                  </td>
                                  {importAvailableCredit > 0 && (
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={
                                          purchaseOrderDebtOffsets[po.id] || ""
                                        }
                                        onChange={(e) =>
                                          handlePODebtOffsetChange(
                                            po.id,
                                            e.target.value
                                          )
                                        }
                                        placeholder="0"
                                        className="w-full px-2 py-1 border rounded text-right"
                                      />
                                    </td>
                                  )}
                                  <td className="px-3 py-2">
                                    <input
                                      type="text"
                                      value={
                                        purchaseOrderPayments[po.id] || ""
                                      }
                                      onChange={(e) =>
                                        handlePOPaymentChange(
                                          po.id,
                                          e.target.value
                                        )
                                      }
                                      placeholder="0"
                                      className="w-full px-2 py-1 border rounded text-right"
                                      disabled={!allocateToInvoices}
                                    />
                                    {purchaseOrderPayments[po.id] && (
                                      <div className="text-[10px] text-gray-400 text-right">
                                        ={" "}
                                        {formatCurrency(
                                          Math.round(
                                            parseNumberInput(
                                              purchaseOrderPayments[po.id]
                                            ) * effectiveRate
                                          )
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {poTotalPages > 1 && (
                          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                            <div className="text-sm text-gray-600">
                              Hiển thị {paginatedPOs.length} /{" "}
                              {unpaidPurchaseOrders.length} phiếu nhập (Trang{" "}
                              {poCurrentPage} / {poTotalPages})
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  setPoCurrentPage((p) => Math.max(1, p - 1))
                                }
                                disabled={poCurrentPage === 1}
                                className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50">
                                Trước
                              </button>
                              <button
                                onClick={() =>
                                  setPoCurrentPage((p) =>
                                    Math.min(poTotalPages, p + 1)
                                  )
                                }
                                disabled={poCurrentPage === poTotalPages}
                                className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50">
                                Sau
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {allocateToInvoices && unpaidPurchaseOrders.length === 0 && (
                      <div className="text-sm text-gray-500 italic">
                        Nhà cung cấp không có phiếu nhập nợ
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Bỏ qua
            </button>
            <button
              onClick={handleSubmit}
              disabled={createCashFlow.isPending}
              className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand disabled:opacity-50">
              {createCashFlow.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>

      <CreateCashFlowGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        isReceipt={isReceipt}
      />

      <CreateCashFlowCollectionBranchModal
        isOpen={showCreateCollectionBranchModal}
        onClose={() => setShowCreateCollectionBranchModal(false)}
      />
    </>
  );
}
