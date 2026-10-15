# SK Ambient Light Luxury

## Phạm vi
- Chỉ nâng cấp trang chủ, hãng xe, đời xe và các danh sách sản phẩm/ảnh phóng to hiện có. Không tạo trang chi tiết mới hay thay đổi quản trị.
- Giữ nguyên dữ liệu, đăng nhập, quyền xem giá, cách tính giá, khóa `autodeco.*` và cấu trúc cơ sở dữ liệu.

## Giao diện
- Nền tối với ánh sáng ambient trôi nhẹ; chữ SK và tiêu đề gradient hồng–tím–xanh–cam.
- Viền gradient chuyển động, glow khi chạm, shimmer và hiệu ứng xuất hiện khi cuộn; tự tắt chuyển động khi người dùng chọn giảm chuyển động.
- Lưới hãng đều: 2 cột điện thoại, 3–4 cột màn lớn; ưu tiên logo đã lưu, biểu tượng xe khi thiếu hoặc lỗi logo.
- Thẻ sản phẩm: ảnh 4:3 lớn, zoom nhẹ, nhãn giảm giá lấy từ giá hiện có, giá bán nổi bật; giữ chức năng phóng to xem ảnh đầy đủ không cắt.
- Placeholder neon dùng chung cho ảnh sản phẩm trống hoặc lỗi tải.
- Thanh tìm kiếm/tiêu đề kính mờ dính trên; thanh tư vấn cố định dưới không che nội dung hay nút quản trị tại chỗ.

## Giả định
- Thanh tư vấn lấy điện thoại/Zalo từ cấu hình cửa hàng `CONTACT` hiện có, không tự thay đổi số liên hệ.
- Không có trang chi tiết sản phẩm riêng: nâng cấp thẻ hiện có và cửa sổ phóng to ảnh.

## Kỹ thuật và kiểm tra
- CSS keyframes, một observer dùng chung cho hiệu ứng khi cuộn; không thêm thư viện nặng.
- Hiệu ứng giới hạn trong vùng giao diện công khai, không áp vào hộp thoại quản trị.
- Giữ lazy loading, ảnh chất lượng cao và pipeline nguồn ảnh hiện tại.
- Kiểm tra lỗi TypeScript qua kiểm tra tự động và thử trên điện thoại/máy tính: điều hướng, tìm kiếm, ảnh/fallback, thanh tư vấn, giảm chuyển động và lỗi runtime.