import "@/components/public-price/price-list.css";

/** Khung chờ khi đang tải bảng giá (skeleton theo bố cục thẻ). */
export default function Loading() {
  return (
    <div className="pp pp-page" aria-busy="true" aria-label="Đang tải bảng giá">
      <header className="pp-hdr">
        <div className="pp-wrap pp-hdr-in">
          <div className="pp-brandrow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pp-logo" src="/brands/price/lermao-mascot.png" alt="" width={220} height={210} />
            <div>
              <div className="pp-t1">Bảng giá nguyên liệu</div>
              <span className="pp-t2">Đang lục kho tìm giá…</span>
            </div>
          </div>
        </div>
      </header>
      <div className="pp-wrap pp-body">
        <main className="pp-main">
          <div className="pp-chips">
            {[84, 96, 150, 112, 116].map((w) => (
              <div key={w} className="pp-sk" style={{ flex: "none", width: w, height: 44, borderRadius: 100 }} />
            ))}
          </div>
          <div className="pp-grid" style={{ paddingTop: 16 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="pp-card">
                <div className="pp-ph pp-sk" style={{ borderRadius: 0 }} />
                <div className="pp-cb">
                  <div className="pp-sk pp-skl" style={{ width: "50%" }} />
                  <div className="pp-sk pp-skl" style={{ width: "90%" }} />
                  <div className="pp-sk pp-skl" style={{ width: "70%" }} />
                  <div className="pp-sk pp-skl" style={{ width: "55%", height: 22, marginTop: 12 }} />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
