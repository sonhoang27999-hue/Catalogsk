import { useEffect, useRef, useState } from 'react';
import { PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWorkflow } from '@/components/catalog/WorkflowProvider';
import { phonePlatform, shouldOfferHomeScreen } from '@/lib/homeScreenInstall';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function HomeScreenInvite() {
  const workflow = useWorkflow();
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [busy, setBusy] = useState(false);
  const deferred = useRef<InstallEvent | null>(null);

  useEffect(() => {
    setPlatform(phonePlatform(navigator.userAgent, navigator.maxTouchPoints));
    const display = window.matchMedia('(display-mode: standalone)');
    const update = () => setStandalone(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    update();
    const capture = (event: Event) => { event.preventDefault(); deferred.current = event as InstallEvent; };
    const installed = () => { setStandalone(true); setInstructions(false); deferred.current = null; };
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', installed);
    display.addEventListener('change', update);
    return () => {
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', installed);
      display.removeEventListener('change', update);
    };
  }, []);

  if (!shouldOfferHomeScreen(workflow?.userId ?? null, platform, standalone, dismissed)) return null;

  const install = async () => {
    const event = deferred.current;
    if (platform !== 'android' || !event) { setInstructions(true); return; }
    setBusy(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'accepted') setDismissed(true);
    } catch { setInstructions(true); }
    finally { deferred.current = null; setBusy(false); }
  };

  return <>
    <aside aria-label="Thêm SK vào màn hình chính" className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.5rem)] z-40 mx-auto flex max-w-[456px] items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-lg">
      <img src="/icon-192.png" alt="" width={36} height={36} className="size-9 shrink-0 rounded-md" />
      <Button className="h-auto min-h-10 min-w-0 flex-1 whitespace-normal px-2 py-2 text-left" disabled={busy} onClick={() => void install()}><Smartphone />{busy ? 'Đang mở…' : 'Cài ứng dụng vào màn hình chính'}</Button>
      <Button variant="ghost" size="icon" className="shrink-0" aria-label="Để lần sau" title="Để lần sau" onClick={() => setDismissed(true)}><X /></Button>
    </aside>
    <Dialog open={instructions} onOpenChange={setInstructions}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
        <DialogHeader><DialogTitle>Thêm SK vào màn hình chính</DialogTitle><DialogDescription>Biểu tượng SK mở trang catalog này. Cần Internet để xem sản phẩm.</DialogDescription></DialogHeader>
        {platform === 'ios' ? <ol className="list-decimal space-y-3 pl-5 text-sm text-foreground">
          <li>Mở trang này bằng Safari; nếu đang dùng Zalo hoặc Facebook, chọn mở bằng Safari.</li>
          <li>Nhấn <Share className="inline size-4" /> <strong>Chia sẻ</strong>.</li>
          <li>Chọn <PlusSquare className="inline size-4" /> <strong>Thêm vào Màn hình chính</strong>, bật “Mở dưới dạng ứng dụng web” nếu có.</li>
          <li>Nhấn <strong>Thêm</strong>.</li>
        </ol> : <ol className="list-decimal space-y-3 pl-5 text-sm text-foreground">
          <li>Mở trang này bằng Chrome trên Android, không mở bên trong Zalo hoặc Facebook.</li>
          <li>Nhấn menu <strong>⋮</strong> của Chrome.</li>
          <li>Chọn <strong>Thêm vào màn hình chính</strong> hoặc <strong>Cài đặt ứng dụng</strong>.</li>
          <li>Xác nhận <strong>Thêm</strong> hoặc <strong>Cài đặt</strong>.</li>
        </ol>}
        <Button onClick={() => setInstructions(false)}>Đã hiểu</Button>
      </DialogContent>
    </Dialog>
  </>;
}