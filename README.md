# FMCG Insights Hub

Tạo ứng dụng Web Executive FMCG Analytics Platform tích hợp với Supabase project vừa kết nối:

1. Layout & Sidebar Navigation:

   - Sidebar gồm 4 trang: 

     + Tổng quan (/dashboard)

     + Nạp dữ liệu (/data-import)

     + Cấu trúc tổ chức (/organization)

     + Chẩn đoán nguyên nhân (/root-cause)

2. Trang Chẩn đoán Nguyên nhân (/root-cause):

   - Phía trên: Thẻ 'AI Executive Summary' (khung bo tròn màu xanh tối) để hiển thị tóm tắt nhận xét nguyên nhân biến động.

   - Bên dưới: Bộ chọn 2 tháng (Tháng hiện tại vs Tháng so sánh, mặc định 2026-07 vs 2026-06).

   - Bảng dữ liệu (Table): Gọi hàm Supabase RPC 'olap.fn_root_cause_explorer' để hiển thị danh sách NPP, Thương hiệu, Doanh số kỳ trước, Doanh số kỳ này, % Tăng trưởng và Cột 'Chẩn đoán nguyên nhân' có badge màu tương ứng.

3. Trang Nạp dữ liệu (/data-import):

   - Thiết kế khu vực Drag & Drop để kéo thả file Excel/CSV.

   - Tải file lên Supabase Storage bucket 'sales_imports'.

4. Phong cách Giao diện:

   - Modern Executive Dashboard, tông màu tối lam (Dark mode) sang trọng, font chữ sắc nét.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fmcg-ai-navigator.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a0130422-0b10-40e3-a176-b7e44e30d23f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
