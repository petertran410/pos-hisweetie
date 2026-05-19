"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useUpdateCustomer } from "@/lib/hooks/useCustomers";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Pencil, Save, X as XIcon, Calendar } from "lucide-react";

interface CustomerInfoTabProps {
  customer: any;
  onUpdate?: (customer: any) => void;
}

export function CustomerInfoTab({ customer, onUpdate }: CustomerInfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateCustomer = useUpdateCustomer();

  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      name: customer.name || "",
      contactNumber: customer.contactNumber || "",
      phone: customer.phone || "",
      email: customer.email || "",
      gender:
        customer.gender === true
          ? "true"
          : customer.gender === false
            ? "false"
            : "",
      comments: customer.comments || "",
    },
  });

  const [birthDate, setBirthDate] = useState<Date | null>(
    customer.birthDate ? new Date(customer.birthDate) : null
  );
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const birthDatePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        birthDatePickerRef.current &&
        !birthDatePickerRef.current.contains(event.target as Node)
      ) {
        setShowBirthDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onSubmit = async (data: any) => {
    try {
      const updateData: any = {
        name: data.name,
        contactNumber: data.contactNumber,
        phone: data.phone || null,
        email: data.email || null,
        gender:
          data.gender === "true"
            ? true
            : data.gender === "false"
              ? false
              : null,
        birthDate: birthDate ? birthDate.toISOString() : null,
        comments: data.comments || null,
      };

      await updateCustomer.mutateAsync({
        id: customer.id,
        data: updateData,
      });

      toast.success("Cập nhật thông tin khách hàng thành công");
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
    setValue("name", customer.name || "");
    setValue("contactNumber", customer.contactNumber || "");
    setValue("phone", customer.phone || "");
    setValue("email", customer.email || "");
    setValue(
      "gender",
      customer.gender === true
        ? "true"
        : customer.gender === false
          ? "false"
          : ""
    );
    setValue("comments", customer.comments || "");
    setBirthDate(customer.birthDate ? new Date(customer.birthDate) : null);
  };

  if (!isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base lg:text-lg font-semibold">
            Thông tin khách hàng
          </h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Chỉnh sửa
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          <div>
            <label className="block text-xs lg:text-sm font-medium text-gray-500 mb-1">
              Tên khách hàng
            </label>
            <div className="text-sm lg:text-base">{customer.name || "-"}</div>
          </div>

          <div>
            <label className="block text-xs lg:text-sm font-medium text-gray-500 mb-1">
              Điện thoại
            </label>
            <div className="text-sm lg:text-base">
              {customer.contactNumber || customer.phone || "-"}
            </div>
          </div>

          <div>
            <label className="block text-xs lg:text-sm font-medium text-gray-500 mb-1">
              Email
            </label>
            <div className="text-sm lg:text-base">{customer.email || "-"}</div>
          </div>

          <div>
            <label className="block text-xs lg:text-sm font-medium text-gray-500 mb-1">
              Giới tính
            </label>
            <div className="text-sm lg:text-base">
              {customer.gender === true
                ? "Nam"
                : customer.gender === false
                  ? "Nữ"
                  : "-"}
            </div>
          </div>

          <div>
            <label className="block text-xs lg:text-sm font-medium text-gray-500 mb-1">
              Ngày sinh
            </label>
            <div className="text-sm lg:text-base">
              {customer.birthDate ? formatDate(customer.birthDate) : "-"}
            </div>
          </div>

          {customer.comments && (
            <div className="col-span-2 lg:col-span-3">
              <label className="block text-xs lg:text-sm font-medium text-gray-500 mb-1">
                Ghi chú
              </label>
              <div className="text-base bg-gray-50 p-3 rounded">
                {customer.comments}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Chỉnh sửa thông tin khách hàng
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Tên khách hàng <span className="text-red-500">*</span>
          </label>
          <input
            {...register("name", { required: true })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Điện thoại</label>
          <input
            {...register("contactNumber")}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Điện thoại phụ
          </label>
          <input
            {...register("phone")}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            {...register("email")}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Giới tính</label>
          <select
            {...register("gender")}
            className="w-full border rounded px-3 py-2">
            <option value="">Chọn giới tính</option>
            <option value="true">Nam</option>
            <option value="false">Nữ</option>
          </select>
        </div>

        <div className="relative" ref={birthDatePickerRef}>
          <label className="block text-sm font-medium mb-2">Ngày sinh</label>
          <button
            type="button"
            onClick={() => setShowBirthDatePicker(!showBirthDatePicker)}
            className="w-full border rounded px-3 py-2 text-left flex items-center justify-between">
            <span className={birthDate ? "" : "text-gray-400"}>
              {birthDate
                ? formatDate(birthDate.toISOString())
                : "Chọn ngày sinh"}
            </span>
            <Calendar className="w-4 h-4 text-gray-400" />
          </button>
          {showBirthDatePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-4 z-10">
              <input
                type="date"
                value={birthDate ? birthDate.toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setBirthDate(new Date(e.target.value));
                  } else {
                    setBirthDate(null);
                  }
                  setShowBirthDatePicker(false);
                }}
                className="border rounded px-3 py-2"
              />
            </div>
          )}
        </div>

        <div className="col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium mb-2">Ghi chú</label>
          <textarea
            {...register("comments")}
            className="w-full border rounded px-3 py-2"
            rows={3}
            maxLength={1000}
            placeholder="Ghi chú về khách hàng"
          />
        </div>
      </div>
    </form>
  );
}
