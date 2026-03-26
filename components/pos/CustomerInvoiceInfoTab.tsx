"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useUpdateCustomer } from "@/lib/hooks/useCustomers";
import { toast } from "sonner";
import { Pencil, Save, X as XIcon } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface CustomerInvoiceInfoTabProps {
  customer: any;
  onUpdate?: (customer: any) => void;
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

export function CustomerInvoiceInfoTab({
  customer,
  onUpdate,
}: CustomerInvoiceInfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateCustomer = useUpdateCustomer();
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      type: customer.type?.toString() || "0",
      invoiceBuyerName: customer.invoiceBuyerName || "",
      invoiceAddress: customer.invoiceAddress || "",
      invoiceCityCode: customer.invoiceCityCode || "",
      invoiceWardCode: customer.invoiceWardCode || "",
      invoiceEmail: customer.invoiceEmail || "",
      invoicePhone: customer.invoicePhone || "",
      invoiceCccdCmnd: customer.invoiceCccdCmnd || "",
      invoiceBankAccount: customer.invoiceBankAccount || "",
      invoiceDvqhnsCode: customer.invoiceDvqhnsCode || "",
      taxCode: customer.taxCode || "",
      organization: customer.organization || "",
    },
  });

  const [invoiceProvinces, setInvoiceProvinces] = useState<Province[]>([]);
  const [invoiceCommunes, setInvoiceCommunes] = useState<Commune[]>([]);
  const [filteredInvoiceCommunes, setFilteredInvoiceCommunes] = useState<
    Commune[]
  >([]);

  const customerType = watch("type");
  const selectedInvoiceCityCode = watch("invoiceCityCode");

  useEffect(() => {
    const loadInvoiceData = async () => {
      try {
        const [provincesRes, communesRes] = await Promise.all([
          fetch("/data/new-province-location.json"),
          fetch("/data/new-commune-location.json"),
        ]);

        const provincesData = await provincesRes.json();
        const communesData = await communesRes.json();

        if (Array.isArray(provincesData)) {
          setInvoiceProvinces(provincesData);
        } else if (provincesData && Array.isArray(provincesData.provinces)) {
          setInvoiceProvinces(provincesData.provinces);
        }

        if (Array.isArray(communesData)) {
          setInvoiceCommunes(communesData);
        } else if (communesData && Array.isArray(communesData.communes)) {
          setInvoiceCommunes(communesData.communes);
        }
      } catch (error) {
        console.error("Error loading invoice data:", error);
        toast.error("Không thể tải dữ liệu địa chỉ xuất hóa đơn");
      }
    };
    loadInvoiceData();
  }, []);

  useEffect(() => {
    if (selectedInvoiceCityCode && invoiceCommunes.length > 0) {
      const filtered = invoiceCommunes.filter(
        (commune) =>
          String(commune.provinceCode) === String(selectedInvoiceCityCode)
      );
      setFilteredInvoiceCommunes(filtered);
    } else {
      setFilteredInvoiceCommunes([]);
    }
  }, [selectedInvoiceCityCode, invoiceCommunes]);

  const onSubmit = async (data: any) => {
    try {
      const updateData: any = {
        type: parseInt(data.type),
        invoiceAddress: data.invoiceAddress || null,
        invoiceBuyerName: data.invoiceBuyerName || null,
        invoiceCccdCmnd: data.invoiceCccdCmnd || null,
        invoiceBankAccount: data.invoiceBankAccount || null,
        invoiceDvqhnsCode: data.invoiceDvqhnsCode || null,
        invoiceEmail: data.invoiceEmail || null,
        invoicePhone: data.invoicePhone || null,
      };

      if (data.type === "1") {
        updateData.taxCode = data.taxCode || null;
        updateData.organization = data.organization || null;
      }

      if (data.invoiceCityCode) {
        updateData.invoiceCityCode = data.invoiceCityCode;
        const province = invoiceProvinces.find(
          (p) => p.code === data.invoiceCityCode
        );
        if (province) {
          updateData.invoiceCityName = province.name;
        }
      } else {
        updateData.invoiceCityCode = null;
        updateData.invoiceCityName = null;
      }

      if (data.invoiceWardCode) {
        updateData.invoiceWardCode = data.invoiceWardCode;
        const commune = invoiceCommunes.find(
          (c) => c.code === data.invoiceWardCode
        );
        if (commune) {
          updateData.invoiceWardName = commune.name;
        }
      } else {
        updateData.invoiceWardCode = null;
        updateData.invoiceWardName = null;
      }

      await updateCustomer.mutateAsync({
        id: customer.id,
        data: updateData,
      });

      toast.success("Cập nhật thông tin xuất hóa đơn thành công");
      setIsEditing(false);

      if (onUpdate) {
        onUpdate({ ...customer, ...updateData });
      }
    } catch (error: any) {
      toast.error(error.message || "Cập nhật thông tin thất bại");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValue("type", customer.type?.toString() || "0");
    setValue("invoiceBuyerName", customer.invoiceBuyerName || "");
    setValue("invoiceAddress", customer.invoiceAddress || "");
    setValue("invoiceCityCode", customer.invoiceCityCode || "");
    setValue("invoiceWardCode", customer.invoiceWardCode || "");
    setValue("invoiceEmail", customer.invoiceEmail || "");
    setValue("invoicePhone", customer.invoicePhone || "");
    setValue("invoiceCccdCmnd", customer.invoiceCccdCmnd || "");
    setValue("invoiceBankAccount", customer.invoiceBankAccount || "");
    setValue("invoiceDvqhnsCode", customer.invoiceDvqhnsCode || "");
    setValue("taxCode", customer.taxCode || "");
    setValue("organization", customer.organization || "");
  };

  if (!isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Thông tin xuất hóa đơn</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Chỉnh sửa
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Loại khách hàng
            </label>
            <div className="text-base">
              {customer.type === 0 ? "Cá nhân" : "Tổ chức/Hộ kinh doanh"}
            </div>
          </div>

          {customer.type === 0 && (
            <>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Tên người mua
                </label>
                <div className="text-base">
                  {customer.invoiceBuyerName || "Chưa có"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Số CCCD/CMND
                </label>
                <div className="text-base">
                  {customer.invoiceCccdCmnd || "Chưa có"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Số hộ chiếu
                </label>
                <div className="text-base">
                  {customer.invoiceBankAccount || "Chưa có"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Mã ĐVQHNS
                </label>
                <div className="text-base">
                  {customer.invoiceDvqhnsCode || "Chưa có"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Email
                </label>
                <div className="text-base">
                  {customer.invoiceEmail || "Chưa có"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Số điện thoại
                </label>
                <div className="text-base">
                  {customer.invoicePhone || "Chưa có"}
                </div>
              </div>
            </>
          )}

          {customer.type === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Mã số thuế
                </label>
                <div className="text-base">{customer.taxCode || "Chưa có"}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Tên công ty
                </label>
                <div className="text-base">
                  {customer.organization || "Chưa có"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Tên người mua
                </label>
                <div className="text-base">
                  {customer.invoiceBuyerName || "Chưa có"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Mã ĐVQHNS
                </label>
                <div className="text-base">
                  {customer.invoiceDvqhnsCode || "Chưa có"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Email
                </label>
                <div className="text-base">
                  {customer.invoiceEmail || "Chưa có"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Số điện thoại
                </label>
                <div className="text-base">
                  {customer.invoicePhone || "Chưa có"}
                </div>
              </div>
            </>
          )}

          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Địa chỉ xuất hóa đơn
            </label>
            <div className="text-base">
              {[
                customer.invoiceAddress,
                customer.invoiceWardName,
                customer.invoiceCityName,
              ]
                .filter(Boolean)
                .join(", ") || "Chưa có"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Chỉnh sửa thông tin xuất hóa đơn
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2">
            <XIcon className="w-4 h-4" />
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
            <Save className="w-4 h-4" />
            Lưu
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Loại khách hàng
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" value="0" {...register("type")} />
            <span>Cá nhân</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" value="1" {...register("type")} />
            <span>Tổ chức/Hộ kinh doanh</span>
          </label>
        </div>
      </div>

      {customerType === "0" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              Tên người mua
            </label>
            <input
              {...register("invoiceBuyerName")}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập tên người mua"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Địa chỉ</label>
            <input
              {...register("invoiceAddress")}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập địa chỉ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tỉnh/Thành phố
            </label>
            <SearchableSelect
              options={(invoiceProvinces || []).map((province) => ({
                value: province.code,
                label: province.name,
              }))}
              value={watch("invoiceCityCode") || ""}
              onChange={(value) => {
                setValue("invoiceCityCode", value);
                setValue("invoiceWardCode", "");
              }}
              placeholder="Tìm Tỉnh/Thành phố"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phường/Xã</label>
            <SearchableSelect
              options={filteredInvoiceCommunes.map(
                (commune: { code: any; name: any }) => ({
                  value: commune.code,
                  label: commune.name,
                })
              )}
              value={watch("invoiceWardCode") || ""}
              onChange={(value) => setValue("invoiceWardCode", value)}
              placeholder="Tìm Phường/Xã"
              disabled={!selectedInvoiceCityCode}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Số CCCD/CMND
            </label>
            <input
              {...register("invoiceCccdCmnd")}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập số CCCD/CMND"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Số hộ chiếu
            </label>
            <input
              {...register("invoiceBankAccount")}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập số hộ chiếu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mã ĐVQHNS</label>
            <input
              {...register("invoiceDvqhnsCode")}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập mã đơn vị"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              {...register("invoiceEmail")}
              type="email"
              className="w-full border rounded px-3 py-2"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Số điện thoại
            </label>
            <input
              {...register("invoicePhone")}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập số điện thoại"
            />
          </div>
        </div>
      )}

      {customerType === "1" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Mã số thuế <span className="text-red-500">*</span>
            </label>
            <input
              {...register("taxCode", {
                required: customerType === "1",
              })}
              className="w-full border rounded px-3 py-2"
              placeholder="Bắt buộc"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tên công ty
            </label>
            <input
              {...register("organization")}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập tên công ty"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Địa chỉ</label>
            <input
              {...register("invoiceAddress")}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập địa chỉ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tỉnh/Thành phố
            </label>
            <SearchableSelect
              options={(invoiceProvinces || []).map((province) => ({
                value: province.code,
                label: province.name,
              }))}
              value={watch("invoiceCityCode") || ""}
              onChange={(value) => {
                setValue("invoiceCityCode", value);
                setValue("invoiceWardCode", "");
              }}
              placeholder="Tìm Tỉnh/Thành phố"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Phường/Xã</label>
            <SearchableSelect
              options={filteredInvoiceCommunes.map(
                (commune: { code: any; name: any }) => ({
                  value: commune.code,
                  label: commune.name,
                })
              )}
              value={watch("invoiceWardCode") || ""}
              onChange={(value) => setValue("invoiceWardCode", value)}
              placeholder="Tìm Phường/Xã"
              disabled={!selectedInvoiceCityCode}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tên người mua
            </label>
            <input
              {...register("invoiceBuyerName")}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập tên người mua"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mã ĐVQHNS</label>
            <input
              {...register("invoiceDvqhnsCode")}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập mã đơn vị"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              {...register("invoiceEmail")}
              type="email"
              className="w-full border rounded px-3 py-2"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Số điện thoại
            </label>
            <input
              {...register("invoicePhone")}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập số điện thoại"
            />
          </div>
        </div>
      )}
    </form>
  );
}
