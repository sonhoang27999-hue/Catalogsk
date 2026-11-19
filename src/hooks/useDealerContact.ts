/**
 * Xác định "đang xem catalog qua đại lý cấp 1 nào" để hiện nút Gọi/Zalo và ghi chú của họ.
 * Trang gốc không có đại lý → không có nút tư vấn.
 *
 * Thứ tự ưu tiên:
 *  1. Trang "Gửi khách" do chính đại lý cấp 1 tạo.
 *  2. Tài khoản đang đăng nhập: đại lý cấp 1, hoặc tài khoản do đại lý cấp 1 tạo.
 *  3. Mã trên link (`?dl=<mã>`), hoặc mã trình duyệt còn nhớ từ lần mở link trước.
 *
 * Chỉ chạy ở trình duyệt (cần localStorage và phiên đăng nhập) nên lần vẽ đầu luôn là "chưa có".
 */
import { useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import {
  fetchDealerContactByCode,
  fetchMyDealerContact,
  fetchShareDealerContact,
  type DealerContact,
} from "@/data/dealer.api";
import { useAdmin } from "@/hooks/useAdmin";
import {
  DEALER_CLEAR,
  DEALER_STORAGE_KEY,
  dealerCodeFromSearch,
  isDealerCode,
} from "@/lib/dealerLink";

export const DEALER_CONTACT_KEY = ["dealer-contact"] as const;

const SHARE_PATH = /^\/chia-se\/([0-9a-f-]{36})\/?$/i;

// Mã đại lý đang nhớ, dùng chung cho mọi component (undefined = chưa đọc localStorage).
let remembered: string | null | undefined;
const listeners = new Set<() => void>();

function readRemembered(): string | null {
  if (remembered === undefined) {
    try {
      const stored = localStorage.getItem(DEALER_STORAGE_KEY);
      remembered = isDealerCode(stored) ? stored : null;
    } catch {
      remembered = null; // Trình duyệt chặn lưu trữ: vẫn dùng được mã trên URL.
    }
  }
  return remembered;
}

/** Ghi nhớ (hoặc xoá, khi truyền null) mã đại lý cho các lần mở sau. */
export function rememberDealerCode(code: string | null) {
  if (readRemembered() === code) return;
  remembered = code;
  try {
    if (code) localStorage.setItem(DEALER_STORAGE_KEY, code);
    else localStorage.removeItem(DEALER_STORAGE_KEY);
  } catch {
    /* Không lưu được thì chỉ nhớ trong phiên đang mở. */
  }
  listeners.forEach((notify) => notify());
}

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
};

export function useDealerContact(): { contact: DealerContact | null; pending: boolean } {
  const { userId, sessionKnown } = useAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const stored = useSyncExternalStore(subscribe, readRemembered, () => null);

  // Mã trên link (?dl=<mã>) được dùng ngay; ?dl=off thì quên mã đang nhớ.
  const fromUrl = dealerCodeFromSearch(searchStr);
  useEffect(() => {
    if (fromUrl === DEALER_CLEAR) rememberDealerCode(null);
  }, [fromUrl]);

  const code = fromUrl === DEALER_CLEAR ? null : (fromUrl ?? stored);
  const shareId = SHARE_PATH.exec(pathname)?.[1] ?? null;

  const share = useQuery({
    queryKey: [...DEALER_CONTACT_KEY, "share", shareId],
    enabled: Boolean(shareId),
    queryFn: () => fetchShareDealerContact(shareId as string),
  });
  const mine = useQuery({
    queryKey: [...DEALER_CONTACT_KEY, "me", userId],
    enabled: Boolean(userId),
    queryFn: fetchMyDealerContact,
  });
  const byCode = useQuery({
    // Người đã đăng nhập nhận thêm ghi chú → tách cache theo trạng thái đăng nhập.
    queryKey: [...DEALER_CONTACT_KEY, "code", code, Boolean(userId)],
    enabled: Boolean(code) && sessionKnown,
    queryFn: () => fetchDealerContactByCode(code as string),
  });

  // Chỉ nhớ mã khi đúng là của một đại lý đang bật: link gõ sai không ghi đè mã đã nhớ.
  const linkCode = fromUrl && byCode.data?.code === fromUrl ? fromUrl : null;
  // Khách mở trang "Gửi khách" của đại lý rồi bấm về danh mục vẫn thấy đúng đại lý đó.
  const shareCode = share.data?.code ?? null;
  useEffect(() => {
    const confirmed = shareCode ?? linkCode;
    if (confirmed) rememberDealerCode(confirmed);
  }, [shareCode, linkCode]);

  // Chờ nguồn ưu tiên cao hơn trả lời xong rồi mới dùng nguồn thấp hơn, tránh nháy sai đại lý.
  const waitingShare = Boolean(shareId) && share.isPending;
  const waitingMine = !sessionKnown || (Boolean(userId) && mine.isPending);
  const waitingCode = Boolean(code) && byCode.isPending;

  if (waitingShare) return { contact: null, pending: true };
  if (share.data) return { contact: share.data, pending: false };
  if (waitingMine) return { contact: null, pending: true };
  if (mine.data) return { contact: mine.data, pending: false };
  if (waitingCode) return { contact: null, pending: true };
  return { contact: byCode.data ?? null, pending: false };
}
