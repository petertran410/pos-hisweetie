import Image from "next/image";
import Link from "next/link";

function BrandLogos({ light = false }: { light?: boolean }) {
  return <div className={`public-brand-logos${light ? " public-brand-logos-light" : ""}`}>
    <Image className="public-brand-logo public-brand-logo-lermao" src="/brands/lermao.webp" alt="LerMao" width={72} height={72} priority />
    <Image className="public-brand-logo public-brand-logo-tra-phuong-hoang" src="/brands/tra-phuong-hoang.webp" alt="Trà Phượng Hoàng" width={172} height={72} priority />
  </div>;
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-shell">
      <div className="public-topline"><div className="public-wrap"><span>Hi Sweetie Việt Nam · Từ năm 2018</span><span>Catalogue dành cho đối tác F&amp;B</span></div></div>
      <header className="public-header"><div className="public-wrap public-nav">
        <Link href="/cong-thuc" className="public-brand-link" aria-label="LerMao và Trà Phượng Hoàng, catalogue công thức"><BrandLogos /></Link>
        <nav aria-label="Điều hướng public"><form action="/cong-thuc" role="search"><label className="sr-only" htmlFor="header-recipe-search">Tìm công thức</label><input id="header-recipe-search" name="search" type="search" placeholder="Tìm công thức…" /></form><Link href="/cong-thuc">Công thức</Link><a href="mailto:sales@hisweetievietnam.com.vn">Liên hệ</a></nav>
      </div></header>
      {children}
      <footer className="public-footer"><div className="public-wrap public-footer-grid"><div><Link href="/cong-thuc" className="public-brand-link" aria-label="CÔNG TY TNHH XNK HI SWEETIE VIỆT NAM, catalogue công thức">CÔNG TY TNHH XNK HI SWEETIE VIỆT NAM</Link><p>Giải pháp pha chế toàn diện từ nhà nhập khẩu hàng đầu Việt Nam.</p></div><div><strong>Catalogue công thức</strong><p><a href="mailto:cskh@hisweetievietnam.com.vn">cskh@hisweetievietnam.com.vn</a><br />+84 973 123 230</p></div></div></footer>
    </div>
  );
}
