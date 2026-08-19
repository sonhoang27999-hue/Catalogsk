import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { normalizeUsername } from "@/lib/username";

export const Route = createFileRoute("/dang-ky-dai-ly")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Đăng ký đại lý | AutoDeco" },
      {
        name: "description",
        content:
          "Gửi thông tin đăng ký làm đại lý phân phối: tên đăng nhập, họ tên và số điện thoại. Quản trị viên sẽ duyệt hồ sơ.",
      },
      { property: "og:title", content: "Đăng ký đại lý | AutoDeco" },
      {
        property: "og:description",
        content: "Đăng ký làm đại lý phân phối để xem giá nhập.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DealerSignupPage,
});

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Tên đăng nhập tối thiểu 3 ký tự")
    .max(32, "Tên đăng nhập tối đa 32 ký tự"),
  fullName: z.string().trim().min(2, "Nhập họ tên").max(80, "Họ tên quá dài"),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{8,10}$/, "Số điện thoại không hợp lệ"),
});

function DealerSignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ username, fullName, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Thông tin chưa hợp lệ.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("dealer_applications").insert({
        username: normalizeUsername(parsed.data.username),
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        status: "pending",
      });
      if (error) throw error;
      setDone(true);
      toast.success("Đã gửi đăng ký, vui lòng chờ duyệt.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gửi được đăng ký.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <>
        <PageHeader title="Đăng ký đại lý" />
        <div className="px-5 py-10">
          <h2 className="text-xl font-bold">Đã gửi đăng ký</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hồ sơ đại lý của bạn đang chờ duyệt. Chúng tôi sẽ liên hệ qua số điện thoại{" "}
            <span className="text-foreground">{phone}</span>.
          </p>
          <Button className="mt-6" onClick={() => navigate({ to: "/" })}>
            Về trang chủ
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Đăng ký đại lý" />
      <div className="px-5 py-8">
      <p className="mt-1 text-sm text-muted-foreground">
        Điền thông tin để được cấp tài khoản xem giá nhập.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="reg-user">Tên đăng nhập</Label>
          <Input
            id="reg-user"
            autoCapitalize="none"
            maxLength={32}
            value={username}
            placeholder="vd: daily01"
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-name">Tên</Label>
          <Input
            id="reg-name"
            maxLength={80}
            value={fullName}
            placeholder="Họ và tên"
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-phone">Số điện thoại</Label>
          <Input
            id="reg-phone"
            type="tel"
            inputMode="numeric"
            maxLength={11}
            value={phone}
            placeholder="0868055555"
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Đang gửi..." : "Gửi đăng ký"}
        </Button>
      </form>
      </div>
    </>
  );
}
