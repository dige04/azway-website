// Images uploaded by the seed, read from SEED_ASSETS_DIR (files stay outside
// the repo). `verified: false` = rights not confirmed by AZway; skipped when
// SEED_SKIP_UNVERIFIED_MEDIA=1.

const wikimedia = (file, alt, author, license, page) => ({
  file: `china-gallery/${file}`,
  alt,
  caption: `Ảnh: ${author} · ${license} · Wikimedia Commons · ${page}`,
  verified: true,
});

// Source: AZway_Teambuilding.html credits these to Viettour3mien.
const reference = (file, alt) => ({
  file: `teambuilding/${file}`,
  alt,
  caption: 'Ảnh tham khảo: Viettour3mien (chưa xác nhận quyền sử dụng)',
  verified: false,
});

// Authors and licenses from assets/site-update-config.js (chinaExtraPhotos).
export const media = {
  logo: { file: 'logo-azway.png', alt: 'Logo AZway', caption: 'Logo AZway (tài sản của AZway)', verified: true },

  jianshui: wikimedia('jianshui.jpg', 'Lầu Triều Dương ở Kiến Thủy, Vân Nam', 'Vmenkov', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Jianshui_-_Chaoyang_Gate_-_P1370120.JPG'),
  shilin: wikimedia('shilin.jpg', 'Rừng đá Thạch Lâm, Vân Nam', 'Pieter Schepens', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Shilin_stone_forest.jpg'),
  dali: wikimedia('dali.jpg', 'Cổng Nam thành cổ Đại Lý, Vân Nam', 'Ngguls', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:20260223_Dali_Old_Town_11.jpg'),
  dongxing: wikimedia('dongxing.jpg', 'Sông Bắc Luân với Đông Hưng ở bờ phải và Móng Cái ở bờ trái', 'Yp8080123', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:BeiLun_River.jpg'),
  beihai: wikimedia('beihai.jpg', 'Bãi biển Ngân Than ở Bắc Hải, Quảng Tây', 'PQ77wd', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Mid-Area_for_Beihai_Silver_Beach.jpg'),
  liuzhou: wikimedia('liuzhou.jpg', 'Cảnh Liễu Châu về đêm, Quảng Tây', 'Aeplyh', 'CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:%E6%9F%B3%E5%B7%9E%E5%A4%9C%E6%99%AF.jpg'),
  chongqing: wikimedia('chongqing.jpg', 'Toàn cảnh Trùng Khánh bên sông', 'A Chinese user', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Skyline_of_Chongqing%2C_Aug_2016.jpg'),
  jiuzhaigou: wikimedia('jiuzhaigou.jpg', 'Hồ Ngũ Hoa ở Cửu Trại Câu, Tứ Xuyên', 'Chensiyuan', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:1_jiuzhaigou_valley_wu_hua_hai_2011b.jpg'),

  'tb-hero': reference('hero-section-teambuilding-scaled.jpg', 'Đoàn tham gia hoạt động teambuilding ngoài trời'),
  'tb-1': reference('hoat-dong-thuc-te-1-scaled.jpg', 'Cùng nhau vượt thử thách'),
  'tb-2': reference('hoat-dong-thuc-te-2-scaled.jpg', 'Năng lượng của cả đội'),
  'tb-3': reference('hoat-dong-thuc-te-3-scaled.jpg', 'Sức mạnh tập thể'),
  'tb-4': reference('hoat-dong-thuc-te-4-scaled.jpg', 'Phối hợp để về đích'),
  'tb-5': reference('hoat-dong-thuc-te-5-scaled.png', 'Chung một niềm vui'),
  'game-1.1': reference('cate-1.1-scaled.jpg', 'Trò chơi Mò cua bắt ốc'),
  'game-1.2': reference('cate-1.2-scaled.png', 'Trò chơi Bịt mắt đá bóng'),
  'game-1.3': reference('cate-1.3-scaled.jpg', 'Trò chơi Cuộc đua kỳ thú'),
  'game-1.4': reference('cate-1.4-scaled.png', 'Trò chơi Ô cửa may mắn'),
  'game-2.1': reference('cate-2.1-scaled.jpg', 'Trò chơi Đua thuyền trên cát'),
  'game-2.2': reference('cate-2.2-scaled.jpg', 'Trò chơi Kéo co truyền thống'),
  'game-2.3': reference('cate-2.3-scaled.png', 'Trò chơi Giải cứu công chúa'),
  'game-2.4': reference('cate-2.4-scaled.jpg', 'Trò chơi Gậy hơi đồng đội'),
  'game-3.1': reference('cate-3.1-scaled.png', 'Trò chơi Gà đẻ trứng vàng'),
  'game-3.2': reference('cate-3.2-scaled.jpg', 'Trò chơi Dây chuyền sản xuất nước'),
  'game-3.3': reference('cate-3.3-scaled.jpg', 'Trò chơi Đồng tâm về đích'),
  'game-3.4': reference('cate-3.4-scaled.png', 'Trò chơi Xếp tháp niềm tin'),
};
