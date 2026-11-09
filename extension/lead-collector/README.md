# Hisweetie – Tạo lead nhanh (Chrome extension)

Sidebar bên phải Chrome: thu thập tên khách, SĐT, nhu cầu, đơn hàng gần nhất từ **hội thoại webchat Shopee đang mở**
(`https://banhang.shopee.vn/new-webchat/conversations`) rồi bấm **Tạo Lead** để lưu thẳng vào POS (`/khach-hang/lead`).

## Cài đặt
1. Mở `chrome://extensions`, bật **Developer mode**.
2. **Load unpacked** → chọn thư mục `pos-hisweetie/extension/lead-collector`.
3. Ghim icon extension lên thanh công cụ.
4. Mở POS ở 1 tab, đăng nhập và giữ tab đó mở (extension dùng phiên đăng nhập này; không cần nhập mật khẩu vào extension).

## Dùng
1. Mở webchat Shopee, chọn hội thoại.
2. Bấm icon extension (hoặc **Alt+Shift+L**) → sidebar mở bên phải và tự thu thập hội thoại đang mở.
   Sidebar giữ nguyên khi chuyển tab; bấm **Thu thập thông tin lead** để đọc lại hội thoại hiện tại.
3. Kiểm tra / sửa: Tên, SĐT (nhiều SĐT → bấm chọn nhanh; cảnh báo nếu SĐT đã có khách/lead), Nguồn, Kênh, Phân loại,
   Nhu cầu (sản phẩm khách đang hỏi), Ghi chú CSKH (đơn hàng gần nhất + link hội thoại).
4. Bấm **Tạo Lead** → hiện mã `LEAD…` (bấm để mở trong POS).

Trang khác (Facebook, TikTok, Zalo…): bôi đen tên/SĐT → chuột phải **Tạo lead từ "…"** hoặc bấm **Thu thập thông tin lead**.

## Cách đọc hội thoại
- Không phụ thuộc class của Shopee: tìm ô nhập tin nhắn, lấy cột hội thoại chứa ô đó.
- Tên = tài khoản khách trên thanh tiêu đề hội thoại (vd `hieuminh2601`).
- Nhu cầu = các thẻ **Sản phẩm** trong hội thoại (tên SP + giá), mới nhất trước.
- Tỉnh/Thành = địa chỉ khách trên thanh tiêu đề hội thoại (vd "Thành phố Ho Chi Minh"); Phường/Xã chọn tay.
  Danh mục 34 tỉnh mới lấy từ POS (`/data/new-province-location.json`, `/data/new-commune-location.json`).
- Kênh (nguồn Shopee) theo kênh Smax: "Diệp Trà Chi Nhánh Miền Nam" (shop `dieptra.tphcm`), "DIỆP TRÀ - ROYALTEA" (shop `nguyenlieu.royaltea`).
  Tự chọn nếu thấy tên tài khoản / mã shop trên trang, không thì dùng kênh đã chọn lần trước.
- SĐT viết số (`0901 234 567`, `+84…`, gửi tách nhiều tin `0976` · `259` · `769`) hoặc bằng chữ (`không ba năm chín…`, gõ không dấu/sai chính tả vẫn nhận).
  Ưu tiên đoạn đang bôi đen, sau đó SĐT mới nhất trong hội thoại.
- Đơn hàng gần nhất: khối quanh mã đơn Shopee (vd `241103ABCD1234`) trong hội thoại, không có thì ở khung thông tin bên phải.
- Shopee đổi giao diện có thể làm đọc sai → luôn kiểm tra lại trước khi bấm Tạo Lead.

## Phiên POS
- Extension **không đọc token**: POS chỉ giữ access token trong bộ nhớ tab (refresh token là cookie HttpOnly).
  Sidebar nhờ tab POS đang đăng nhập gọi API qua cầu nối `components/leads/LeadExtensionBridge.tsx`
  (chỉ cho phép: phiên, danh sách kênh, kiểm tra trùng SĐT, tạo lead). Token tự làm mới như khi dùng POS bình thường.
- Cần **giữ 1 tab POS đã đăng nhập** (trang nào cũng được). Báo "Tab POS chưa sẵn sàng" → tải lại tab POS.
- Quyền vẫn theo tài khoản POS: cần `leads:update` để tạo lead.
- Đổi POS chính thức / localhost ở ô chọn góc trên sidebar (POS chính thức cần deploy bản có cầu nối).
