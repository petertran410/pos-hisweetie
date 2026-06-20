"use client";

import { X, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import { AddressAutocompleteInput } from "@/components/pos/AddressAutocompleteInput";
import { FormSection } from "../FormSection";
import type { UsePublicationReturn } from "./usePublication";

interface Props {
  pub: UsePublicationReturn;
}

/**
 * UI tab "Công bố" dùng chung: upload nhiều tệp + Nhà công bố + Vị trí
 * (autocomplete + tỉnh/phường mới + toggle địa chỉ cũ) + Ngày + Link.
 */
export function PublicationSection({ pub }: Props) {
  const {
    documents,
    cities,
    pubProvinces,
    showOldPubAddress,
    setShowOldPubAddress,
    pubLocation,
    publicationDate,
    setPublicationDate,
    showPubDatePicker,
    setShowPubDatePicker,
    pubDatePickerRef,
    publicationLink,
    setPublicationLink,
    pubDistricts,
    pubWards,
    pubFilteredCommunes,
    setPub,
    handlePubCityChange,
    handlePubDistrictChange,
    handlePubWardChange,
    handlePubNewCityChange,
    handlePubNewWardChange,
    handlePubSelectSuggestion,
    handleDocumentSelect,
    removeDocument,
    formatFileSize,
  } = pub;

  return (
    <>
      <FormSection
        title="Tài liệu công bố"
        description="Tải lên các tệp công bố sản phẩm (PDF, ảnh, Word, Excel...). Cho phép tải nhiều tệp, mỗi tệp tối đa 10MB.">
        <label className="flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-gray-50 bg-white">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,image/*"
            onChange={handleDocumentSelect}
            className="hidden"
          />
          <span className="text-3xl text-gray-400 leading-none">+</span>
          <span className="text-sm text-gray-500 mt-2">
            Bấm để chọn tệp (có thể chọn nhiều)
          </span>
          <span className="text-xs text-gray-400 mt-1">
            PDF, Word, Excel, ảnh, zip... — tối đa 10MB/tệp
          </span>
        </label>

        {documents.length > 0 && (
          <ul className="mt-4 space-y-2">
            {documents.map((doc, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3 border rounded px-3 py-2 bg-white">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                    {(doc.name.split(".").pop() || "file").slice(0, 4)}
                  </span>
                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-brand hover:underline"
                      title={doc.name}>
                      {doc.name}
                    </a>
                  ) : (
                    <span
                      className="truncate text-sm text-gray-700"
                      title={doc.name}>
                      {doc.name}
                    </span>
                  )}
                  {doc.size ? (
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatFileSize(doc.size)}
                    </span>
                  ) : null}
                  {!doc.url && (
                    <span className="shrink-0 text-xs text-orange-500">
                      (chưa lưu)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeDocument(index)}
                  className="shrink-0 text-red-500 hover:text-red-700"
                  title="Xóa tệp">
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      {/* Vị trí công bố / Ngày công bố / Link công bố */}
      <FormSection
        title="Thông tin công bố"
        description="Vị trí, ngày và đường dẫn công bố sản phẩm.">
        {/* Vị trí công bố */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Vị trí công bố
          </label>

          {/* Nhà công bố + Địa chỉ chi tiết + autocomplete */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Nhà công bố
              </label>
              <input
                type="text"
                value={pubLocation.publisher || ""}
                onChange={(e) =>
                  setPub("publisher", e.target.value || undefined)
                }
                placeholder="Nhập nhà công bố"
                className="w-full border rounded px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Địa chỉ chi tiết
              </label>
              <AddressAutocompleteInput
                value={pubLocation.address || ""}
                onChange={(text) => setPub("address", text || undefined)}
                onSelect={handlePubSelectSuggestion}
                placeholder="VD: 123 Nguyễn Trãi"
                className="w-full border rounded px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>

          {/* Địa chỉ mới (sau sáp nhập) */}
          <div className="border-t mt-3 pt-3">
            <p className="text-sm font-medium mb-2 text-gray-700">
              Địa chỉ mới (Tỉnh / Phường — sau sáp nhập)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Tỉnh/Thành phố
                </label>
                <SearchableSelect
                  options={(pubProvinces || []).map((p) => ({
                    value: p.code,
                    label: p.name,
                  }))}
                  value={pubLocation.newCityCode || ""}
                  onChange={handlePubNewCityChange}
                  placeholder="Tìm Tỉnh/Thành phố"
                  size="sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Phường/Xã
                </label>
                <SearchableSelect
                  options={pubFilteredCommunes.map((c) => ({
                    value: c.code,
                    label: c.name,
                  }))}
                  value={pubLocation.newWardCode || ""}
                  onChange={handlePubNewWardChange}
                  placeholder="Tìm Phường/Xã"
                  disabled={!pubLocation.newCityCode}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Địa chỉ cũ — toggle */}
          <div className="border-t mt-3 pt-3">
            <button
              type="button"
              onClick={() => setShowOldPubAddress((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-brand hover:text-brand-dark font-medium">
              {showOldPubAddress ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              Địa chỉ cũ (Tỉnh / Quận / Phường — trước sáp nhập)
            </button>

            {showOldPubAddress && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Tỉnh/Thành phố
                  </label>
                  <SearchableSelect
                    options={cities.map((c) => ({
                      value: String(c.code),
                      label: c.name,
                    }))}
                    value={pubLocation.cityCode || ""}
                    onChange={handlePubCityChange}
                    placeholder="Chọn Tỉnh/Thành phố"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Quận/Huyện
                  </label>
                  <SearchableSelect
                    options={pubDistricts.map((d) => ({
                      value: String(d.code),
                      label: d.name,
                    }))}
                    value={pubLocation.districtCode || ""}
                    onChange={handlePubDistrictChange}
                    placeholder="Chọn Quận/Huyện"
                    disabled={!pubLocation.cityCode}
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Phường/Xã
                  </label>
                  <SearchableSelect
                    options={pubWards.map((w) => ({
                      value: String(w.code),
                      label: w.name,
                    }))}
                    value={pubLocation.wardCode || ""}
                    onChange={handlePubWardChange}
                    placeholder="Chọn Phường/Xã"
                    disabled={!pubLocation.districtCode}
                    size="sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ngày công bố + Link công bố */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Ngày công bố
            </label>
            <div className="relative" ref={pubDatePickerRef}>
              <button
                type="button"
                onClick={() => setShowPubDatePicker((v) => !v)}
                className="w-full border rounded px-3 py-2 bg-white text-left flex items-center justify-between">
                <span
                  className={
                    publicationDate ? "text-gray-900" : "text-gray-400"
                  }>
                  {publicationDate
                    ? publicationDate.split("-").reverse().join("/")
                    : "Chọn ngày"}
                </span>
                <Calendar className="w-4 h-4 text-gray-400" />
              </button>
              {showPubDatePicker && (
                <div className="absolute z-50 left-0 top-full w-72">
                  <MiniCalendar
                    value={publicationDate}
                    onChange={(d) => setPublicationDate(d)}
                    onClose={() => setShowPubDatePicker(false)}
                  />
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Link công bố
            </label>
            <input
              type="url"
              value={publicationLink}
              onChange={(e) => setPublicationLink(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white"
              placeholder="https://..."
            />
          </div>
        </div>
      </FormSection>
    </>
  );
}
