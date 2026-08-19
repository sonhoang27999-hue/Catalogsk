/**
 * Đọc file Excel bảng giá và chỉ lấy các thông tin cần thiết:
 * hãng xe, đời xe (kèm năm sản xuất), giá đại lý (chưa VAT),
 * giá niêm yết (đã VAT) và giá lắp đặt khuyến mãi (đã VAT).
 */
import * as XLSX from "xlsx";

export type PriceRow = {
  brand: string;
  model: string;
  productName: string;
  dealerPrice: number | null;
  price: number;
  salePrice: number | null;
};

const BRANDS: [RegExp, string][] = [
  [/toyota|corolla|camry|inova|innova|fortuner|vios|veloz|avanza|yaris|hilux|land\s*cruiser|prado/i, "Toyota"],
  [/lexus/i, "Lexus"],
  [/honda|civic|crv|cr-v|hrv|hr-v|accord|\bcity\b|brv|br-v/i, "Honda"],
  [/mazda|cx-?\d/i, "Mazda"],
  [/ford|everest|ranger|raptor|explorer|territory|next\s*gen/i, "Ford"],
  [/mercedes|benz|\bglc\b|\bgle\b|\bc\s*class\b|\be\s*class\b/i, "Mercedes"],
  [/bmw/i, "BMW"],
  [/porsche|cayenne|macan|panamera/i, "Porsche"],
  [/mitsubishi|xpander|xforce|outlander|pajero|triton|attrage/i, "Mitsubishi"],
  [/hyundai|huyndai|elantra|santafe|santa\s*fe|accent|tucson|creta|custin|stargazer|palisade|i10/i, "Hyundai"],
  [/vinfast|vf\s*\d|limo|green\s*mvp|lux\s*a|lux\s*sa|fadil/i, "VinFast"],
  [/\bmg\b/i, "MG"],
  [/kia|seltos|sonet|carnival|sorento|sportage|morning|k3\b|k5\b/i, "Kia"],
  [/audi/i, "Audi"],
  [/suzuki|ertiga|xl7|swift/i, "Suzuki"],
  [/nissan|almera|navara|kicks/i, "Nissan"],
  [/subaru|forester/i, "Subaru"],
  [/peugeot|\b3008\b|\b5008\b|\b2008\b/i, "Peugeot"],
  [/volkswagen|\bvw\b|tiguan|teramont/i, "Volkswagen"],
  [/isuzu|mu-?x|d-?max/i, "Isuzu"],
  [/land\s*rover|range\s*rover|defender|discovery/i, "Land Rover"],
  [/volvo|\bxc\d\d\b/i, "Volvo"],
  [/chevrolet|colorado|trailblazer/i, "Chevrolet"],
  [/haval|jolion/i, "Haval"],
  [/wuling|mini\s*ev/i, "Wuling"],
  [/skoda|kodiaq|karoq/i, "Skoda"],
  [/geely|coolray|monjaro/i, "Geely"],
  [/omoda|jaecoo/i, "Omoda"],
  [/byd|atto|seal|dolphin/i, "BYD"],
  [/jeep|\bram\b/i, "Jeep"],
  [/baic|beijing/i, "BAIC"],
];


const clean = (v: unknown) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : null;
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const splitBrand = (sheetName: string): { brand: string; model: string } => {
  const name = clean(sheetName);
  for (const [re, brand] of BRANDS) {
    if (re.test(name)) {
      const stripped = clean(
        name.replace(new RegExp(`^\\s*(${brand.split("-")[0]}|huyndai)\\b`, "i"), ""),
      );
      const model = stripped.length > 0 ? stripped : name;
      return { brand, model };
    }
  }
  return { brand: "Khác", model: name };
};

/** Tìm dòng tiêu đề (có cột "Số chi tiết") và ánh xạ các cột giá cần dùng. */
const findHeader = (grid: unknown[][]) => {
  for (let r = 0; r < Math.min(grid.length, 12); r++) {
    const raw = grid[r] ?? [];
    const cells = Array.from({ length: raw.length }, (_, i) => clean(raw[i]).toLowerCase());

    if (!cells.some((c) => c.includes("số chi tiết"))) continue;
    let dealer = -1;
    let price = -1;
    let sale = -1;
    cells.forEach((c, i) => {
      const noVat = c.includes("chưa gồm vat");
      const vat = c.includes("đã gồm vat");
      if (dealer < 0 && c.includes("giá đại l") && noVat) dealer = i;
      if (price < 0 && c.includes("giá niêm yết") && vat) price = i;
      if (sale < 0 && c.includes("lắp đặt khuyến mãi") && vat) sale = i;
    });
    if (price < 0) cells.forEach((c, i) => { if (price < 0 && c.includes("giá niêm yết")) price = i; });
    return { row: r, dealer, price, sale, detail: cells.findIndex((c) => c.includes("số chi tiết")) };
  }
  return null;
};

export function parsePriceWorkbook(buffer: ArrayBuffer): PriceRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const rows: PriceRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    const head = findHeader(grid);
    if (!head) continue;
    const { brand, model } = splitBrand(sheetName);

    let base = "";
    for (let r = head.row + 1; r < grid.length; r++) {
      const line = grid[r] ?? [];
      const label = clean(line[0]);
      if (label) base = label;
      const detail = clean(head.detail >= 0 ? line[head.detail] : "");
      const price = toNumber(head.price >= 0 ? line[head.price] : null);
      if (!price) continue;
      const productName = detail ? `${base || model} - ${detail} chi tiết` : base || model;
      rows.push({
        brand,
        model,
        productName: productName.slice(0, 160),
        dealerPrice: head.dealer >= 0 ? toNumber(line[head.dealer]) : null,
        price,
        salePrice: head.sale >= 0 ? toNumber(line[head.sale]) : null,
      });
    }
  }
  return rows;
}
