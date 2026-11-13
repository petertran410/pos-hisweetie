"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import {
  useCreateCustomer,
  useCustomerGroups,
  useSearchCustomers,
  useUpdateCustomer,
} from "@/lib/hooks/useCustomers";
import {
  X,
  Plus,
  Pencil,
  Star,
  Trash2,
  Search,
  Loader2,
  MapPin,
  Check,
  ChevronRight,
  Info,
  Network,
} from "lucide-react";
import { toast } from "sonner";
import { Customer } from "@/lib/types/customer";
import { useBranchStore } from "@/lib/store/branch";
import { useTaxCodeLookup } from "@/lib/hooks/useVietQr";
import { sanitizeAddresses } from "@/lib/utils/sanitize-address";
import { CustomerAddressFormModal } from "../pos/CustomerAddressFormModal";
import { MisaEmployeeDropdown } from "./MisaEmployeeDropdown";
import { MisaEmployee } from "@/lib/api/misa";
import { usePermission } from "@/lib/hooks/usePermissions";
import {
  DebtPolicyFields,
  EMPTY_DEBT_POLICY_FORM,
  toDebtPolicyPayload,
  validateDebtPolicyForm,
  type DebtPolicyFormValue,
} from "../debt-tracking/DebtPolicyFields";
import {
  useDebtPolicy,
  useUpsertDebtPolicy,
} from "@/lib/hooks/useDebtTracking";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  CustomerTypeCards,
  Field,
  FOCUS_RING,
  FormSection,
  cx,
  inputClass,
} from "./CustomerTabUI";

interface CustomerFormProps {
  customer?: Customer;
  onClose: () => void;
  onSuccess?: (customer?: any) => void;
  // Chỉ khi tạo mới: điền sẵn (vd tạo khách từ lead)
  initialValues?: {
    name?: string;
    contactNumber?: string;
    newCityCode?: string;
    newCityName?: string;
    newWardCode?: string;
    newWardName?: string;
  };
}

interface City {
  name: string;
  code: number;
  codename: string;
  division_type: string;
  phone_code: number;
  districts: District[];
}

interface District {
  name: string;
  code: number;
  codename: string;
  division_type: string;
  short_codename: string;
  wards: Ward[];
}

interface Ward {
  name: string;
  code: number;
  codename: string;
  division_type: string;
  short_codename: string;
}

interface Province {
  code: string;
  name: string;
}

interface Commune {
  code: string;
  name: string;
  provinceCode: string;
}

const createEmptyAddress = (isDefault = false) => ({
  label: undefined,
  receiver: undefined,
  contactNumber: undefined,
  address: undefined,
  cityCode: undefined,
  cityName: undefined,
  districtCode: undefined,
  districtName: undefined,
  wardCode: undefined,
  wardName: undefined,
  newCityCode: undefined,
  newCityName: undefined,
  newWardCode: undefined,
  newWardName: undefined,
  invoiceBuyerName: undefined,
  invoiceAddress: undefined,
  invoiceCityCode: undefined,
  invoiceCityName: undefined,
  invoiceWardCode: undefined,
  invoiceWardName: undefined,
  invoiceCccdCmnd: undefined,
  invoiceBankAccount: undefined,
  invoiceEmail: undefined,
  invoicePhone: undefined,
  invoiceDvqhnsCode: undefined,
  isDefault,
});

// ── Thông tin xuất hóa đơn: trường còn thiếu theo loại khách ──
// Cá nhân: điền 1 trong (Tên người mua, MST, Địa chỉ) → bắt buộc đủ cả 3 + Email.
// Tổ chức: điền 1 trong (MST, Địa chỉ, Email) → bắt buộc đủ cả 3.
const INVOICE_FIELD_LABELS: Record<string, string> = {
  invoiceBuyerName: "Tên người mua",
  taxCode: "Mã số thuế",
  invoiceAddress: "Địa chỉ",
  invoiceEmail: "Email",
  orgTaxCode: "Mã số thuế",
  orgInvoiceAddress: "Địa chỉ",
  orgInvoiceEmail: "Email",
};

const getInvoiceMissing = (data: Record<string, unknown>): string[] => {
  const has = (k: string) => String(data?.[k] ?? "").trim() !== "";
  if (String(data?.type) === "1") {
    const required = ["orgTaxCode", "orgInvoiceAddress", "orgInvoiceEmail"];
    return required.some(has) ? required.filter((k) => !has(k)) : [];
  }
  if (String(data?.type) === "0") {
    if (!["invoiceBuyerName", "taxCode", "invoiceAddress"].some(has)) return [];
    return [
      "invoiceBuyerName",
      "taxCode",
      "invoiceAddress",
      "invoiceEmail",
    ].filter((k) => !has(k));
  }
  return [];
};

export function CustomerForm({
  customer,
  onClose,
  onSuccess,
  initialValues,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const { selectedBranch } = useBranchStore();
  const canLinkMisa = usePermission("customers", "link_misa");

  // Misa: nhân viên phụ trách (lưu id + mã + tên)
  const [misaEmployee, setMisaEmployee] = useState<{
    id: string;
    code: string;
    name: string;
  }>({
    id: customer?.misaEmployeeId || "",
    code: customer?.misaEmployeeCode || "",
    name: customer?.misaEmployeeName || "",
  });

  const [cities, setCities] = useState<City[]>([]);
  const [invoiceProvinces, setInvoiceProvinces] = useState<Province[]>([]);
  const [invoiceCommunes, setInvoiceCommunes] = useState<Commune[]>([]);

  const [addresses, setAddresses] = useState<any[]>([]);

  const { data: customerGroupsData } = useCustomerGroups();
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  // Người dùng có tự thêm/bỏ nhóm không — chỉ khi đó mới được gửi groupIds: []
  // (vài màn mở form với dữ liệu khách không kèm nhóm, gửi [] sẽ xóa nhầm).
  const [groupsTouched, setGroupsTouched] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const birthDatePickerRef = useRef<HTMLDivElement>(null);
  const [activeFormTab, setActiveFormTab] = useState<
    "basic" | "invoice" | "debt"
  >("basic");
  // Đã bấm Lưu ít nhất 1 lần → bắt đầu tô đỏ trường lỗi + chấm đỏ trên tab
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showParentPicker, setShowParentPicker] = useState(false);

  // ---- Thiết lập công nợ ----
  // Đây là cấu hình dài hạn của khách nên đặt ngay trong form khách hàng,
  // không bắt người dùng sang trang theo dõi công nợ để chỉnh.
  const canManageDebtPolicy = usePermission("debt_tracking", "update_policy");
  const canAssignSalePic = usePermission("customers", "assign_sale_pic");
  const { data: debtPolicyData } = useDebtPolicy(
    (canManageDebtPolicy || canAssignSalePic) && customer?.id
      ? customer.id
      : undefined
  );
  const { data: usersForPic } = useUsersForFilter();
  const upsertDebtPolicy = useUpsertDebtPolicy();
  const [debtPolicyForm, setDebtPolicyForm] = useState<DebtPolicyFormValue>(
    EMPTY_DEBT_POLICY_FORM
  );
  const [loadedDebtPolicyId, setLoadedDebtPolicyId] = useState<number | null>(
    null
  );

  // Nạp thiết lập hiện có đúng một lần, theo pattern "điều chỉnh state khi
  // render" của React để không tạo vòng render thừa.
  const loadedPolicy = debtPolicyData?.policy;
  if (loadedPolicy && loadedDebtPolicyId !== loadedPolicy.id) {
    setLoadedDebtPolicyId(loadedPolicy.id);
    setDebtPolicyForm({
      debtRuleType:
        loadedPolicy.debtRuleType ??
        (loadedPolicy.hasCreditLimit
          ? "CREDIT_LIMIT"
          : loadedPolicy.hasTermDays
            ? "TERM_DAYS"
            : "NONE"),
      hasCreditLimit: loadedPolicy.hasCreditLimit,
      creditLimit:
        loadedPolicy.creditLimit != null
          ? String(Number(loadedPolicy.creditLimit))
          : "",
      hasTermDays: loadedPolicy.hasTermDays,
      termDays:
        loadedPolicy.termDays != null ? String(loadedPolicy.termDays) : "",
      paymentFrequency:
        loadedPolicy.paymentFrequency != null
          ? String(loadedPolicy.paymentFrequency)
          : "",
      debtForm: loadedPolicy.debtForm ?? "",
      salePicId: loadedPolicy.salePicId ?? "",
      requireFullPaymentForInvoice:
        loadedPolicy.requireFullPaymentForInvoice ?? false,
      paymentScheduleType: loadedPolicy.paymentScheduleType ?? "",
      paymentScheduleDays: loadedPolicy.paymentScheduleDays ?? [],
    });
  }

  // Portal mount guard — render modal lên document.body để overlay luôn phủ
  // toàn màn hình, tránh bị "kẹt" trong stacking/overflow context của trang cha
  // (ví dụ trong /ban-hang form bị lồng sâu trong panel cuộn).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const [selectedParent, setSelectedParent] = useState<{
    id: number;
    code: string;
    name: string;
  } | null>(null);
  const [parentSearch, setParentSearch] = useState("");
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const parentDropdownRef = useRef<HTMLDivElement>(null);

  const { data: parentSearchData } = useSearchCustomers(
    parentSearch || undefined
  );
  const parentOptions = (parentSearchData?.data || []).filter(
    (c) => !c.parentId && c.id !== customer?.id // Chỉ hiện khách cha (không có parentId) và không phải chính mình
  );

  const [addrModal, setAddrModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    index?: number;
  }>({ open: false, mode: "create" });

  const formatAddressLine = (a: any): string => {
    const newLine = [a.address, a.newWardName, a.newCityName]
      .filter(Boolean)
      .join(", ");
    if (newLine) return newLine;
    return [a.address, a.wardName, a.districtName, a.cityName]
      .filter(Boolean)
      .join(", ");
  };

  const handleAddFromModal = (addr: any) => {
    const isFirst = addresses.length === 0;
    const toAdd = { ...addr, isDefault: isFirst || !!addr.isDefault };
    const next = toAdd.isDefault
      ? [...addresses.map((a) => ({ ...a, isDefault: false })), toAdd]
      : [...addresses, toAdd];
    setAddresses(next);
    setAddrModal({ open: false, mode: "create" });
  };

  const handleEditFromModal = (addr: any) => {
    if (addrModal.index == null) return;
    const idx = addrModal.index;
    let next = addresses.map((a, i) => (i === idx ? { ...a, ...addr } : a));
    if (addr.isDefault) {
      next = next.map((a, i) => ({ ...a, isDefault: i === idx }));
    } else if (!next.some((a) => a.isDefault) && next.length > 0) {
      next[0] = { ...next[0], isDefault: true };
    }
    setAddresses(next);
    setAddrModal({ open: false, mode: "create" });
  };

  const customerType = watch("type", "");

  // ── Tra cứu mã số thuế qua VietQR ──
  const taxLookup = useTaxCodeLookup();
  const lastLookedUpTaxCode = useRef<string>("");

  const handleTaxLookup = async () => {
    const isOrg = watch("type", "0") === "1";
    const taxField = isOrg ? "orgTaxCode" : "taxCode";
    const taxCode = (watch(taxField) || "").trim();
    if (!taxCode) {
      toast.error("Vui lòng nhập mã số thuế");
      return;
    }
    lastLookedUpTaxCode.current = taxCode;
    try {
      const data = await taxLookup.mutateAsync(taxCode);

      // Tên: tổ chức → Tên công ty (organization), cá nhân → Tên người mua
      if (isOrg) {
        setValue("organization", data.name || "");
        if (data.address) setValue("orgInvoiceAddress", data.address);
      } else {
        setValue("invoiceBuyerName", data.name || "");
        if (data.address) setValue("invoiceAddress", data.address);
      }

      // Điền tên khách hàng (tab cơ bản) nếu đang trống
      if (!watch("name") && data.name) {
        setValue("name", data.name);
      }

      toast.success(
        data.status
          ? `Đã điền thông tin từ mã số thuế (${data.status})`
          : "Đã điền thông tin từ mã số thuế"
      );
    } catch (err: any) {
      toast.error(err?.message || "Không thể tra cứu mã số thuế");
    }
  };

  const handleTaxCodeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const taxCode = (e.target.value || "").trim();
    // Tự tra cứu khi độ dài hợp lệ (10 hoặc 13 số) và khác mã đã tra trước đó
    if (
      /^\d{10}(\d{3})?$/.test(taxCode) &&
      taxCode !== lastLookedUpTaxCode.current &&
      !taxLookup.isPending
    ) {
      handleTaxLookup();
    }
  };

  // Load cities (địa chỉ cũ)
  useEffect(() => {
    fetch("/data/old-location.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCities(data);
      })
      .catch(() => {
        toast.error("Không thể tải dữ liệu Tỉnh/Thành phố");
      });
  }, []);

  // Load invoiceProvinces (địa chỉ mới)
  useEffect(() => {
    fetch("/data/new-province-location.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInvoiceProvinces(data);
        } else if (data?.provinces) {
          setInvoiceProvinces(data.provinces);
        }
      })
      .catch(() => {
        setInvoiceProvinces([]);
      });
  }, []);

  // Load invoiceCommunes (địa chỉ mới)
  useEffect(() => {
    fetch("/data/new-commune-location.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInvoiceCommunes(data);
        } else if (data?.communes) {
          setInvoiceCommunes(data.communes);
        }
      })
      .catch(() => {
        setInvoiceCommunes([]);
      });
  }, []);

  // Click outside cho group dropdown + birth picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowGroupDropdown(false);
        setGroupSearchTerm("");
      }
      if (
        birthDatePickerRef.current &&
        !birthDatePickerRef.current.contains(event.target as Node)
      ) {
        setShowBirthDatePicker(false);
      }
      if (
        parentDropdownRef.current &&
        !parentDropdownRef.current.contains(event.target as Node)
      ) {
        setShowParentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Populate khi edit
  useEffect(() => {
    if (customer) {
      setValue("code", customer.code || "");
      setValue("name", customer.name);
      setValue("contactNumber", customer.contactNumber || "");
      setValue("phone", customer.phone || "");
      setValue("email", customer.email || "");
      setValue("type", String(customer.type ?? 0));
      setValue("organization", customer.organization || "");
      setValue("comments", customer.comments || "");

      // Thông tin xuất hóa đơn — nạp vào đúng nhóm field theo loại khách hàng.
      // Hai tab dùng field tách biệt để không ghi đè lẫn nhau.
      if (Number(customer.type) === 1) {
        setValue("orgTaxCode", customer.taxCode || "");
        setValue("orgInvoiceAddress", customer.invoiceAddress || "");
        setValue("orgInvoiceBuyerName", customer.invoiceBuyerName || "");
        setValue("orgInvoiceEmail", customer.invoiceEmail || "");
        setValue("orgInvoicePhone", customer.invoicePhone || "");
        setValue("invoiceDvqhnsCode", customer.invoiceDvqhnsCode || "");
      } else {
        setValue("taxCode", customer.taxCode || "");
        setValue("invoiceBuyerName", customer.invoiceBuyerName || "");
        setValue("invoiceAddress", customer.invoiceAddress || "");
        setValue("invoiceEmail", customer.invoiceEmail || "");
        setValue("invoicePhone", customer.invoicePhone || "");
        setValue("invoiceCccdCmnd", customer.invoiceCccdCmnd || "");
        setValue("invoiceBankAccount", customer.invoiceBankAccount || "");
      }
      setValue(
        "gender",
        customer.gender === null || customer.gender === undefined
          ? ""
          : customer.gender
            ? "true"
            : "false"
      );

      if (customer.birthDate) {
        setBirthDate(new Date(customer.birthDate));
      }

      if (customer.customerGroupDetails?.length) {
        setSelectedGroupIds(
          customer.customerGroupDetails.map((d: any) => d.groupId)
        );
      }

      if (customer.parent) {
        setSelectedParent(customer.parent);
      }

      setMisaEmployee({
        id: customer.misaEmployeeId || "",
        code: customer.misaEmployeeCode || "",
        name: customer.misaEmployeeName || "",
      });

      if (customer.addresses && customer.addresses.length > 0) {
        setAddresses(customer.addresses);
      } else {
        setAddresses([createEmptyAddress(true)]);
      }
    } else {
      // Tạo mới: chưa chọn loại khách hàng — buộc người dùng tự chọn
      setValue("type", "");
      if (initialValues) {
        setValue("name", initialValues.name || "");
        setValue("contactNumber", initialValues.contactNumber || "");
        if (initialValues.newCityCode) {
          setAddresses([
            {
              ...createEmptyAddress(true),
              contactNumber: initialValues.contactNumber,
              newCityCode: initialValues.newCityCode,
              newCityName: initialValues.newCityName,
              newWardCode: initialValues.newWardCode,
              newWardName: initialValues.newWardName,
            },
          ]);
        }
      }
    }
    // initialValues chỉ áp lúc mở form tạo mới
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, setValue]);

  const handleToggleGroup = (groupId: number) => {
    setGroupsTouched(true);
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleRemoveGroup = (groupId: number) => {
    setGroupsTouched(true);
    setSelectedGroupIds((prev) => prev.filter((id) => id !== groupId));
  };

  const filteredGroups =
    customerGroupsData?.data?.filter((group) =>
      group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
    ) || [];

  const selectedGroups =
    customerGroupsData?.data?.filter((group) =>
      selectedGroupIds.includes(group.id)
    ) || [];

  const handleRemoveAddress = (index: number) => {
    setAddresses((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Đảm bảo còn 1 default
      if (!next.some((a) => a.isDefault) && next.length > 0) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  };

  const handleSetDefault = (index: number) => {
    setAddresses((prev) =>
      prev.map((a, i) => ({ ...a, isDefault: i === index }))
    );
  };

  const validateAddresses = (): string | null => {
    if (addresses.length === 0) {
      return "Phải có ít nhất 1 địa chỉ giao hàng";
    }
    const defaultCount = addresses.filter((a) => a.isDefault).length;
    if (defaultCount !== 1) {
      return "Phải có đúng 1 địa chỉ mặc định";
    }
    for (let i = 0; i < addresses.length; i++) {
      const a = addresses[i];
      if (!a.cityCode && !a.newCityCode) {
        return `Địa chỉ #${i + 1}: Phải điền ít nhất 1 trong 2 loại địa chỉ (cũ hoặc mới)`;
      }
    }
    return null;
  };

  // Thêm hàm này trước onSubmit (hoặc đặt ngoài component)
  const sanitizeAddressForApi = (addr: any) => {
    const allowedFields = [
      "id",
      "label",
      "receiver",
      "contactNumber",
      "address",
      "cityCode",
      "cityName",
      "districtCode",
      "districtName",
      "wardCode",
      "wardName",
      "newCityCode",
      "newCityName",
      "newWardCode",
      "newWardName",
      "locationName",
      "invoiceBuyerName",
      "invoiceAddress",
      "invoiceCityCode",
      "invoiceCityName",
      "invoiceWardCode",
      "invoiceWardName",
      "invoiceCccdCmnd",
      "invoiceBankAccount",
      "invoiceEmail",
      "invoicePhone",
      "invoiceDvqhnsCode",
      "isDefault",
    ];

    // Field text user-editable — cần gửi cả "" để BE xóa được giá trị cũ.
    const clearableTextFields = new Set([
      "receiver",
      "contactNumber",
      "label",
      "address",
    ]);

    const clean: Record<string, any> = {};
    for (const key of allowedFields) {
      const val = addr[key];
      if (val === null || val === undefined) continue;
      if (val === "" && !clearableTextFields.has(key)) continue;
      if (key === "id") {
        clean.id = typeof val === "number" ? val : parseInt(val, 10);
      } else if (key === "isDefault") {
        clean.isDefault = Boolean(val);
      } else {
        // Đảm bảo tất cả string fields là string (xử lý cityCode number → string)
        clean[key] = String(val);
      }
    }

    // isDefault phải luôn có
    if (clean.isDefault === undefined) clean.isDefault = false;

    return clean;
  };

  // Thiếu Tên/SĐT (required của react-hook-form) → quay về tab đầu và báo lỗi
  const onInvalid = () => {
    setSubmitAttempted(true);
    setActiveFormTab("basic");
    toast.error("Vui lòng điền đầy đủ các trường bắt buộc");
  };

  const onSubmit = async (data: any) => {
    setSubmitAttempted(true);
    // Bắt buộc chọn loại khách hàng
    if (data.type !== "0" && data.type !== "1") {
      toast.error("Vui lòng chọn loại khách hàng");
      setActiveFormTab("basic");
      return;
    }

    if (canAssignSalePic && !debtPolicyForm.salePicId) {
      toast.error("Vui lòng chọn Sale PIC");
      setActiveFormTab("basic");
      return;
    }

    const validationError = validateAddresses();
    if (validationError) {
      toast.error(validationError);
      setActiveFormTab("basic");
      return;
    }

    // Thông tin xuất hóa đơn — ràng buộc khác nhau theo loại khách hàng.
    // Hai tab dùng field tách biệt: cá nhân → invoice*, tổ chức → orgInvoice*/orgTaxCode.
    const isOrganization = String(data.type) === "1";

    // Gom thông tin hóa đơn theo loại đang chọn (bên còn lại bỏ qua hoàn toàn)
    const invoice = isOrganization
      ? {
          taxCode: (data.orgTaxCode || "").trim(),
          buyerName: (data.orgInvoiceBuyerName || "").trim(),
          address: (data.orgInvoiceAddress || "").trim(),
          email: (data.orgInvoiceEmail || "").trim(),
          phone: (data.orgInvoicePhone || "").trim(),
          cccdCmnd: "",
          bankAccount: "",
          dvqhnsCode: (data.invoiceDvqhnsCode || "").trim(),
        }
      : {
          taxCode: (data.taxCode || "").trim(),
          buyerName: (data.invoiceBuyerName || "").trim(),
          address: (data.invoiceAddress || "").trim(),
          email: (data.invoiceEmail || "").trim(),
          phone: (data.invoicePhone || "").trim(),
          cccdCmnd: (data.invoiceCccdCmnd || "").trim(),
          bankAccount: (data.invoiceBankAccount || "").trim(),
          dvqhnsCode: "",
        };

    const invoiceMissingOnSubmit = getInvoiceMissing(data);
    if (invoiceMissingOnSubmit.length > 0) {
      toast.error(
        `Thông tin xuất hóa đơn: vui lòng điền đầy đủ ${invoiceMissingOnSubmit
          .map((k) => INVOICE_FIELD_LABELS[k])
          .join(", ")}`
      );
      setActiveFormTab("invoice");
      return;
    }

    // Sanitize addresses — loại bỏ null, extra fields, đảm bảo đúng type
    const cleanedAddresses = addresses.map(sanitizeAddressForApi);

    const formattedData: Record<string, any> = {
      name: data.name || undefined,
      contactNumber: data.contactNumber || undefined,
      branchId: selectedBranch?.id,
      parentId: selectedParent?.id || undefined,
      // Sửa KH mà người dùng bỏ chọn hết nhóm phải gửi [] để backend gỡ khỏi
      // mọi nhóm (undefined bị bỏ qua → nhóm cũ vẫn giữ nguyên).
      groupIds:
        selectedGroupIds.length > 0
          ? selectedGroupIds
          : customer && groupsTouched
            ? []
            : undefined,
      code: data.code || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      // Sửa KH: xóa trắng ghi chú phải gửi "" để backend xóa (undefined bị bỏ qua).
      comments: data.comments?.trim() || (customer?.comments ? "" : undefined),
      organization: isOrganization ? data.organization || undefined : undefined,
      taxCode: invoice.taxCode || undefined,
      type: parseInt(data.type),
      birthDate: birthDate ? birthDate.toISOString() : undefined,
      gender: data.gender === "" ? undefined : data.gender === "true",
      addresses: sanitizeAddresses(addresses),
      ...(canAssignSalePic
        ? {
            salePicId:
              debtPolicyForm.salePicId === ""
                ? undefined
                : Number(debtPolicyForm.salePicId),
          }
        : {}),
      invoiceCityCode: data.invoiceCityCode || undefined,
      invoiceCityName: data.invoiceCityName || undefined,
      invoiceWardCode: data.invoiceWardCode || undefined,
      invoiceWardName: data.invoiceWardName || undefined,
      invoiceBuyerName: invoice.buyerName || undefined,
      invoiceAddress: invoice.address || undefined,
      invoiceCccdCmnd: invoice.cccdCmnd || undefined,
      invoiceBankAccount: invoice.bankAccount || undefined,
      invoiceEmail: invoice.email || undefined,
      invoicePhone: invoice.phone || undefined,
      invoiceDvqhnsCode: invoice.dvqhnsCode || undefined,
      ...(canLinkMisa
        ? {
            misaEmployeeId: misaEmployee.id,
            misaEmployeeCode: misaEmployee.code,
            misaEmployeeName: misaEmployee.name,
          }
        : {}),
    };

    Object.keys(formattedData).forEach((key) => {
      if (formattedData[key] === undefined) {
        delete formattedData[key];
      }
    });

    if (customer) {
      // Thiết lập công nợ lưu ở bảng riêng nên gọi API riêng. Kiểm tra trước
      // khi cập nhật khách để không lưu nửa vời.
      if (canManageDebtPolicy) {
        const debtError = validateDebtPolicyForm(debtPolicyForm);
        if (debtError) {
          toast.error(debtError);
          setActiveFormTab("debt");
          return;
        }
      }

      updateCustomer.mutate(
        { id: customer.id, data: formattedData },
        {
          onSuccess: async () => {
            if (canManageDebtPolicy) {
              try {
                await upsertDebtPolicy.mutateAsync({
                  customerId: customer.id,
                  payload: toDebtPolicyPayload(debtPolicyForm),
                });
              } catch {
                // Hook đã hiện toast lỗi; giữ modal mở để người dùng thử lại.
                return;
              }
            }
            onSuccess?.();
            onClose();
          },
        }
      );
    } else {
      createCustomer.mutate(formattedData as any, {
        onSuccess: async (createdCustomer) => {
          if (canManageDebtPolicy) {
            try {
              await upsertDebtPolicy.mutateAsync({
                customerId: createdCustomer.id,
                payload: toDebtPolicyPayload({
                  ...debtPolicyForm,
                  // Đồng bộ với policy mặc định backend khi tạo khách mới.
                  debtForm: debtPolicyForm.debtForm || "PREPAID",
                }),
              });
            } catch {
              // Khách đã được tạo nên không giữ modal mở để tránh người dùng
              // bấm Tạo lần nữa. Sale PIC có thể được chọn lại khi mở khách.
              toast.error(
                "Khách đã tạo nhưng chưa lưu được thiết lập công nợ. Hãy mở lại khách hàng để cập nhật."
              );
              onSuccess?.(createdCustomer);
              onClose();
              return;
            }
          }
          onSuccess?.(createdCustomer);
          onClose();
        },
      });
    }
  };

  // ── Trạng thái lỗi để hiển thị (chỉ sau khi đã bấm Lưu) ──
  const formValues = watch();
  const isOrgType = customerType === "1";
  const typeMissing =
    submitAttempted && customerType !== "0" && customerType !== "1";
  const salePicMissing =
    submitAttempted && canAssignSalePic && !debtPolicyForm.salePicId;
  const addressError = submitAttempted ? validateAddresses() : null;
  const invoiceMissing = submitAttempted ? getInvoiceMissing(formValues) : [];
  const debtError =
    submitAttempted && canManageDebtPolicy && customer
      ? validateDebtPolicyForm(debtPolicyForm)
      : null;
  const invoiceFieldError = (name: string) => invoiceMissing.includes(name);

  const tabErrors = {
    basic:
      submitAttempted &&
      (!!errors.name ||
        !!errors.contactNumber ||
        typeMissing ||
        salePicMissing ||
        !!addressError),
    invoice: invoiceMissing.length > 0,
    debt: !!debtError,
  };

  // Công nợ chỉ thiết lập được khi khách đã tồn tại
  const showDebtTab = canManageDebtPolicy && !!customer;
  const tabs: { key: "basic" | "invoice" | "debt"; label: string }[] = [
    { key: "basic", label: "Thông tin chung" },
    { key: "invoice", label: "Xuất hóa đơn" },
    ...(showDebtTab ? [{ key: "debt" as const, label: "Công nợ" }] : []),
  ];

  const canPickParent = !customer?.parentId && !customer?.children?.length;
  const parentPickerOpen = showParentPicker || !!selectedParent;
  const isSubmitting =
    createCustomer.isPending ||
    updateCustomer.isPending ||
    upsertDebtPolicy.isPending;

  const taxLookupButton = (
    <button
      type="button"
      onClick={handleTaxLookup}
      disabled={taxLookup.isPending}
      title="Tra cứu thông tin từ mã số thuế"
      className="inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-lg border border-brand-border px-3 text-sm font-medium text-brand transition-colors hover:bg-brand-soft disabled:opacity-50">
      {taxLookup.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Search className="h-4 w-4" />
      )}
      Tra cứu
    </button>
  );

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:m-4 sm:h-[min(88vh,860px)] sm:max-w-4xl sm:rounded-2xl">
        {/* ===== Header ===== */}
        <div className="flex flex-shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
              {customer ? "Chỉnh sửa khách hàng" : "Tạo khách hàng mới"}
            </h2>
            <p className="mt-0.5 truncate text-sm text-gray-500">
              {customer
                ? [customer.code, customer.name].filter(Boolean).join(" · ")
                : "Điền thông tin liên hệ và địa chỉ giao hàng của khách"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="-mr-2 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* ===== Loại khách hàng — chọn 1 lần, áp dụng cho mọi tab ===== */}
          <div className="flex-shrink-0 px-4 pb-3 sm:px-6">
            <CustomerTypeCards
              value={customerType}
              onChange={(v) => setValue("type", v)}
              error={typeMissing && "Vui lòng chọn loại khách hàng"}
            />
          </div>

          {/* ===== Tabs ===== */}
          <div className="flex flex-shrink-0 gap-5 border-b px-4 sm:gap-6 sm:px-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFormTab(tab.key)}
                className={cx(
                  "relative -mb-px flex items-center gap-1.5 border-b-2 py-2.5 text-sm font-medium transition-colors",
                  activeFormTab === tab.key
                    ? "border-brand text-brand"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}>
                {tab.label}
                {tabErrors[tab.key] && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-red-500"
                    aria-label="Có lỗi"
                  />
                )}
              </button>
            ))}
          </div>

          {/* ================= TAB 1: THÔNG TIN CHUNG ================= */}
          <div
            className={
              activeFormTab === "basic"
                ? "min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3 sm:space-y-4 sm:p-5"
                : "hidden"
            }>
            {/* ── Liên hệ ── */}
            <FormSection title="Thông tin liên hệ">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                <Field
                  label="Tên khách hàng"
                  required
                  error={errors.name && "Vui lòng nhập tên khách hàng"}
                  className="col-span-2">
                  <input
                    {...register("name", { required: true })}
                    placeholder="Nhập tên khách hàng"
                    className={inputClass(!!errors.name)}
                  />
                </Field>
                <Field
                  label="Mã khách hàng"
                  className="col-span-2 sm:col-span-1">
                  <input
                    {...register("code")}
                    placeholder="Tự động tạo"
                    className={inputClass()}
                  />
                </Field>

                <Field
                  label="Số điện thoại"
                  required
                  error={errors.contactNumber && "Vui lòng nhập số điện thoại"}>
                  <input
                    {...register("contactNumber", { required: true })}
                    type="tel"
                    placeholder="Nhập số điện thoại"
                    className={inputClass(!!errors.contactNumber)}
                  />
                </Field>
                <Field label="SĐT phụ">
                  <input
                    {...register("phone")}
                    type="tel"
                    placeholder="Không bắt buộc"
                    className={inputClass()}
                  />
                </Field>
                <Field label="Email" className="col-span-2 sm:col-span-1">
                  <input
                    type="email"
                    {...register("email")}
                    placeholder="email@gmail.com"
                    className={inputClass()}
                  />
                </Field>

                {isOrgType && (
                  <Field
                    label="Tên công ty"
                    className="col-span-2 sm:col-span-3">
                    <input
                      {...register("organization")}
                      placeholder="Tên công ty / hộ kinh doanh"
                      className={inputClass()}
                    />
                  </Field>
                )}
              </div>
            </FormSection>

            {/* ── Địa chỉ giao hàng ── */}
            <FormSection
              title={
                <>
                  Địa chỉ giao hàng <span className="text-red-500">*</span>
                  {addresses.length > 0 && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-gray-600">
                      {addresses.length}
                    </span>
                  )}
                </>
              }
              action={
                <button
                  type="button"
                  onClick={() => setAddrModal({ open: true, mode: "create" })}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-border px-2.5 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand-soft">
                  <Plus className="h-4 w-4" /> Thêm địa chỉ
                </button>
              }>
              {addresses.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setAddrModal({ open: true, mode: "create" })}
                  className={cx(
                    "flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed py-6 text-sm text-gray-500 transition-colors hover:border-brand hover:text-brand",
                    addressError && "border-red-300"
                  )}>
                  <MapPin className="h-5 w-5" />
                  Chưa có địa chỉ — bấm để thêm
                </button>
              ) : (
                <div className="space-y-2">
                  {addresses.map((addr: any, index: number) => {
                    const line = formatAddressLine(addr);
                    return (
                      <div
                        key={index}
                        className={cx(
                          "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                          addr.isDefault
                            ? "border-brand bg-brand-soft"
                            : "hover:bg-gray-50",
                          addressError && !line && "border-red-400"
                        )}>
                        <MapPin
                          className={cx(
                            "mt-0.5 h-4 w-4 shrink-0",
                            addr.isDefault ? "text-brand" : "text-gray-400"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium text-gray-900">
                              {addr.label ||
                                addr.receiver ||
                                `Địa chỉ #${index + 1}`}
                            </span>
                            {addr.isDefault && (
                              <span className="rounded bg-brand px-1.5 py-0.5 text-[11px] font-medium text-white">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <div className="truncate text-xs text-gray-600">
                            {addr.receiver && <span>{addr.receiver} · </span>}
                            {addr.contactNumber && (
                              <span>{addr.contactNumber} · </span>
                            )}
                            {line || (
                              <span className="italic text-gray-400">
                                Chưa có địa chỉ — bấm sửa để bổ sung
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-0.5">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(index)}
                              title="Đặt mặc định"
                              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-brand-soft hover:text-brand">
                              <Star className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setAddrModal({ open: true, mode: "edit", index })
                            }
                            title="Sửa"
                            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-brand-soft hover:text-brand">
                            <Pencil className="h-4 w-4" />
                          </button>
                          {addresses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAddress(index)}
                              title="Xóa"
                              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {addressError && (
                <p className="mt-2 text-xs text-red-600">{addressError}</p>
              )}
            </FormSection>

            {/* ── Phân loại & phụ trách ── */}
            <FormSection title="Phân loại & phụ trách">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="relative" ref={dropdownRef}>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Nhóm khách hàng
                  </label>
                  <div
                    className="flex min-h-[42px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 transition-colors focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--dt-color-primary-ring)]"
                    onClick={() => setShowGroupDropdown(true)}>
                    {selectedGroups.map((group) => (
                      <span
                        key={group.id}
                        className="inline-flex items-center gap-1 rounded-md bg-brand-soft py-0.5 pl-2 pr-1 text-xs font-medium text-brand-dark">
                        {group.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveGroup(group.id);
                          }}
                          aria-label={`Bỏ nhóm ${group.name}`}
                          className="rounded p-0.5 hover:bg-brand-soft">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      onFocus={() => setShowGroupDropdown(true)}
                      placeholder={
                        selectedGroups.length === 0
                          ? "Chọn nhóm khách hàng"
                          : ""
                      }
                      className="min-w-[100px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-gray-400"
                    />
                  </div>

                  {showGroupDropdown && (
                    <div className="absolute z-50 mt-1 max-h-[240px] w-full overflow-y-auto rounded-lg border bg-white py-1 shadow-lg">
                      {filteredGroups.length > 0 ? (
                        filteredGroups.map((group) => {
                          const isSelected = selectedGroupIds.includes(
                            group.id
                          );
                          return (
                            <div
                              key={group.id}
                              onClick={() => handleToggleGroup(group.id)}
                              className={cx(
                                "flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-gray-50",
                                isSelected && "font-medium text-brand"
                              )}>
                              <span>{group.name}</span>
                              {isSelected && (
                                <Check className="h-4 w-4 text-brand" />
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Không tìm thấy nhóm khách hàng
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {canAssignSalePic && (
                  <Field
                    label="Sale PIC"
                    required
                    error={salePicMissing && "Vui lòng chọn Sale PIC"}>
                    <SearchableSelect
                      variant="form"
                      value={
                        debtPolicyForm.salePicId === ""
                          ? ""
                          : String(debtPolicyForm.salePicId)
                      }
                      onChange={(selected) =>
                        setDebtPolicyForm((prev) => ({
                          ...prev,
                          salePicId: selected ? Number(selected) : "",
                        }))
                      }
                      options={(usersForPic ?? []).map((user) => ({
                        value: String(user.id),
                        label: user.name,
                      }))}
                      placeholder="Chọn Sale PIC"
                      searchPlaceholder="Tìm tên Sale PIC..."
                    />
                  </Field>
                )}

                {canLinkMisa && (
                  <div className="text-sm [&>div>button]:rounded-lg [&>div>label]:mb-1.5 [&>div>label]:text-gray-700">
                    <MisaEmployeeDropdown
                      label="Nhân viên phụ trách (Misa)"
                      placeholder="Chọn nhân viên phụ trách"
                      value={misaEmployee.code || undefined}
                      valueName={misaEmployee.name || undefined}
                      onChange={(emp: MisaEmployee | null) =>
                        setMisaEmployee({
                          id: emp?.id || "",
                          code: emp?.code || "",
                          name: emp?.name || "",
                        })
                      }
                    />
                    {misaEmployee.code ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Đã gắn: {misaEmployee.code}
                        {misaEmployee.name ? ` - ${misaEmployee.name}` : ""}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              {/* ── Khách hàng cha (chuỗi cửa hàng) ── */}
              {customer?.parent ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2.5 text-sm">
                  <Network className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="text-gray-500">Thuộc khách hàng cha:</span>
                  <span className="truncate font-medium text-gray-900">
                    {customer.parent.code} - {customer.parent.name}
                  </span>
                </div>
              ) : customer?.children?.length ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                  <Network className="h-4 w-4 shrink-0 text-gray-400" />
                  Đang là khách hàng cha của {customer.children.length} khách
                  hàng con
                </div>
              ) : canPickParent ? (
                <div className="mt-4 border-t pt-4" ref={parentDropdownRef}>
                  {!parentPickerOpen ? (
                    <button
                      type="button"
                      onClick={() => setShowParentPicker(true)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-brand">
                      <ChevronRight className="h-4 w-4" />
                      Thuộc chuỗi cửa hàng? Chọn khách hàng cha
                    </button>
                  ) : (
                    <Field
                      label={
                        <>
                          Khách hàng cha
                          <span className="ml-2 text-xs font-normal text-gray-400">
                            nếu là khách hàng con / chuỗi cửa hàng
                          </span>
                        </>
                      }>
                      {selectedParent ? (
                        <div className="flex h-[42px] items-center gap-2 rounded-lg border border-brand-border bg-brand-soft px-3">
                          <Network className="h-4 w-4 shrink-0 text-brand" />
                          <span className="truncate text-sm font-medium text-brand-dark">
                            {selectedParent.code} - {selectedParent.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedParent(null)}
                            aria-label="Bỏ khách hàng cha"
                            className="ml-auto rounded p-1 text-brand hover:bg-brand-soft">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Tìm khách hàng cha theo mã, tên, SĐT..."
                            value={parentSearch}
                            onChange={(e) => {
                              setParentSearch(e.target.value);
                              setShowParentDropdown(true);
                            }}
                            onFocus={() => setShowParentDropdown(true)}
                            className={cx(inputClass(), "pl-9")}
                          />
                          {showParentDropdown && parentOptions.length > 0 && (
                            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-white py-1 shadow-lg">
                              {parentOptions.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedParent({
                                      id: c.id,
                                      code: c.code,
                                      name: c.name,
                                    });
                                    setParentSearch("");
                                    setShowParentDropdown(false);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                                  <span className="font-medium">{c.code}</span>
                                  <span className="text-gray-400">-</span>
                                  <span className="truncate">{c.name}</span>
                                  {c.contactNumber && (
                                    <span className="ml-auto shrink-0 text-gray-400">
                                      {c.contactNumber}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Field>
                  )}
                </div>
              ) : null}
            </FormSection>

            {/* ── Ghi chú ── */}
            <FormSection title="Ghi chú">
              <textarea
                {...register("comments")}
                placeholder="Ghi chú thêm về khách hàng (thói quen mua, lưu ý giao hàng...)"
                className={cx(
                  "min-h-[132px] w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 transition-colors",
                  FOCUS_RING
                )}
                rows={6}
                maxLength={1000}
              />
            </FormSection>
          </div>

          {/* ================= TAB 2: XUẤT HÓA ĐƠN ================= */}
          <div
            className={
              activeFormTab === "invoice"
                ? "min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3 sm:space-y-4 sm:p-5"
                : "hidden"
            }>
            {customerType !== "0" && customerType !== "1" ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-white px-4 py-10 text-center text-sm text-gray-500">
                <Info className="h-5 w-5 text-gray-400" />
                Chọn loại khách hàng ở phía trên để nhập thông tin xuất hóa đơn.
              </div>
            ) : (
              <FormSection
                title={
                  isOrgType
                    ? "Hóa đơn — Tổ chức/Hộ kinh doanh"
                    : "Hóa đơn — Cá nhân"
                }
                description={
                  isOrgType
                    ? "Không bắt buộc. Nếu nhập Mã số thuế, Địa chỉ hoặc Email thì cần điền đủ cả 3."
                    : "Không bắt buộc. Nếu nhập Tên người mua, Mã số thuế hoặc Địa chỉ thì cần điền đủ cả 3 và Email."
                }>
                {invoiceMissing.length > 0 && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    Còn thiếu:{" "}
                    {invoiceMissing
                      .map((k) => INVOICE_FIELD_LABELS[k])
                      .join(", ")}
                  </div>
                )}

                {/* ── Cá nhân ── */}
                {customerType === "0" && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <Field label="Mã số thuế">
                      <div className="flex gap-2">
                        <input
                          {...register("taxCode")}
                          onBlur={handleTaxCodeBlur}
                          placeholder="Nhập MST để tự điền"
                          className={inputClass(invoiceFieldError("taxCode"))}
                        />
                        {taxLookupButton}
                      </div>
                    </Field>
                    <Field label="Tên người mua">
                      <input
                        {...register("invoiceBuyerName")}
                        placeholder="Nhập tên người mua"
                        className={inputClass(
                          invoiceFieldError("invoiceBuyerName")
                        )}
                      />
                    </Field>
                    <Field label="Địa chỉ" className="sm:col-span-2">
                      <input
                        {...register("invoiceAddress")}
                        placeholder="Địa chỉ ghi trên hóa đơn"
                        className={inputClass(
                          invoiceFieldError("invoiceAddress")
                        )}
                      />
                    </Field>
                    <Field label="Email nhận hóa đơn">
                      <input
                        type="email"
                        {...register("invoiceEmail")}
                        placeholder="email@gmail.com"
                        className={inputClass(
                          invoiceFieldError("invoiceEmail")
                        )}
                      />
                    </Field>
                    <Field label="Số điện thoại">
                      <input
                        {...register("invoicePhone")}
                        type="tel"
                        placeholder="Nhập số điện thoại"
                        className={inputClass()}
                      />
                    </Field>
                    <Field label="Số CCCD/CMND">
                      <input
                        {...register("invoiceCccdCmnd")}
                        placeholder="Nhập số CCCD/CMND"
                        className={inputClass()}
                      />
                    </Field>
                    <Field label="Số hộ chiếu">
                      <input
                        {...register("invoiceBankAccount")}
                        placeholder="Nhập số hộ chiếu"
                        className={inputClass()}
                      />
                    </Field>
                  </div>
                )}

                {/* ── Tổ chức ── */}
                {customerType === "1" && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <Field label="Mã số thuế">
                      <div className="flex gap-2">
                        <input
                          {...register("orgTaxCode")}
                          onBlur={handleTaxCodeBlur}
                          placeholder="Nhập MST để tự điền"
                          className={inputClass(
                            invoiceFieldError("orgTaxCode")
                          )}
                        />
                        {taxLookupButton}
                      </div>
                    </Field>
                    {/* Cùng giá trị với "Tên công ty" ở tab Thông tin chung */}
                    <Field label="Tên công ty">
                      <input
                        value={formValues.organization || ""}
                        onChange={(e) =>
                          setValue("organization", e.target.value)
                        }
                        placeholder="Nhập tên công ty"
                        className={inputClass()}
                      />
                    </Field>
                    <Field label="Địa chỉ" className="sm:col-span-2">
                      <input
                        {...register("orgInvoiceAddress")}
                        placeholder="Địa chỉ ghi trên hóa đơn"
                        className={inputClass(
                          invoiceFieldError("orgInvoiceAddress")
                        )}
                      />
                    </Field>
                    <Field label="Email nhận hóa đơn">
                      <input
                        type="email"
                        {...register("orgInvoiceEmail")}
                        placeholder="email@gmail.com"
                        className={inputClass(
                          invoiceFieldError("orgInvoiceEmail")
                        )}
                      />
                    </Field>
                    <Field label="Số điện thoại">
                      <input
                        {...register("orgInvoicePhone")}
                        type="tel"
                        placeholder="Nhập số điện thoại"
                        className={inputClass()}
                      />
                    </Field>
                    <Field label="Tên người mua">
                      <input
                        {...register("orgInvoiceBuyerName")}
                        placeholder="Không bắt buộc"
                        className={inputClass()}
                      />
                    </Field>
                    <Field label="Mã ĐVQHNS">
                      <input
                        {...register("invoiceDvqhnsCode")}
                        placeholder="Mã đơn vị quan hệ ngân sách"
                        className={inputClass()}
                      />
                    </Field>
                  </div>
                )}
              </FormSection>
            )}
          </div>

          {/* ================= TAB 3: CÔNG NỢ (chỉ khi sửa) ================= */}
          {showDebtTab && (
            <div
              className={
                activeFormTab === "debt"
                  ? "min-h-0 flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-5"
                  : "hidden"
              }>
              <section className="rounded-xl border bg-white p-4 sm:p-5">
                {debtError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {debtError}
                  </div>
                )}
                <DebtPolicyFields
                  value={debtPolicyForm}
                  onChange={(patch) =>
                    setDebtPolicyForm((prev) => ({ ...prev, ...patch }))
                  }
                />
              </section>
            </div>
          )}

          {/* ===== Footer ===== */}
          <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t bg-white px-4 py-3 sm:px-6">
            <span className="hidden text-xs text-gray-500 sm:inline">
              <span className="text-red-500">*</span> Trường bắt buộc
            </span>
            <div className="flex flex-1 justify-end gap-2 sm:flex-none">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-lg border px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {customer ? "Lưu thay đổi" : "Tạo khách hàng"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <CustomerAddressFormModal
        isOpen={addrModal.open}
        mode={addrModal.mode}
        initial={
          addrModal.mode === "edit" && addrModal.index != null
            ? addresses[addrModal.index]
            : undefined
        }
        cities={cities}
        invoiceProvinces={invoiceProvinces}
        invoiceCommunes={invoiceCommunes}
        onClose={() => setAddrModal({ open: false, mode: "create" })}
        onSubmit={(addr) =>
          addrModal.mode === "create"
            ? handleAddFromModal(addr)
            : handleEditFromModal(addr)
        }
      />
    </div>,
    document.body
  );
}
