// Destinations, cruises, teambuilding, feedback, single types and redirects.
// Source: AZway_Web_Chinh.html (DATA, CRUISE_PRODUCTS, contact block) and
// AZway_Teambuilding.html, unless marked as a sample.

export const destinations = [
  { slug: 'ha-long', name: 'Hạ Long', region: 'mien_bac', about: 'Vịnh di sản và du thuyền.' },
  { slug: 'sapa', name: 'Sa Pa', region: 'mien_bac', about: 'Fansipan và bản làng vùng cao.' },
  { slug: 'da-nang', name: 'Đà Nẵng', region: 'mien_trung', about: 'Biển, Bà Nà và bán đảo Sơn Trà.' },
  { slug: 'phu-quoc', name: 'Phú Quốc', region: 'mien_nam', about: 'Biển xanh và nghỉ dưỡng.' },
  { slug: 'dong-hung', name: 'Đông Hưng', region: 'trung_quoc', image: 'dongxing', about: 'Thành phố cửa khẩu đối diện Móng Cái.' },
  { slug: 'kien-thuy', name: 'Kiến Thủy', region: 'trung_quoc', image: 'jianshui', about: 'Phố cổ Lâm An ở Vân Nam.' },
  { slug: 'dai-ly', name: 'Đại Lý', region: 'trung_quoc', image: 'dali', about: 'Thành cổ và hồ Nhĩ Hải.' },
  { slug: 'bac-hai', name: 'Bắc Hải', region: 'trung_quoc', image: 'beihai', about: 'Biển Ngân Than, Quảng Tây.' },
  { slug: 'trung-khanh', name: 'Trùng Khánh', region: 'trung_quoc', image: 'chongqing', about: 'Thành phố núi bên sông Trường Giang.' },
  { slug: 'bangkok', name: 'Bangkok', region: 'quoc_te', about: 'Thủ đô Thái Lan, kết hợp Pattaya.' },
];

// Ha Long cruises: the design's 16 cards (2026-09-09 update), options merged
// per ship. Prices are AZway's listed rates from the design, kept as is; a
// range keeps its lower bound as `price` and the range in the description.
// `price` is per guest, so charter (per-trip) rates live in the description only.
const OPTION_NAME = { ve_du_ngoan: 'Vé du ngoạn trong ngày', thue_nguyen_tau: 'Thuê nguyên tàu', an_toi: 'Du thuyền ăn tối' };
const PRIVATE = 'Thuê nguyên tàu cho đoàn. Giá theo chuyến, phụ thuộc tuyến, thời gian thuê và dịch vụ bổ sung.';
const DINNER = 'Du thuyền ăn tối kết hợp chương trình giải trí. Xác nhận giờ khởi hành và thực đơn cho ngày sử dụng.';
const UNPRICED = 'Có trong danh mục đặt tàu của AZway. Liên hệ để xác nhận lịch trình và báo giá.';

const option = (type, price, description, range) => ({
  type,
  name: OPTION_NAME[type],
  price,
  description: range ? `${description} Giá tham khảo ${range}.` : description,
});
const day = (price, description, range) => option('ve_du_ngoan', price, description, range);
const charter = (range) => option('thue_nguyen_tau', null, PRIVATE, range);
const dinner = (price) => option('an_toi', price, DINNER);

const cruise = (slug, name, capacity, about, options) => ({ slug, name, capacity, about, options });

export const cruises = [
  cruise('ambassador', 'Ambassador', 500, 'Buffet trưa và chương trình âm nhạc; khởi hành từ cảng Sunworld.', [
    day(1390000, 'Buffet trưa và chương trình âm nhạc; khởi hành từ cảng Sunworld.'),
    charter('310.000.000đ/chuyến'),
    dinner(980000),
  ]),
  cruise('luna', 'Luna', 550, 'Bể bơi ngoài trời, bữa sáng nhẹ và bữa trưa theo chương trình.', [
    day(1300000, 'Bể bơi ngoài trời, bữa sáng nhẹ và bữa trưa theo chương trình.'),
    dinner(980000),
  ]),
  cruise('sea-octopus', 'Sea Octopus', 300, 'Buffet trưa, trà chiều tại Echo Bar; khởi hành từ cảng Sunworld.', [
    day(1190000, 'Buffet trưa, trà chiều tại Echo Bar; khởi hành từ cảng Sunworld.', '1.190.000–1.350.000đ/khách'),
    charter('279.000.000đ/chuyến'),
    dinner(980000),
  ]),
  cruise('saquila', 'Saquila', 150, 'Du ngoạn thành phố, bữa trưa và trải nghiệm The Bay Harmony.', [
    day(900000, 'Du ngoạn thành phố, bữa trưa và trải nghiệm The Bay Harmony.'),
    charter('110.000.000đ/chuyến'),
    dinner(null),
  ]),
  cruise('phoenix', 'Phoenix', 99, 'Lựa chọn tuyến 1 hoặc tuyến 2, buffet trưa và hoạt động dưới nước theo gói.', [
    day(850000, 'Lựa chọn tuyến 1 hoặc tuyến 2, buffet trưa và hoạt động dưới nước theo gói.', '850.000–900.000đ/khách'),
    dinner(650000),
  ]),
  cruise('iris', 'Iris', 99, 'Buffet trưa, sunset party và bể sục Jacuzzi.', [day(1150000, 'Buffet trưa, sunset party và bể sục Jacuzzi.')]),
  cruise('amethyst', 'Amethyst', 99, 'Buffet trưa, hướng dẫn viên và sunset party theo chương trình.', [
    day(1090000, 'Buffet trưa, hướng dẫn viên và sunset party theo chương trình.'),
  ]),
  cruise('la-casta', 'La Casta', 99, 'Khởi hành từ Tuần Châu; buffet, trà chiều và kayak theo gói.', [
    day(1250000, 'Khởi hành từ Tuần Châu; buffet, trà chiều và kayak theo gói.'),
  ]),
  cruise('queen', 'Queen', 99, 'Du thuyền tuyến 2 từ Tuần Châu, buffet và tiệc trà chiều.', [
    day(1250000, 'Du thuyền tuyến 2 từ Tuần Châu, buffet và tiệc trà chiều.'),
  ]),
  cruise('stella', 'Stella Cruise', 99, 'Tuyến 2 từ cảng Tuần Châu, buffet trưa và chèo kayak theo gói.', [
    day(1090000, 'Tuyến 2 từ cảng Tuần Châu, buffet trưa và chèo kayak theo gói.'),
  ]),
  cruise('cozy-bay', 'Cozy Bay', 72, 'Buffet trưa, tiệc trà trên sundeck và kayak hoặc thuyền nan theo gói.', [
    day(800000, 'Buffet trưa, tiệc trà trên sundeck và kayak hoặc thuyền nan theo gói.'),
  ]),
  cruise('tau-48-cho', 'Tàu 48 chỗ', 48, 'Hai lựa chọn tuyến tham quan, phục vụ bữa trưa trên tàu; có thể thuê riêng cho đoàn.', [
    day(670000, 'Hai lựa chọn tuyến tham quan, phục vụ bữa trưa trên tàu.', '670.000–720.000đ/khách'),
    charter('3.000.000–5.000.000đ/chuyến'),
  ]),
  cruise('alova', 'Alova', 72, UNPRICED, [day(null, UNPRICED)]),
  cruise('wego', 'Wego', 48, UNPRICED, [day(null, UNPRICED)]),
  cruise('tau-rieng-72-cho', 'Tàu riêng 72 chỗ', 72, PRIVATE, [charter()]),
  cruise('tau-rieng-99-cho', 'Tàu riêng 99 chỗ', 99, PRIVATE, [charter('5.000.000–6.000.000đ/chuyến')]),
];

// The 12 games of AZway_Teambuilding.html. Names kept; how-to-play rewritten
// (the design credits game ideas and images to Viettour3mien).
const game = (name, image, howToPlay) => ({ name, image, howToPlay });
const games = [
  game('Mò cua bắt ốc', 'game-1.1', 'Một người bịt mắt nhặt đạo cụ trong vùng chơi, đồng đội đứng ngoài chỉ đường bằng lời. Đội nhặt được nhiều nhất trong thời gian quy định thắng.'),
  game('Bịt mắt đá bóng', 'game-1.2', 'Người chơi bịt mắt dẫn bóng mềm vào khung thành theo tiếng hô của đội trưởng, trên sân nhỏ có người điều phối đi kèm.'),
  game('Cuộc đua kỳ thú', 'game-1.3', 'Các đội đi qua chuỗi trạm: giải mật thư, vượt chướng ngại, tiếp sức. Đội hoàn thành đủ trạm sớm nhất thắng.'),
  game('Ô cửa may mắn', 'game-1.4', 'Đội lần lượt mở các ô trên bảng số, mỗi ô là một thử thách hoặc điểm thưởng. Nhớ ô đã mở để tìm đường qua bảng.'),
  game('Đua thuyền trên cát', 'game-2.1', 'Cả đội ngồi nối nhau thành một con thuyền và dùng tay đẩy về vạch đích mà không đứt hàng.'),
  game('Kéo co truyền thống', 'game-2.2', 'Hai đội cân sức kéo dây theo hiệu lệnh; đội kéo được mốc giữa dây qua vạch của mình thắng.'),
  game('Giải cứu công chúa', 'game-2.3', 'Đội chuyền "công chúa" từ đầu tới cuối hàng. Mặc định chuyền đạo cụ; chỉ chuyền người khi có nhân sự chuyên môn hỗ trợ.'),
  game('Gậy hơi đồng đội', 'game-2.4', 'Cả nhóm cùng giữ một ống phao hơi dài và chạy về đích; chỉ cần một người lệch nhịp là cả đội chậm lại.'),
  game('Gà đẻ trứng vàng', 'game-3.1', 'Người chơi đeo hộp bóng sau lưng, lắc người theo nhạc cho bóng rơi ra mà không dùng tay. Hết bóng trước là thắng.'),
  game('Dây chuyền sản xuất nước', 'game-3.2', 'Mỗi người giữ một đoạn máng, nối thành đường dẫn nước từ thùng nguồn tới bình đích. Bình đầy trước là thắng.'),
  game('Đồng tâm về đích', 'game-3.3', 'Mỗi người cầm một dây buộc vào chiếc đĩa có quả bóng; cả đội cùng giữ cân bằng để đưa bóng tới đích không rơi.'),
  game('Xếp tháp niềm tin', 'game-3.4', 'Đội điều khiển dụng cụ bằng dây để nhấc và chồng các khối thành tháp, không chạm tay trực tiếp vào khối.'),
];

export const teambuildings = [
  {
    slug: 'teambuilding',
    name: 'Teambuilding',
    theme: 'Tinh gọn & năng động',
    groupSizeMin: 20,
    groupSizeMax: 300,
    about: 'Một buổi hoạt động tập thể tập trung vào kết nối, phối hợp và niềm vui chung.',
    packages: ['Kịch bản trò chơi theo mục tiêu', 'MC và nhân sự điều phối', 'Đạo cụ, áo đội và âm thanh', 'Lịch trình phù hợp với đoàn'],
    games,
    thumbnail: 'tb-1',
    album: ['tb-1', 'tb-3', 'tb-5'],
    tours: ['ha-noi-ha-long-1-ngay'],
  },
  {
    slug: 'teambuilding-gala-dinner',
    name: 'Teambuilding & Gala Dinner',
    theme: 'Kết nối & sẻ chia',
    groupSizeMin: 30,
    groupSizeMax: 500,
    about: 'Chơi cùng nhau ban ngày, giao lưu và ghi nhận những đóng góp trong đêm gala.',
    packages: ['Chủ đề theo văn hóa doanh nghiệp', 'Trò chơi và đạo cụ phù hợp', 'Kịch bản gala, MC và sân khấu', 'Tùy chọn chụp ảnh, quay phim'],
    games,
    thumbnail: 'tb-2',
    album: ['tb-2', 'tb-4', 'tb-hero'],
    tours: ['ha-noi-bach-dang-giang-ha-long-2n1d'],
  },
];

// The design only has photo placeholders per group: these are samples.
export const feedbacks = [
  { groupName: 'Đoàn mẫu: Tour Trung Quốc', organization: 'Công ty mẫu A', date: '2026-08-22', tour: 'dong-hung-2n1d-mc3', description: '(Dữ liệu mẫu) Lịch trình gọn, hướng dẫn viên hỗ trợ thủ tục cửa khẩu nhanh.' },
  { groupName: 'Đoàn mẫu: Teambuilding', organization: 'Công ty mẫu B', date: '2026-07-12', tour: 'ha-noi-ha-long-1-ngay', description: '(Dữ liệu mẫu) Trò chơi vừa sức, cả đoàn tham gia đầy đủ.' },
  { groupName: 'Đoàn mẫu: Gala Dinner', organization: 'Công ty mẫu C', date: '2026-06-28', description: '(Dữ liệu mẫu) Sân khấu và âm thanh chuẩn bị chu đáo.' },
  { groupName: 'Đoàn mẫu: Tour trong nước', organization: 'Trường mẫu D', date: '2026-05-16', tour: 'ha-noi-bach-dang-giang-ha-long-2n1d', description: '(Dữ liệu mẫu) Học sinh hào hứng với phần tìm hiểu tại bãi cọc Bạch Đằng.' },
];

// Contact details as shown in the design. leadNotifyEmails is a placeholder.
export const siteSetting = {
  hotline: '033.202.8585',
  zaloUrl: 'https://zalo.me/0332028585',
  messengerUrl: 'https://m.me/azwayvietnam',
  facebookUrl: 'https://www.facebook.com/azwayvietnam/',
  email: 'info@azway.vn',
  address: 'Trụ sở: Số 13 Ngách 56/125 Phố Tứ Liên, Phường Tứ Liên, Hà Nội\nVăn phòng Hạ Long: Tổ 18 khu 7, Phường Cao Xanh, Quảng Ninh',
  leadNotifyEmails: 'lead-mau@example.com',
  responseTimeText: 'AZway phản hồi trong vòng 30 phút trong giờ làm việc (giá trị mẫu)',
  defaultSeo: {
    metaTitle: 'AZway – Du lịch trong nước, Trung Quốc và du thuyền Hạ Long',
    metaDescription: 'Du thuyền, khách sạn, xe di chuyển tại Việt Nam; tour Trung Quốc theo cửa khẩu và những hành trình quốc tế.',
    shareImage: 'logo',
  },
};

export const homepage = {
  heroSlides: [
    { image: ['jiuzhaigou'], title: 'Du lịch cùng AZway. Chọn nhanh, đi đúng ý.', subtitle: 'Du thuyền, khách sạn, xe di chuyển tại Việt Nam; tour Trung Quốc theo cửa khẩu và những hành trình quốc tế.', ctaLabel: 'Tìm tour', ctaUrl: '/tour' },
    { image: ['dali'], title: 'Tour Trung Quốc theo cửa khẩu', subtitle: 'Lào Cai – Hà Khẩu, Móng Cái – Đông Hưng và tour bay từ Hà Nội.', ctaLabel: 'Xem tour Trung Quốc', ctaUrl: '/tour?loai=trung-quoc' },
    // Falls back to the logo when unverified images are skipped.
    { image: ['tb-hero', 'logo'], title: 'Cùng một đội. Chung một hành trình.', subtitle: 'Teambuilding, gala dinner và company trip theo đội ngũ của bạn.', ctaLabel: 'Lên chương trình', ctaUrl: '/teambuilding' },
  ],
  featuredTours: ['ha-noi-bach-dang-giang-ha-long-2n1d', 'ha-noi-ha-long-1-ngay', 'kien-thuy-mong-tu-3n2d-lc2', 'dong-hung-2n1d-mc3'],
  featuredCruises: ['ambassador', 'luna', 'saquila'],
  featuredArticles: ['ha-long-2n1d', 'tour-trung-quoc-cua-khau', 'checklist-teambuilding'],
};

// Sample legacy paths for AC-16; the real list comes from AZway (SEO-07).
// /tourtrungtonghop and /duthuyen are AZway's current landing pages.
export const redirects = [
  { from: '/tourtrungtonghop', to: '/tour?loai=trung-quoc', statusCode: 301 },
  { from: '/duthuyen', to: '/du-thuyen', statusCode: 301 },
  { from: '/tour-ha-long-1-ngay.html', to: '/tour/ha-noi-ha-long-1-ngay', statusCode: 301 },
  { from: '/khuyen-mai-mua-he', to: '/', statusCode: 302 },
];

// Covers and related products for the guide articles in guide.json.
export const articleLinks = {
  'ha-long-2n1d': { tours: ['ha-noi-ha-long-1-ngay', 'ha-noi-bach-dang-giang-ha-long-2n1d'], cruises: ['ambassador', 'luna'] },
  'tour-trung-quoc-cua-khau': { cover: 'chongqing', tours: ['kien-thuy-mong-tu-3n2d-lc2', 'dong-hung-2n1d-mc3', 'ha-noi-trung-khanh-city-tour-4n3d-1-shopping'] },
  'du-thuyen-trong-ngay-hay-nghi-dem': { cruises: ['sea-octopus', 'saquila', 'tau-48-cho'] },
  'checklist-teambuilding': { cover: 'tb-1' },
};
