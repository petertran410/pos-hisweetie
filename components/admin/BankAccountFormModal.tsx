"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useBranches } from "@/lib/hooks/useBranches";

const VIETNAM_BANKS = [
  { code: "TCB", name: "Techcombank - Ngân hàng TMCP Kỹ thương Việt Nam" },
  { code: "COOPBANK", name: "COOPBANK - Ngân hàng Hợp tác xã Việt Nam" },
  { code: "ACB", name: "ACB - Ngân hàng TMCP Á Châu" },
  { code: "VPB", name: "VPBank - Ngân hàng TMCP Việt Nam Thịnh Vượng" },
  { code: "MSB", name: "MSB - Ngân hàng TMCP Hàng Hải" },
  { code: "ABB", name: "ABBANK - Ngân hàng TMCP An Bình" },
  { code: "VTB", name: "Vietinbank - Ngân hàng TMCP Công thương Việt Nam" },
  { code: "VIB", name: "VIB - Ngân hàng TMCP Quốc tế Việt Nam" },
  { code: "OCB", name: "OCB - Ngân hàng TMCP Phương Đông" },
  { code: "BAB", name: "BacABank - Ngân hàng TMCP Bắc Á" },
  { code: "DAB", name: "DongABank - Ngân hàng TMCP Đông Á" },
  { code: "NCB", name: "NCB - Ngân hàng TMCP Quốc Dân" },
  { code: "VCAB", name: "VietCapitalBank - Ngân hàng TMCP Bản Việt" },
  { code: "LPB", name: "LPBank - Ngân hàng TMCP Lộc Phát Việt Nam" },
  { code: "STB", name: "Sacombank - Ngân hàng TMCP Sài Gòn Thương Tín" },
  { code: "SBC", name: "SaigonBank - Ngân hàng TMCP Sài Gòn Công Thương" },
  {
    code: "AGR",
    name: "Agribank - Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam",
  },
  {
    code: "HDB",
    name: "HDBank - Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh",
  },
  { code: "PGB", name: "PGBank - Ngân hàng TMCP Xăng dầu Petrolimex" },
  { code: "MB", name: "MBBank - Ngân hàng TMCP Quân đội" },
  { code: "SAB", name: "SeABank - Ngân hàng TMCP Đông Nam Á" },
  { code: "SHB", name: "SHB - Ngân hàng TMCP Sài Gòn - Hà Nội" },
  { code: "NAB", name: "NamABank - Ngân hàng TMCP Nam Á" },
  { code: "PVCB", name: "PVcomBank - Ngân hàng TMCP Đại Chúng Việt Nam" },
  { code: "VBC", name: "VietBank - Ngân hàng TMCP Việt Nam Thương Tín" },
  { code: "TPB", name: "TPBank - Ngân hàng TMCP Tiên Phong" },
  { code: "KLB", name: "KienLongBank - Ngân hàng TMCP Kiên Long" },
  { code: "VCB", name: "Vietcombank - Ngân hàng TMCP Ngoại Thương Việt Nam" },
  { code: "IVB", name: "IndovinaBank - Ngân hàng TNHH Indovina" },
  { code: "SCB", name: "SCB - Ngân hàng TMCP Sài Gòn" },
  { code: "BIDV", name: "BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
  { code: "EIB", name: "Eximbank - Ngân hàng TMCP Xuất Nhập khẩu Việt Nam" },
  { code: "VAB", name: "VietABank - Ngân hàng TMCP Việt Á" },
  { code: "BVB", name: "BaoVietBank - Ngân hàng TMCP Bảo Việt" },
  {
    code: "SHINHAN",
    name: "ShinhanBank - Ngân hàng TNHH MTV Shinhan Việt Nam",
  },
  { code: "HSBC", name: "HSBC - Ngân hàng TNHH MTV HSBC (Việt Nam)" },
  { code: "WRB", name: "Woori - Ngân hàng TNHH MTV Woori Việt Nam" },
  { code: "CIMB", name: "CIMB - Ngân hàng TNHH MTV CIMB Việt Nam" },
  {
    code: "HONGLEONG",
    name: "HongLeong - Ngân hàng TNHH MTV Hongleong Việt Nam",
  },
  {
    code: "SCVN",
    name: "StandardChartered - Ngân hàng TNHH MTV Standard Chartered Bank Việt Nam",
  },
  { code: "IBK", name: "IBK - Ngân hàng Công nghiệp Hàn Quốc" },
  {
    code: "CAKE",
    name: "CAKE - TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank",
  },
  {
    code: "Ubank",
    name: "Ubank - TMCP Việt Nam Thịnh Vượng - Ngân hàng số Ubank by VPBank",
  },
  { code: "TIMO", name: "Timo - Ngân hàng số Timo by Ban Viet Bank" },
  { code: "LIOBANK", name: "LioBank - Ngân hàng số LioBank" },
  { code: "VTLMONEY", name: "ViettelMoney - Tổng Công ty Dịch vụ số Viettel" },
  {
    code: "VNPTMONEY",
    name: "VNPTMoney - Trung tâm dịch vụ tài chính số VNPT",
  },
];

export function BankAccountFormModal({
  bankAccount,
  onClose,
}: {
  bankAccount?: any;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: branches } = useBranches();
  const [activeTab, setActiveTab] = useState<"info" | "scope">("info");

  const [formData, setFormData] = useState({
    accountNumber: "",
    bankCode: "",
    bankName: "",
    accountHolder: "",
    note: "",
    scope: "all",
    branchIds: [] as number[],
  });

  useEffect(() => {
    if (bankAccount) {
      setFormData({
        accountNumber: bankAccount.accountNumber || "",
        bankCode: bankAccount.bankCode || "",
        bankName: bankAccount.bankName || "",
        accountHolder: bankAccount.accountHolder || "",
        note: bankAccount.note || "",
        scope: bankAccount.scope || "all",
        branchIds: bankAccount.branchIds || [],
      });
    }
  }, [bankAccount]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = bankAccount
        ? `/api/bank-accounts/${bankAccount.id}`
        : "/api/bank-accounts";
      const method = bankAccount ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Lưu thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast.success(
        bankAccount
          ? "Cập nhật tài khoản thành công"
          : "Tạo tài khoản thành công"
      );
      onClose();
    },
    onError: () => {
      toast.error("Lưu tài khoản thất bại");
    },
  });

  const handleBankChange = (code: string) => {
    const bank = VIETNAM_BANKS.find((b) => b.code === code);
    setFormData({
      ...formData,
      bankCode: code,
      bankName: bank?.name || "",
    });
  };

  const handleBranchToggle = (branchId: number) => {
    setFormData({
      ...formData,
      branchIds: formData.branchIds.includes(branchId)
        ? formData.branchIds.filter((id) => id !== branchId)
        : [...formData.branchIds, branchId],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {bankAccount
              ? "Sửa tài khoản ngân hàng"
              : "Thêm tài khoản ngân hàng"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-6 py-3 font-medium border-b-2 ${
                activeTab === "info"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600"
              }`}>
              Thông tin
            </button>
            <button
              onClick={() => setActiveTab("scope")}
              className={`px-6 py-3 font-medium border-b-2 ${
                activeTab === "scope"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600"
              }`}>
              Phạm vi áp dụng
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeTab === "info" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Số tài khoản <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.accountNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accountNumber: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Nhập số tài khoản"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Ngân hàng <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.bankCode}
                    onChange={(e) => handleBankChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Chọn ngân hàng</option>
                    {VIETNAM_BANKS.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.code} - {bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Chủ tài khoản <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.accountHolder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accountHolder: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Nhập tên chủ tài khoản"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    value={formData.note}
                    onChange={(e) =>
                      setFormData({ ...formData, note: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Nhập ghi chú"
                  />
                </div>
              </>
            )}

            {activeTab === "scope" && (
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="scope"
                      checked={formData.scope === "all"}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          scope: "all",
                          branchIds: [],
                        })
                      }
                    />
                    <div>
                      <div className="font-medium">Toàn hệ thống</div>
                      <div className="text-sm text-gray-600">
                        Áp dụng cho tất cả chi nhánh
                      </div>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="flex items-start gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="scope"
                      checked={formData.scope === "specific"}
                      onChange={() =>
                        setFormData({ ...formData, scope: "specific" })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Chi nhánh cụ thể</div>
                      <div className="text-sm text-gray-600 mb-3">
                        Chọn các chi nhánh áp dụng
                      </div>

                      {formData.scope === "specific" && (
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                          {branches?.map((branch: any) => (
                            <label
                              key={branch.id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.branchIds.includes(branch.id)}
                                onChange={() => handleBranchToggle(branch.id)}
                              />
                              <span className="text-sm">{branch.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100">
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {bankAccount ? "Cập nhật" : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
