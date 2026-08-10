import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-shell">
      <div className="public-topline"><div className="public-wrap"><span>Hi Sweetie Việt Nam · Từ năm 2018</span><span>Catalogue dành cho đối tác F&amp;B</span></div></div>
      <header className="public-header"><div className="public-wrap public-nav">
        <Link href="/cong-thuc" className="public-wordmark" aria-label="Diệp Trà, catalogue công thức">DIỆP TRÀ</Link>
        <nav aria-label="Điều hướng public"><form action="/cong-thuc" role="search"><label className="sr-only" htmlFor="header-recipe-search">Tìm công thức</label><input id="header-recipe-search" name="search" type="search" placeholder="Tìm công thức…" /></form><Link href="/cong-thuc">Công thức</Link><a href="mailto:sales@hisweetievietnam.com.vn">Liên hệ</a></nav>
      </div></header>
      {children}
      <footer className="public-footer"><div className="public-wrap public-footer-grid"><div><div className="public-wordmark public-wordmark-light">DIỆP TRÀ</div><p>Giải pháp pha chế toàn diện từ nhà nhập khẩu hàng đầu Việt Nam.</p></div><div><strong>Catalogue công thức</strong><p><a href="mailto:sales@hisweetievietnam.com.vn">sales@hisweetievietnam.com.vn</a><br />+84 973 123 230</p></div></div></footer>
    </div>
  );
}
