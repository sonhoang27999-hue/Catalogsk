import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toLoginEmail } from "@/lib/username";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Đăng nhập quản trị | AutoDeco" },
      {
        name: "description",
        content: "Đăng nhập để quản lý danh mục hãng xe, đời xe, năm sản xuất và sản phẩm.",
      },
      { property: "og:title", content: "Đăng nhập quản trị | AutoDeco" },
      { property: "og:description", content: "Đăng nhập đại lý để xem giá nhập." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const REMEMBER_KEY = "autodeco.remember";
const LAST_LOGIN_KEY = "autodeco.lastLogin";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
    if (typeof window === "undefined") return;
    const savedRemember = localStorage.getItem(REMEMBER_KEY);
    if (savedRemember !== null) setRemember(savedRemember === "1");
    const savedLogin = localStorage.getItem(LAST_LOGIN_KEY);
    if (savedLogin) setEmail(savedLogin);
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Nhập tên đăng nhập và mật khẩu tối thiểu 6 ký tự.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: toLoginEmail(email),
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Đăng ký thành công. Kiểm tra email nếu cần xác nhận.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: toLoginEmail(email),
          password,
        });
        if (error) throw error;
      }
      localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
      if (remember) localStorage.setItem(LAST_LOGIN_KEY, email.trim());
      else localStorage.removeItem(LAST_LOGIN_KEY);
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không đăng nhập được.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-5 py-10">
      <h1 className="text-xl font-bold">Đăng nhập</h1>
      <p className="mt-1 text-sm text-muted-foreground">Đại lý đăng nhập để xem giá nhập.</p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Tên đăng nhập hoặc email</Label>
          <Input
            id="email"
            type="text"
            autoCapitalize="none"
            value={email}
            maxLength={255}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tên đăng nhập hoặc email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mật khẩu</Label>
          <Input
            id="password"
            type="password"
            value={password}
            maxLength={72}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 accent-[var(--brand)]"
          />
          Ghi nhớ đăng nhập trên thiết bị này
        </label>
        <Button type="submit" className="w-full" disabled={loading}>
          {mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-4 text-center text-sm text-brand underline"
      >
        {mode === "signin" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
      </button>

      <Link to="/dang-ky-dai-ly" className="mt-2 text-center text-sm text-brand underline">
        Đăng ký làm đại lý
      </Link>

      <Link to="/" className="mt-2 text-center text-xs text-muted-foreground underline">
        Về trang chủ
      </Link>
    </div>
  );
}
