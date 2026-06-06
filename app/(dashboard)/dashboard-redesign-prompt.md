# Open Design Brief — Redesign Trang chủ Dashboard POS Diệp Trà / HiSweetie

## 0. Yêu cầu thực thi cho Open Design
- Design system bắt buộc: **dieptra-design-systems** (cyan/turquoise `#00B7CC` + dark teal `#0D3B42`).
- Sản phẩm: phần mềm bán hàng / POS đa chi nhánh (web desktop-first, có responsive mobile).
- Việc cần làm: thiết kế lại **trang chủ (Tổng quan)** thành một dashboard điều hành, cải tiến từ bản hiện tại.
- Output mong muốn: 1 artifact trang chủ desktop (>=1440px) + 1 biến thể mobile, kèm các state: default, loading (skeleton), empty, no-permission.
- Ngôn ngữ giao diện: tiếng Việt. Tiền tệ VND, định dạng `1.242.842.490 ₫`, rút gọn `1,24 tỷ` / `513,8 tr` khi cần.

## 1. Bối cảnh nghiệp vụ (để hiểu dữ liệu, không hiển thị)
- Hệ thống tách 2 chứng từ: **Đơn đặt hàng** (khách đặt) và **Hóa đơn bán** (đã chốt bán — nơi ghi nhận doanh thu thật, giao hàng, COD).
- Doanh thu thật = từ Hóa đơn (không phải đơn đặt). Doanh thu thuần = Doanh thu − Trả hàng.
- Giao hàng có các trạng thái: Đang xử lý, Đóng hàng, Lấy hàng, Đang giao, Giao thành công, Không giao được, Trả hàng.
- COD: đơn thu hộ qua shipper (khác với công nợ khách nợ trực tiếp).
- Tồn kho và công nợ là **số dư hiện tại** (snapshot), KHÔNG đổi theo filter ngày.

## 2. Người dùng & ưu tiên
- Chủ DN / quản lý: doanh thu, công nợ, so sánh chi nhánh, cảnh báo.
- Quản lý bán hàng / NV bán: đơn cần xử lý, doanh số, khách.
- Kế toán / thu ngân: đã thu, công nợ, COD chờ đối soát.
- Điều phối giao hàng / kho: đơn cần giao, giao trễ, COD, hàng sắp hết.
- Dashboard phải cho phép bật/tắt khối theo vai trò (mô tả layout chung, lưu ý quyền).

## 3. Vấn đề của trang hiện tại cần khắc phục (tham chiếu screenshot)
1. **Thiếu bộ lọc thời gian** — chỉ có chọn chi nhánh ("Kho Hà Nội"). Cần thêm filter ngày/khoảng ngày + filter "Tất cả chi nhánh".
2. **Lỗi dữ liệu card "Đơn hàng tháng này"**: phụ đề "Tháng trước: 49.195.241.221,5" đang là số tiền, không phải số đơn → sửa thành so sánh số đơn vs số đơn.
3. **So sánh sai kỳ**: "-83,16% so với tháng trước" do so tháng 6 mới 5 ngày với cả tháng 5 → dùng so sánh **cùng kỳ MTD** (cùng số ngày đầu tháng) và ghi rõ nhãn.
4. **Phân cấp KPI rối**: cụm "Doanh thu / Hóa đơn / Trả hàng / Doanh thu thuần" để con số tiền và con số đếm lẫn lộn → tách rõ "giá trị tiền" và "số lượng (đơn/hóa đơn)".
5. **Trùng lặp Công nợ**: hiển thị 2 lần (card phải hàng 1 + card hàng 2) → gộp còn 1 khối công nợ.
6. **Thiếu hoàn toàn khối Giao hàng & COD** — đây là nghiệp vụ lõi → thêm KPI + bảng giao hàng cần xử lý.
7. **Thiếu khu Cảnh báo & Hành động nhanh** — "Cảnh báo tồn kho" mới chỉ là con số, chưa actionable.
8. **"615 hết hàng" quá lớn**: nghi do đếm cả SP ngừng bán → chỉ tính SP đang kinh doanh; tách rõ "sắp hết" vs "hết hàng".
9. **Tồn âm (-132, -72...)** trong bảng sắp hết hàng → cần style cảnh báo đỏ riêng cho tồn âm (bán âm kho).
10. Hầu hết KPI **thiếu xu hướng/so sánh và thiếu drill-down**.

## 4. Cấu trúc trang mới (desktop wireframe)

    ┌─────────────────────────────────────────────────────────────────────────┐
    │ Hisweetie  Tổng quan Hàng hóa Đơn hàng Khách hàng Sổ quỹ Báo cáo         │
    │                              [Chi nhánh ▾ Tất cả] [Khoảng ngày ▾ Hôm nay]│ ← header sticky
    ├─────────────────────────────────────────────────────────────────────────┤
    │ ⚡ [+ Tạo đơn] [+ Khách hàng] [Ghi nhận TT] [Tạo phiếu giao] [Nhập hàng] │ ← quick actions
    ├─────────────────────────────────────────────────────────────────────────┤
    │ KINH DOANH (theo ngày)            │ TIỀN & CÔNG NỢ                        │
    │ ┌Doanh thu┐┌Doanh thu thuần┐      │ ┌Đã thu┐┌Công nợ phải thu (snapshot)┐│
    │ │1,24 tỷ  ││1,16 tỷ        │      │ │      ││19,73 tỷ (Nợ NCC 463 tỷ)  ││
    │ │▲15% kỳ↩ ││▲...           │      │ └──────┘└───────────────────────────┘│
    │ └─────────┘└───────────────┘      │                                       │
    │ ┌Số hóa đơn┐┌Số đơn đặt┐┌Trả hàng┐│                                       │
    │ │142 ▲7%   ││140       ││7 phiếu │ │                                       │
    │ └──────────┘└──────────┘└────────┘│                                       │
    ├───────────────────────────────────┴───────────────────────────────────────┤
    │ GIAO HÀNG (mới) ┌Cần giao┐┌Đang giao┐┌Giao TC kỳ┐┌Giao trễ┐┌COD chờ thu/đối soát┐
    │                 │  12 ⚠ ││   7    ││   23    ││  4 ⚠  ││ 7,35 tr            │
    ├─────────────────────────────────────────────────────────────────────────┤
    │ TỒN KHO (snapshot) ┌Sắp hết┐┌Hết hàng┐┌Tồn âm/bán âm┐                      │
    │                    │  9 ⚠ ││  ...   ││  3 🔴       │  (chỉ SP đang KD)     │
    ├──────────────────────────────────────────────┬────────────────────────────┤
    │ BIỂU ĐỒ DOANH THU THEO THỜI GIAN (lớn)        │ Đơn theo trạng thái (donut)│
    │ (1 ngày→giờ, 7-30 ngày→ngày, nhiều tháng→tháng)│────────────────────────────│
    │                                                │ Giao hàng theo trạng thái  │
    │                                                │ (stacked bar)              │
    ├──────────────────────────────────┬─────────────┴────────────────────────────┤
    │ Top SP bán chạy (bar ngang)      │ ⚠ CẢNH BÁO & NHẮC VIỆC (list ưu tiên)     │
    │                                   │  • 12 đơn cần giao chờ >4h [Xử lý]        │
    │                                   │  • 9 SP dưới định mức [Nhập hàng]         │
    │                                   │  • Công nợ quá hạn ... [Xem]              │
    ├──────────────────────────────────┴────────────────────────────────────────┤
    │ TABS/CỘT: [Đơn cần xử lý] [Giao hàng cần xử lý] [SP sắp hết hàng]           │
    ├─────────────────────────────────────────────────────────────────────────┤
    │ Đơn hàng mới nhất (bảng)                                       [Xem tất cả]│
    └─────────────────────────────────────────────────────────────────────────┘

### 4.1 Header + 2 bộ lọc
- Bên phải header: **Filter chi nhánh** (mặc định "Tất cả chi nhánh"; cho chọn 1 hoặc nhiều) + **Filter ngày** (mặc định "Hôm nay"; preset: Hôm nay, Hôm qua, 7 ngày, 30 ngày, Tuần này, Tuần trước, Tháng này, Tháng trước, Quý này, Năm nay, Tùy chọn).
- Hiển thị chip tóm tắt filter đang áp dụng. Khi chọn ≥2 chi nhánh → mở khối "So sánh chi nhánh".

### 4.2 Hành động nhanh (mới)
- Thanh nút ngay dưới header: Tạo đơn, Thêm khách, Ghi nhận thanh toán, Tạo phiếu giao, Nhập hàng.
- Thao tác ngắn (thêm khách, ghi TT) mở modal; thao tác dài (tạo đơn, nhập hàng) chuyển màn. Prefill chi nhánh đang chọn.

### 4.3 KPI cards (gắn nhãn rõ loại dữ liệu)
- Nhóm Kinh doanh (theo ngày): Doanh thu, Doanh thu thuần, Số hóa đơn, Số đơn đặt, Trả hàng. Mỗi card có **so sánh kỳ trước** (mũi tên + %), màu xanh tăng tốt / đỏ giảm; riêng Trả hàng & các chỉ số xấu thì tăng = đỏ.
- Nhóm Tiền & Công nợ: Đã thu (theo ngày); Công nợ phải thu + Nợ NCC (snapshot, gắn nhãn "Tại thời điểm xem").
- Nhóm Giao hàng (mới): Cần giao, Đang giao, Giao thành công (kỳ), Giao trễ, COD chờ thu/đối soát. Cần giao & Giao trễ có badge cảnh báo.
- Nhóm Tồn kho (snapshot): Sắp hết, Hết hàng, Tồn âm. Ghi rõ "chỉ SP đang kinh doanh".
- Quy ước hiển thị nhãn nhỏ: card snapshot có chip "Tại thời điểm xem"; card theo ngày có dòng "vs kỳ trước".

### 4.4 Biểu đồ
- Doanh thu theo thời gian (line/area, là biểu đồ chính, chiếm lớn) — granularity tự đổi theo khoảng ngày; nhiều chi nhánh → nhiều đường.
- Đơn theo trạng thái (donut, có tổng ở giữa).
- Giao hàng theo trạng thái (stacked bar).
- Top SP bán chạy (bar ngang, top 5–10).
- (Khi ≥2 chi nhánh) So sánh chi nhánh (grouped bar): doanh thu, đơn, giao thành công, công nợ. Click cột → drill-down.

### 4.5 Khối cảnh báo (mới)
- Danh sách ưu tiên 3 mức màu: đỏ (cao), cam (TB), xám (thấp). Mỗi dòng là câu hành động có số liệu + nút điều hướng.
- Ví dụ nội dung: "12 đơn cần giao đã chờ >4 giờ", "9 SP dưới định mức tồn", "Công nợ quá hạn > 30 ngày", "COD đã giao chưa thu".

### 4.6 Bảng dữ liệu
- Đơn hàng mới nhất (theo ngày): Mã đơn, Khách, Chi nhánh, Tổng tiền, Trạng thái đơn, Trạng thái TT, Trạng thái giao, Thời gian tạo.
- Đơn cần xử lý (snapshot trạng thái — KHÔNG cắt theo ngày): + cột Hành động nhanh.
- Giao hàng cần xử lý (snapshot): Mã đơn/giao, Khách, Chi nhánh, ĐVVC/người giao, Trạng thái giao, COD, Dự kiến giao, Hành động.
- SP sắp hết hàng (snapshot): Mã SP, Tên, Chi nhánh, Tồn hiện tại, Tối thiểu, Đang đặt nhập, Cảnh báo. **Tồn âm tô đỏ đậm**.
- Mỗi bảng giới hạn 5–10 dòng + link "Xem tất cả". Bảng "việc cần làm" không bị filter ngày làm mất dữ liệu tồn đọng.

## 5. State & chi tiết tương tác
- Loading: skeleton cho KPI/chart/bảng.
- Empty: thông điệp + CTA (vd "Chưa có đơn nào trong kỳ" + nút Tạo đơn).
- No-permission: ẩn khối nhạy cảm (doanh thu/công nợ) với vai trò không có quyền, thay bằng placeholder "Bạn không có quyền xem".
- Tất cả KPI/biểu đồ click được → drill-down sang báo cáo chi tiết (giữ filter hiện tại).

## 6. Responsive mobile
- Filter gom vào nút "Bộ lọc" mở bottom-sheet; chip hiển thị lựa chọn.
- Thứ tự ưu tiên trên mobile: Cảnh báo + KPI Giao hàng/COD/Tồn lên đầu, rồi KPI kinh doanh, rồi 1 biểu đồ doanh thu (full-width), rồi bảng rút gọn 2–3 cột.
- KPI 2 cột. Hành động nhanh dạng FAB.

## 7. Phong cách thị giác
- Theo dieptra-design-systems: nền sáng, card bo góc mềm, viền/nhấn cyan `#00B7CC`, tiêu đề/nhấn đậm dark teal `#0D3B42`.
- Màu trạng thái: xanh (tốt/hoàn thành), cam (chờ/cảnh báo TB), đỏ (nguy hiểm/âm/quá hạn), xám (trung tính).
- Icon nhỏ đầu mỗi card/section. Mật độ thông tin vừa phải, ưu tiên khoảng trắng; tránh nhồi như bản hiện tại.
- Số liệu lớn dễ đọc, có đơn vị; phụ đề so sánh nhỏ bên dưới.

## 8. Tiêu chí nghiệm thu
- Trả lời nhanh: hôm nay bán bao nhiêu, tiền về chưa, hàng đi tới đâu, gì sắp hết, việc gì làm ngay.
- Có filter chi nhánh (gồm Tất cả) + filter ngày hoạt động trên toàn trang.
- Phân biệt rõ dữ liệu theo ngày vs snapshot.
- Có khối Giao hàng/COD và khối Cảnh báo + Hành động nhanh.
- Đã sửa các lỗi nêu ở mục 3.
