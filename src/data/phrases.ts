export type BusinessCategory =
  | "airport" | "taxi" | "hotel" | "restaurant" | "factory" | "price" | "ordering" | "logistics" | "qc" | "basic";

export interface Phrase {
  vi: string;
  zh: string;
  en: string;
  pinyin: string;
  cat: BusinessCategory;
}

export const BUSINESS_CATEGORIES: { id: BusinessCategory; vi: string; zh: string; en: string }[] = [
  { id: "airport", vi: "Sân bay", zh: "机场", en: "Airport" },
  { id: "taxi", vi: "Taxi", zh: "出租车", en: "Taxi" },
  { id: "hotel", vi: "Khách sạn", zh: "酒店", en: "Hotel" },
  { id: "restaurant", vi: "Nhà hàng", zh: "餐厅", en: "Restaurant" },
  { id: "factory", vi: "Nhà máy", zh: "工厂", en: "Factory" },
  { id: "price", vi: "Đàm phán giá", zh: "谈价格", en: "Negotiation" },
  { id: "ordering", vi: "Đặt hàng", zh: "下单", en: "Ordering" },
  { id: "logistics", vi: "Logistics", zh: "物流", en: "Logistics" },
  { id: "qc", vi: "Kiểm tra chất lượng", zh: "质检", en: "QC" },
];

export const PHRASES: Phrase[] = [
  { vi: "Xin chào", zh: "你好", en: "Hello", pinyin: "nǐ hǎo", cat: "basic" },
  { vi: "Cảm ơn", zh: "谢谢", en: "Thank you", pinyin: "xièxie", cat: "basic" },
  { vi: "Xin lỗi", zh: "对不起", en: "Sorry", pinyin: "duìbuqǐ", cat: "basic" },
  { vi: "Bao nhiêu tiền?", zh: "多少钱？", en: "How much is it?", pinyin: "duōshao qián?", cat: "basic" },
  { vi: "Tôi không hiểu", zh: "我听不懂", en: "I don't understand", pinyin: "wǒ tīng bu dǒng", cat: "basic" },
  { vi: "Vui lòng nói chậm lại", zh: "请说慢一点", en: "Please speak more slowly", pinyin: "qǐng shuō màn yìdiǎn", cat: "basic" },
  { vi: "Nhà vệ sinh ở đâu?", zh: "洗手间在哪里？", en: "Where is the restroom?", pinyin: "xǐshǒujiān zài nǎlǐ?", cat: "basic" },

  { vi: "Quầy làm thủ tục ở đâu?", zh: "值机柜台在哪里？", en: "Where is the check-in counter?", pinyin: "zhíjī guìtái zài nǎlǐ?", cat: "airport" },
  { vi: "Tôi muốn gửi hành lý", zh: "我要托运行李", en: "I'd like to check in my luggage", pinyin: "wǒ yào tuōyùn xínglǐ", cat: "airport" },
  { vi: "Cửa ra máy bay số mấy?", zh: "登机口是几号？", en: "Which gate is it?", pinyin: "dēngjīkǒu shì jǐ hào?", cat: "airport" },
  { vi: "Hành lý của tôi bị thất lạc", zh: "我的行李丢了", en: "My luggage is lost", pinyin: "wǒ de xínglǐ diū le", cat: "airport" },

  { vi: "Cho tôi đến địa chỉ này", zh: "请带我去这个地址", en: "Please take me to this address", pinyin: "qǐng dài wǒ qù zhège dìzhǐ", cat: "taxi" },
  { vi: "Dừng ở đây", zh: "在这里停", en: "Stop here, please", pinyin: "zài zhèlǐ tíng", cat: "taxi" },
  { vi: "Đi đến sân bay", zh: "去机场", en: "To the airport, please", pinyin: "qù jīchǎng", cat: "taxi" },
  { vi: "Vui lòng bật đồng hồ tính tiền", zh: "请打表", en: "Please use the meter", pinyin: "qǐng dǎ biǎo", cat: "taxi" },

  { vi: "Tôi đã đặt phòng", zh: "我已经预订了房间", en: "I have a reservation", pinyin: "wǒ yǐjīng yùdìng le fángjiān", cat: "hotel" },
  { vi: "Mật khẩu wifi là gì?", zh: "WiFi密码是什么？", en: "What is the Wi-Fi password?", pinyin: "WiFi mìmǎ shì shénme?", cat: "hotel" },
  { vi: "Mấy giờ trả phòng?", zh: "几点退房？", en: "What time is check-out?", pinyin: "jǐ diǎn tuìfáng?", cat: "hotel" },
  { vi: "Có bữa sáng không?", zh: "有早餐吗？", en: "Is breakfast included?", pinyin: "yǒu zǎocān ma?", cat: "hotel" },

  { vi: "Cho tôi xem thực đơn", zh: "请给我菜单", en: "Can I see the menu?", pinyin: "qǐng gěi wǒ càidān", cat: "restaurant" },
  { vi: "Không cay", zh: "不要辣", en: "Not spicy, please", pinyin: "bú yào là", cat: "restaurant" },
  { vi: "Tính tiền", zh: "买单", en: "The bill, please", pinyin: "mǎidān", cat: "restaurant" },
  { vi: "Tôi bị dị ứng đậu phộng", zh: "我对花生过敏", en: "I'm allergic to peanuts", pinyin: "wǒ duì huāshēng guòmǐn", cat: "restaurant" },

  { vi: "Tôi muốn tham quan nhà máy", zh: "我想参观工厂", en: "I'd like to visit the factory", pinyin: "wǒ xiǎng cānguān gōngchǎng", cat: "factory" },
  { vi: "Công suất mỗi tháng là bao nhiêu?", zh: "每个月的产能是多少？", en: "What is your monthly capacity?", pinyin: "měi gè yuè de chǎnnéng shì duōshao?", cat: "factory" },
  { vi: "Có thể làm theo mẫu của tôi không?", zh: "可以按照我的样品做吗？", en: "Can you make it based on my sample?", pinyin: "kěyǐ ànzhào wǒ de yàngpǐn zuò ma?", cat: "factory" },
  { vi: "Chi phí làm khuôn là bao nhiêu?", zh: "开模费是多少？", en: "How much is the mold cost?", pinyin: "kāi mú fèi shì duōshao?", cat: "factory" },

  { vi: "Giá sỉ là bao nhiêu?", zh: "批发价是多少？", en: "What is the wholesale price?", pinyin: "pīfā jià shì duōshao?", cat: "price" },
  { vi: "Có thể giảm giá không?", zh: "可以便宜一点吗？", en: "Can you give a discount?", pinyin: "kěyǐ piányi yìdiǎn ma?", cat: "price" },
  { vi: "Giá này quá cao", zh: "这个价格太高了", en: "This price is too high", pinyin: "zhège jiàgé tài gāo le", cat: "price" },
  { vi: "Đặt số lượng lớn thì giá bao nhiêu?", zh: "大批量订购多少钱？", en: "What is the price for a bulk order?", pinyin: "dà pīliàng dìnggòu duōshao qián?", cat: "price" },
  { vi: "Giá đã bao gồm thuế chưa?", zh: "价格含税吗？", en: "Does the price include tax?", pinyin: "jiàgé hán shuì ma?", cat: "price" },

  { vi: "Số lượng đặt tối thiểu là bao nhiêu?", zh: "最小起订量是多少？", en: "What is the minimum order quantity?", pinyin: "zuìxiǎo qǐdìngliàng shì duōshao?", cat: "ordering" },
  { vi: "Tôi muốn đặt hàng mẫu", zh: "我想订样品", en: "I'd like to order a sample", pinyin: "wǒ xiǎng dìng yàngpǐn", cat: "ordering" },
  { vi: "Thời gian sản xuất bao lâu?", zh: "生产周期多长？", en: "What is the lead time?", pinyin: "shēngchǎn zhōuqī duō cháng?", cat: "ordering" },
  { vi: "Bảo hành bao lâu?", zh: "保修多久？", en: "How long is the warranty?", pinyin: "bǎoxiū duōjiǔ?", cat: "ordering" },
  { vi: "Thanh toán như thế nào?", zh: "怎么付款？", en: "How do I pay?", pinyin: "zěnme fùkuǎn?", cat: "ordering" },

  { vi: "Khi nào giao hàng?", zh: "什么时候发货？", en: "When will it ship?", pinyin: "shénme shíhou fāhuò?", cat: "logistics" },
  { vi: "Gửi về Việt Nam mất bao lâu?", zh: "寄到越南要多久？", en: "How long does shipping to Vietnam take?", pinyin: "jì dào Yuènán yào duōjiǔ?", cat: "logistics" },
  { vi: "Phí vận chuyển là bao nhiêu?", zh: "运费是多少？", en: "How much is shipping?", pinyin: "yùnfèi shì duōshao?", cat: "logistics" },
  { vi: "Vui lòng đóng gói cẩn thận", zh: "请包装好一点", en: "Please pack it carefully", pinyin: "qǐng bāozhuāng hǎo yìdiǎn", cat: "logistics" },
  { vi: "Cho tôi mã vận đơn", zh: "请给我运单号", en: "Please give me the tracking number", pinyin: "qǐng gěi wǒ yùndān hào", cat: "logistics" },

  { vi: "Tôi muốn kiểm tra hàng trước khi giao", zh: "发货前我要验货", en: "I want to inspect the goods before shipment", pinyin: "fāhuò qián wǒ yào yànhuò", cat: "qc" },
  { vi: "Sản phẩm này bị lỗi", zh: "这个产品有问题", en: "This product is defective", pinyin: "zhège chǎnpǐn yǒu wèntí", cat: "qc" },
  { vi: "Màu sắc không đúng", zh: "颜色不对", en: "The color is wrong", pinyin: "yánsè bú duì", cat: "qc" },
  { vi: "Đèn không sáng", zh: "灯不亮", en: "The light doesn't work", pinyin: "dēng bú liàng", cat: "qc" },
  { vi: "Tỷ lệ lỗi là bao nhiêu?", zh: "不良率是多少？", en: "What is the defect rate?", pinyin: "bùliáng lǜ shì duōshao?", cat: "qc" },
];

/** Quick chips = everyday courtesy only ("basic"). Topic phrases live in Công tác, urgent ones in Khẩn cấp — never repeat them here. */
export const QUICK_CHIPS = PHRASES.filter((p) => p.cat === "basic").map((p) => p.vi);
