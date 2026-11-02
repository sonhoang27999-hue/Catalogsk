import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Hospital, Car, Siren, Pill, Phone, Pencil, ShieldAlert, HelpCircle } from "lucide-react";
import { BigScreen, PageHeader } from "@/components/sk/ui";
import { store, useStore, type Profile } from "@/lib/store";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Khẩn cấp — SK Translate" },
      { name: "description", content: "Thẻ chữ to tiếng Trung cho taxi, bệnh viện, dị ứng, cảnh sát — đưa ngay cho người đối diện." },
      { property: "og:title", content: "Khẩn cấp — SK Translate" },
      { property: "og:description", content: "Thẻ chữ to tiếng Trung cho tình huống khẩn cấp ở Trung Quốc." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmergencyPage,
});

type Card = { icon: typeof Car; vi: string; zh: string; en: string; pinyin?: string; tel?: string };

const FIXED: Card[] = [
  { icon: Hospital, vi: "Đưa tôi đến bệnh viện gần nhất", zh: "请带我去最近的医院", en: "Please take me to the nearest hospital", pinyin: "Qǐng dài wǒ qù zuìjìn de yīyuàn" },
  { icon: Siren, vi: "Giúp tôi với! Xin gọi cảnh sát", zh: "救命！请帮我报警", en: "Help! Please call the police", pinyin: "Jiùmìng! Qǐng bāng wǒ bàojǐng" },
  { icon: HelpCircle, vi: "Tôi bị lạc, xin hãy giúp tôi", zh: "我迷路了，请帮帮我", en: "I'm lost, please help me", pinyin: "Wǒ mílù le, qǐng bāngbang wǒ" },
  { icon: Pill, vi: "Tôi cần mua thuốc. Hiệu thuốc ở đâu?", zh: "我需要买药。药店在哪里？", en: "I need medicine. Where is a pharmacy?", pinyin: "Wǒ xūyào mǎi yào. Yàodiàn zài nǎlǐ?" },
  { icon: ShieldAlert, vi: "Tôi không nói được tiếng Trung, xin hãy viết ra", zh: "我不会说中文，请写下来", en: "I don't speak Chinese, please write it down", pinyin: "Wǒ bú huì shuō Zhōngwén, qǐng xiě xiàlái" },
];
const CALLS = [
  { n: "110", vi: "Cảnh sát", zh: "报警", en: "Police" },
  { n: "120", vi: "Cấp cứu", zh: "急救", en: "Ambulance" },
  { n: "119", vi: "Cứu hoả", zh: "火警", en: "Fire" },
];

const FIELDS: { k: keyof Profile; l: string; ph: string }[] = [
  { k: "hotelName", l: "Tên khách sạn (chữ Trung)", ph: "如：锦江之星酒店" },
  { k: "hotelAddress", l: "Địa chỉ khách sạn (chữ Trung)", ph: "如：深圳市南山区科技园路1号" },
  { k: "name", l: "Tên của bạn", ph: "Nguyễn Văn A" },
  { k: "phone", l: "Số điện thoại liên hệ", ph: "+86 …" },
  { k: "allergy", l: "Dị ứng (chữ Trung)", ph: "如：青霉素、花生" },
  { k: "blood", l: "Nhóm máu", ph: "O+" },
];

function EmergencyPage() {
  const p = useStore((s) => s.settings.profile);
  const w = useStore((s) => s.settings.workLang);
  const zh = w === "zh";
  const [big, setBig] = useState<{ text: string; pinyin?: string | undefined; sub?: string } | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(p);

  const personal: Card[] = [];
  if (p.hotelAddress || p.hotelName) personal.push({ icon: Car, vi: "Taxi: đưa tôi về khách sạn", zh: `请送我到这个地址：\n${[p.hotelName, p.hotelAddress].filter(Boolean).join("\n")}`, en: `Please take me to this address:\n${[p.hotelName, p.hotelAddress].filter(Boolean).join("\n")}` });
  if (p.allergy) personal.push({ icon: Pill, vi: "Tôi bị dị ứng", zh: `我对以下过敏：\n${p.allergy}`, en: `I am allergic to:\n${p.allergy}` });
  if (p.name || p.phone || p.blood) personal.push({ icon: Phone, vi: "Thông tin của tôi", zh: [p.name && `姓名：${p.name}`, p.phone && `电话：${p.phone}`, p.blood && `血型：${p.blood}`].filter(Boolean).join("\n"), en: [p.name && `Name: ${p.name}`, p.phone && `Phone: ${p.phone}`, p.blood && `Blood type: ${p.blood}`].filter(Boolean).join("\n") });

  const Item = ({ c }: { c: Card }) => {
    const I = c.icon;
    return (
      <button onClick={() => setBig({ text: zh ? c.zh : c.en, pinyin: zh ? c.pinyin : undefined, sub: c.vi })} className="tap surface flex w-full items-center gap-3 p-4 text-left">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary"><I className="h-6 w-6" /></span>
        <span className="min-w-0">
          <span className="block font-semibold">{c.vi}</span>
          <span className={cn("line-clamp-2 block whitespace-pre-line text-lg", zh && "font-zh")}>{zh ? c.zh : c.en}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader back title="Khẩn cấp" subtitle={`${zh ? "紧急" : "Emergency"} · Chạm để hiện chữ to`} />

      <div className="grid grid-cols-3 gap-2">
        {CALLS.map((c) => (
          <a key={c.n} href={`tel:${c.n}`} className="tap flex flex-col items-center rounded-2xl bg-destructive py-3 text-destructive-foreground">
            <span className="text-2xl font-bold">{c.n}</span>
            <span className="text-xs font-semibold">{c.vi} · <span className={cn(zh && "font-zh")}>{zh ? c.zh : c.en}</span></span>
          </a>
        ))}
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Thẻ cá nhân</h2>
          <button onClick={() => { setForm(p); setEdit(!edit); }} className="tap inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold"><Pencil className="h-3.5 w-3.5" />{edit ? "Đóng" : "Sửa thông tin"}</button>
        </div>
        {edit && (
          <div className="surface space-y-3 p-4">
            {FIELDS.map((f) => (
              <label key={f.k} className="block text-xs text-muted-foreground">{f.l}
                <input value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.ph} className="mt-1 h-12 w-full rounded-xl border bg-background px-3 font-zh text-base text-foreground" />
              </label>
            ))}
            <button onClick={() => { store.updateSettings({ profile: form }); setEdit(false); }} className="tap h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground">Lưu</button>
            <p className="text-[11px] text-muted-foreground">Chỉ lưu trên điện thoại này. Mẹo: dùng màn Dịch để chuyển địa chỉ sang chữ Trung rồi dán vào.</p>
          </div>
        )}
        {!edit && personal.length === 0 && <p className="surface p-4 text-sm text-muted-foreground">Thêm địa chỉ khách sạn, dị ứng… để có thẻ đưa cho taxi hoặc bác sĩ.</p>}
        {personal.map((c) => <Item key={c.vi} c={c} />)}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Câu khẩn cấp</h2>
        {FIXED.map((c) => <Item key={c.vi} c={c} />)}
      </section>

      {big && <BigScreen text={big.text} pinyin={big.pinyin} sub={big.sub} lang={w} onClose={() => setBig(null)} />}
    </div>
  );
}
