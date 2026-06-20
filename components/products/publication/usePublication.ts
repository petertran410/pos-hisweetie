"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { API_URL } from "@/lib/config/api";
import { toast } from "sonner";
import {
  extractAddressParts,
  TrackAsiaPrediction,
} from "@/lib/api/trackasia";
import type { Product } from "@/lib/api/products";

/**
 * Chuẩn hóa tên địa giới để so khớp: hạ chữ thường, lược tiền tố hành chính.
 */
export function normalizeAdminName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(
      /^(tỉnh|thành phố|tp\.?|phường|xã|thị trấn|quận|huyện|thị xã)\s+/,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

export interface City {
  name: string;
  code: number;
  districts: Array<{
    name: string;
    code: number;
    wards: Array<{ name: string; code: number }>;
  }>;
}
export interface Province {
  code: string;
  name: string;
}
export interface Commune {
  code: string;
  name: string;
  provinceCode: string;
}

export interface DocItem {
  url?: string;
  file?: File;
  name: string;
  size?: number;
  mimetype?: string;
}

const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

const emptyLocation = () => ({
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
  publisher: undefined,
});

/**
 * Hook gom toàn bộ state + logic phần "Công bố" để dùng chung cho
 * ProductForm / ComboProductForm / ManufacturingProductForm.
 */
export function usePublication(product?: Product) {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [pubProvinces, setPubProvinces] = useState<Province[]>([]);
  const [pubCommunes, setPubCommunes] = useState<Commune[]>([]);
  const [showOldPubAddress, setShowOldPubAddress] = useState(false);
  const [pubLocation, setPubLocation] = useState<any>(emptyLocation());
  const [publicationDate, setPublicationDate] = useState<string>(
    product?.publicationDate ? product.publicationDate.slice(0, 10) : ""
  );
  const [showPubDatePicker, setShowPubDatePicker] = useState(false);
  const pubDatePickerRef = useRef<HTMLDivElement>(null);
  const [publicationLink, setPublicationLink] = useState<string>(
    product?.publicationLink || ""
  );

  // Nạp lại dữ liệu công bố khi đổi sản phẩm (edit).
  useEffect(() => {
    if (product?.documents) {
      setDocuments(
        product.documents.map((doc) => ({
          url: doc.url,
          name: doc.originalName || doc.url.split("/").pop() || "Tài liệu",
          size: doc.size,
          mimetype: doc.mimetype,
        }))
      );
    } else {
      setDocuments([]);
    }

    if (product?.publicationLocation) {
      setPubLocation({
        ...emptyLocation(),
        ...product.publicationLocation,
      });
      setShowOldPubAddress(
        !!(
          product.publicationLocation.cityCode ||
          product.publicationLocation.districtCode ||
          product.publicationLocation.wardCode
        )
      );
    } else {
      setPubLocation(emptyLocation());
      setShowOldPubAddress(false);
    }
    setPublicationDate(
      product?.publicationDate ? product.publicationDate.slice(0, 10) : ""
    );
    setPublicationLink(product?.publicationLink || "");
  }, [product?.id]);

  // Load dữ liệu địa giới (giống form khách hàng)
  useEffect(() => {
    fetch("/data/old-location.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCities(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/data/new-province-location.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPubProvinces(data);
        else if (data?.provinces) setPubProvinces(data.provinces);
      })
      .catch(() => setPubProvinces([]));
  }, []);

  useEffect(() => {
    fetch("/data/new-commune-location.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPubCommunes(data);
        else if (data?.communes) setPubCommunes(data.communes);
      })
      .catch(() => setPubCommunes([]));
  }, []);

  // Đóng popover ngày công bố khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pubDatePickerRef.current &&
        !pubDatePickerRef.current.contains(event.target as Node)
      ) {
        setShowPubDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Derive cho picker vị trí công bố ──
  const pubDistricts = useMemo(() => {
    if (!pubLocation.cityCode) return [];
    const c = cities.find(
      (x) => String(x.code) === String(pubLocation.cityCode)
    );
    return c?.districts || [];
  }, [pubLocation.cityCode, cities]);

  const pubWards = useMemo(() => {
    if (!pubLocation.districtCode) return [];
    const d = pubDistricts.find(
      (x) => String(x.code) === String(pubLocation.districtCode)
    );
    return d?.wards || [];
  }, [pubLocation.districtCode, pubDistricts]);

  const pubFilteredCommunes = useMemo(() => {
    if (!pubLocation.newCityCode) return [];
    return pubCommunes.filter(
      (x) => String(x.provinceCode) === String(pubLocation.newCityCode)
    );
  }, [pubLocation.newCityCode, pubCommunes]);

  const setPub = (field: string, value: any) =>
    setPubLocation((p: any) => ({ ...p, [field]: value }));

  const handlePubCityChange = (v: string) => {
    const c = cities.find((x) => String(x.code) === String(v));
    setPubLocation((p: any) => ({
      ...p,
      cityCode: v || undefined,
      cityName: c?.name,
      districtCode: undefined,
      districtName: undefined,
      wardCode: undefined,
      wardName: undefined,
    }));
  };

  const handlePubDistrictChange = (v: string) => {
    const d = pubDistricts.find((x) => String(x.code) === String(v));
    setPubLocation((p: any) => ({
      ...p,
      districtCode: v || undefined,
      districtName: d?.name,
      wardCode: undefined,
      wardName: undefined,
    }));
  };

  const handlePubWardChange = (v: string) => {
    const w = pubWards.find((x) => String(x.code) === String(v));
    setPubLocation((p: any) => ({
      ...p,
      wardCode: v || undefined,
      wardName: w?.name,
    }));
  };

  const handlePubNewCityChange = (v: string) => {
    const p = pubProvinces.find((x) => x.code === v);
    setPubLocation((prev: any) => ({
      ...prev,
      newCityCode: v || undefined,
      newCityName: p?.name,
      newWardCode: undefined,
      newWardName: undefined,
    }));
  };

  const handlePubNewWardChange = (v: string) => {
    const c = pubFilteredCommunes.find((x) => x.code === v);
    setPubLocation((p: any) => ({
      ...p,
      newWardCode: v || undefined,
      newWardName: c?.name,
    }));
  };

  const handlePubSelectSuggestion = (prediction: TrackAsiaPrediction) => {
    const { streetAddress, provinceName, wardName } =
      extractAddressParts(prediction);

    const province = provinceName
      ? pubProvinces.find(
          (p) => normalizeAdminName(p.name) === normalizeAdminName(provinceName)
        )
      : undefined;

    const ward =
      province && wardName
        ? pubCommunes.find(
            (c) =>
              String(c.provinceCode) === String(province.code) &&
              normalizeAdminName(c.name) === normalizeAdminName(wardName)
          )
        : undefined;

    setPubLocation((p: any) => ({
      ...p,
      address: streetAddress || p.address,
      ...(province
        ? {
            newCityCode: province.code,
            newCityName: province.name,
            newWardCode: ward?.code,
            newWardName: ward?.name,
          }
        : {}),
    }));
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const accepted: DocItem[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > MAX_DOC_SIZE) {
        toast.error(`"${file.name}" vượt quá 10MB`);
        return;
      }
      accepted.push({
        file,
        name: file.name,
        size: file.size,
        mimetype: file.type,
      });
    });

    if (accepted.length > 0) {
      setDocuments((prev) => [...prev, ...accepted]);
    }
    e.target.value = "";
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadDocuments = async (
    files: File[]
  ): Promise<
    { url: string; originalName: string; mimetype: string; size: number }[]
  > => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const token = useAuthStore.getState().token;
    const res = await fetch(
      `${API_URL}/upload/files?subfolder=products/cong-bo`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!res.ok) {
      throw new Error("Upload tài liệu thất bại");
    }

    const result = await res.json();
    if (result.errors && result.errors.length > 0) {
      toast.error(
        `Một số tệp không upload được: ${result.errors
          .map((e: any) => e.originalname)
          .join(", ")}`
      );
    }
    return (result.items || []).map((it: any) => ({
      url: it.url,
      originalName: it.originalname,
      mimetype: it.mimetype,
      size: it.size,
    }));
  };

  /**
   * Upload các file mới + gói payload công bố để merge vào formData khi submit.
   * Chỉ trả dữ liệu khi `canViewPublication` = true (tránh ghi đè/xóa trắng
   * khi backend đã strip phần công bố vì thiếu quyền).
   */
  const getPayload = async (
    canViewPublication: boolean
  ): Promise<{
    documents?: any[];
    publicationLocation?: any;
    publicationDate?: string;
    publicationLink?: string;
  }> => {
    if (!canViewPublication) return {};

    const documentsPayload: {
      url: string;
      originalName?: string;
      mimetype?: string;
      size?: number;
    }[] = [];

    const newDocFiles = documents
      .filter((d) => d.file)
      .map((d) => d.file as File);
    const uploadedDocs =
      newDocFiles.length > 0 ? await uploadDocuments(newDocFiles) : [];
    let uploadedDocIndex = 0;
    for (const doc of documents) {
      if (doc.file) {
        const uploaded = uploadedDocs[uploadedDocIndex++];
        if (uploaded) documentsPayload.push(uploaded);
      } else if (doc.url) {
        documentsPayload.push({
          url: doc.url,
          originalName: doc.name,
          mimetype: doc.mimetype,
          size: doc.size,
        });
      }
    }

    const hasLocation = Object.entries(pubLocation).some(
      ([, v]) => v !== undefined && v !== null && v !== ""
    );

    return {
      documents: documentsPayload,
      publicationLocation: hasLocation ? pubLocation : undefined,
      publicationDate: publicationDate
        ? new Date(publicationDate).toISOString()
        : undefined,
      publicationLink: publicationLink || undefined,
    };
  };

  return {
    // state
    documents,
    cities,
    pubProvinces,
    pubCommunes,
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
    // derived
    pubDistricts,
    pubWards,
    pubFilteredCommunes,
    // handlers
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
    // submit helper
    getPayload,
  };
}

export type UsePublicationReturn = ReturnType<typeof usePublication>;
