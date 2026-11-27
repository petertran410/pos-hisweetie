import type { NppStage } from "@/lib/types/new-product-price";

export type NppFieldType =
  | "text"
  | "textarea"
  | "money"
  | "number"
  | "date"
  | "url"
  | "parent"
  | "middle"
  | "child"
  | "trademark"
  | "unit"
  | "costApprover"
  | "priceBook"
  | "supplier"
  | "factory"
  | "misa"
  | "customers"
  | "computed";

export interface NppFieldDef {
  key: string;
  label: string;
  type: NppFieldType;
  /** Bắt buộc khi hoàn tất bước (khớp STAGE_FIELDS ở backend). */
  required?: boolean;
  wide?: boolean;
  digits?: number;
  suffix?: string;
}

export interface NppSectionDef {
  key: string;
  /** Bước sở hữu phần này (null = dùng chung, vd Ghi chú). */
  stage: NppStage | null;
  title: string;
  fields: NppFieldDef[];
}

/** Các phần thông tin theo bước — trường & dấu * theo cấu hình Flow trên Lark. */
export const NPP_SECTIONS: NppSectionDef[] = [
  {
    key: "proposal",
    stage: "PROPOSAL",
    title: "Đề xuất",
    fields: [
      {
        key: "productName",
        label: "Tên hàng hóa",
        type: "text",
        required: true,
        wide: true,
      },
      { key: "parentName", label: "Loại hàng", type: "parent", required: true },
      {
        key: "childName",
        label: "Danh mục hàng",
        type: "child",
        required: true,
      },
      {
        key: "tradeMarkId",
        label: "Thương hiệu",
        type: "trademark",
        required: true,
      },
      { key: "unit", label: "Đơn vị tính", type: "unit", required: true },
      {
        key: "netWeightGram",
        label: "Khối lượng tịnh (gram)",
        type: "number",
        required: true,
        digits: 2,
      },
      {
        key: "costApproverId",
        label: "Người duyệt giá cost",
        type: "costApprover",
      },
      {
        key: "description",
        label: "Mô tả sản phẩm",
        type: "textarea",
        wide: true,
      },
    ],
  },
  {
    key: "purchasing",
    stage: "PURCHASING",
    title: "Phòng Thu Mua",
    fields: [
      { key: "supplierId", label: "Nhà cung cấp", type: "supplier" },
      { key: "factoryId", label: "Nhà máy", type: "factory" },
      {
        key: "middleName",
        label: "Nguồn gốc hàng",
        type: "middle",
        required: true,
      },
      { key: "arrivalDate", label: "Thời gian hàng về", type: "date" },
      {
        key: "packingSpec",
        label: "Quy cách đóng gói",
        type: "number",
        required: true,
        digits: 2,
      },
      {
        key: "goodsPrice",
        label: "Giá hàng",
        type: "number",
        required: true,
        digits: 2,
      },
      { key: "exchangeRate", label: "Tỉ giá", type: "number", digits: 4 },
      { key: "goodsPriceVnd", label: "Giá hàng VNĐ", type: "computed" },
      { key: "overheadCost", label: "Chi phí chung", type: "money" },
      { key: "vatTax", label: "Thuế GTGT", type: "money" },
      { key: "importTax", label: "Thuế nhập khẩu", type: "money" },
      { key: "costHn", label: "Cost Hà Nội (trước VAT)", type: "money" },
      { key: "costSg", label: "Cost Sài Gòn (trước VAT)", type: "money" },
      { key: "moqCartons", label: "MOQ (Thùng)", type: "number", digits: 2 },
      { key: "deliveryTerms", label: "Điều kiện giao hàng", type: "text" },
      { key: "importName", label: "Tên hàng nhập khẩu", type: "text" },
    ],
  },
  {
    key: "accounting",
    stage: "ACCOUNTING",
    title: "Phòng Kế Toán",
    fields: [
      { key: "cogsHn", label: "Giá vốn Hà Nội", type: "money", required: true },
      {
        key: "cogsSg",
        label: "Giá vốn Sài Gòn",
        type: "money",
        required: true,
      },
      {
        key: "cogsDt",
        label: "Giá vốn CH Diệp Trà",
        type: "money",
        required: true,
      },
      { key: "misaCode", label: "Mã Misa", type: "misa" },
    ],
  },
  {
    key: "sales",
    stage: "SALES",
    title: "Phòng Kinh Doanh",
    fields: [
      { key: "priceHnRetail", label: "HN - Giá Lẻ", type: "money" },
      { key: "priceHnWholesale", label: "HN - Giá Buôn", type: "money" },
      { key: "priceSgRetail", label: "SG - Giá Lẻ", type: "money" },
      { key: "priceSgWholesale", label: "SG - Giá Buôn", type: "money" },
      { key: "priceDlcl", label: "Giá ĐLCL", type: "money" },
      { key: "priceShopee", label: "Giá Shopee", type: "money" },
      { key: "priceOem", label: "Giá OEM", type: "money" },
      { key: "oemPriceBookId", label: "Bảng giá OEM", type: "priceBook" },
      { key: "launchDate", label: "Thời gian ra mắt", type: "date" },
      {
        key: "oemCustomers",
        label: "Khách OEM",
        type: "customers",
        wide: true,
      },
    ],
  },
  {
    key: "note",
    stage: null,
    title: "Ghi chú",
    fields: [{ key: "note", label: "Ghi chú", type: "textarea", wide: true }],
  },
];
