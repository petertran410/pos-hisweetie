import { useQuery } from "@tanstack/react-query";

export interface NewProvince {
  code: string;
  name: string;
}
export interface NewCommune {
  code: string;
  name: string;
  provinceCode: string;
}

const load = async <T,>(url: string, key: string): Promise<T[]> => {
  const data = await (await fetch(url)).json();
  return Array.isArray(data) ? data : (data?.[key] ?? []);
};

/** Danh mục tỉnh/thành, phường/xã mới (34 tỉnh) — cùng file tĩnh form khách hàng đang dùng. */
export function useNewLocations() {
  const provinces = useQuery({
    queryKey: ["newProvinces"],
    queryFn: () => load<NewProvince>("/data/new-province-location.json", "provinces"),
    staleTime: Infinity,
  });
  const communes = useQuery({
    queryKey: ["newCommunes"],
    queryFn: () => load<NewCommune>("/data/new-commune-location.json", "communes"),
    staleTime: Infinity,
  });
  return { provinces: provinces.data ?? [], communes: communes.data ?? [] };
}
