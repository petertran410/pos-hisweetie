import type { Metadata } from "next";
import { getPublicPriceData } from "@/lib/public-price/fetcher";
import { REGION_PARAM, type PriceRegionKey } from "@/lib/public-price/types";
import { PriceListView } from "@/components/public-price/PriceListView";
import "@/components/public-price/price-list.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Bảng giá nguyên liệu pha chế | LerMao" },
  description: "Bảng giá sỉ nguyên liệu pha chế LerMao, Trà Phượng Hoàng, Amo Pastel, Natufruite theo khu vực Miền Bắc và Miền Nam.",
};

/** Trang public price.hisweetievietnam.com (middleware chuyển host price.* về đây). ?region=bac | nam */
export default async function PriceListPage({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
  const [{ region }, data] = await Promise.all([searchParams, getPublicPriceData()]);
  const initialRegion = (Object.keys(REGION_PARAM) as PriceRegionKey[]).find((k) => REGION_PARAM[k] === region);
  if (!data) {
    return (
      <div className="pp pp-page pp-empty-page">
        <div className="pp-es">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brands/price/lermao-mascot.png" alt="" />
          <h1 className="pp-t1">Bảng giá đang được cập nhật</h1>
          <p>Bạn quay lại sau ít phút nhé, hoặc gọi hotline 0973 123 230 để được báo giá.</p>
        </div>
      </div>
    );
  }
  return <PriceListView data={data} initialRegion={initialRegion} syncUrl />;
}
