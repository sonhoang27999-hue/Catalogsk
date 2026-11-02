import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Heart, ListPlus, Share2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { preferenceOptions, createShare, toggleFavorite } from '@/data/workflow.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const WorkflowContext = createContext<{ userId: string | null; favorites: string[]; selected: Record<string,string>; select: (id: string,name: string) => void; favorite: (id: string) => void } | null>(null);
export const useWorkflow = () => useContext(WorkflowContext);
export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string,string>>({});
  const [open, setOpen] = useState(false); const [title, setTitle] = useState('Danh sách sản phẩm SK');
  const [link, setLink] = useState(''); const [busy, setBusy] = useState(false);
  const qc = useQueryClient(); const navigate = useNavigate();
  const { data } = useQuery(preferenceOptions(userId));
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({data}) => { if (active) setUserId(data.session?.user.id ?? null); });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => { setUserId(session?.user.id ?? null); });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);
  useEffect(() => { setSelected({}); setLink(''); setOpen(false); }, [userId]);
  const select = (id: string, name: string) => { setLink(''); setSelected(prev => { const next = {...prev}; if (id in next) delete next[id]; else next[id] = name || 'Sản phẩm'; return next; }); };
  const favorite = async (id: string) => {
    if (!userId) { toast.info('Đăng nhập để lưu sản phẩm yêu thích.'); navigate({to:'/auth'}); return; }
    try { await toggleFavorite(id); await qc.invalidateQueries({queryKey:['catalog-preferences',userId]}); } catch(e) { toast.error((e as Error).message); }
  };
  const share = async () => {
    setBusy(true);
    try { const id = await createShare(title, Object.keys(selected)); setLink(`${window.location.origin}/chia-se/${id}`); } catch(e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return <WorkflowContext.Provider value={{userId, favorites: data?.favorite_ids ?? [], selected, select, favorite}}>
    {children}
    {userId && Object.keys(selected).length > 0 ? <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-[480px] items-center justify-between gap-2 border border-border bg-card px-3 py-2 shadow-sm">
      <span className="text-sm font-semibold">{Object.keys(selected).length} sản phẩm</span>
      <Button size="sm" onClick={() => setOpen(true)}><Share2 className="size-4" /> Gửi khách</Button>
      <Button size="icon" variant="ghost" aria-label="Bỏ chọn tất cả" title="Bỏ chọn tất cả" onClick={() => {setSelected({});setLink('');}}><X className="size-4" /></Button>
    </div> : null}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Gửi danh sách cho khách</DialogTitle><DialogDescription>Chỉ gồm giá bán và thông tin sản phẩm, không có giá nhập.</DialogDescription></DialogHeader>
      <Input aria-label="Tên danh sách" value={title} maxLength={160} onChange={e => {setTitle(e.target.value);setLink('');}} />
      <div className="max-h-56 space-y-1 overflow-y-auto">{Object.entries(selected).map(([id,name]) => <div key={id} className="flex items-center justify-between gap-2 border-b border-border py-2"><span className="min-w-0 break-words text-sm">{name}</span><Button size="icon" variant="ghost" aria-label={`Bỏ chọn ${name}`} onClick={() => select(id,name)}><Trash2 className="size-4" /></Button></div>)}</div>
      {link ? <><Input aria-label="Đường dẫn chia sẻ" readOnly value={link} /><Button onClick={async () => { try { if (navigator.share) await navigator.share({title,url:link}); else {await navigator.clipboard.writeText(link); toast.success('Đã sao chép đường dẫn.');} } catch { toast.info('Bạn có thể sao chép đường dẫn phía trên.'); } }}><Share2 className="size-4" /> Chia sẻ đường dẫn</Button></> : <Button disabled={busy || !Object.keys(selected).length} onClick={share}>{busy ? 'Đang tạo…' : 'Tạo đường dẫn'}</Button>}
    </DialogContent></Dialog>
  </WorkflowContext.Provider>;
}
export function ProductActions({id,name}: {id:string;name:string}) {
  const workflow = useWorkflow(); if (!workflow) return null;
  const liked = workflow.favorites.includes(id); const picked = id in workflow.selected;
  return <div className="flex items-center justify-end gap-1 px-3 py-1">
    <Button variant="ghost" size="icon" className={liked ? 'text-gold' : 'text-muted-foreground'} aria-label={`${liked ? 'Bỏ yêu thích' : 'Yêu thích'} ${name}`} title={liked ? 'Bỏ yêu thích' : 'Yêu thích'} aria-pressed={liked} onClick={() => workflow.favorite(id)}><Heart className="size-4" fill={liked ? 'currentColor' : 'none'} /></Button>
    {workflow.userId ? <Button variant={picked ? 'secondary' : 'ghost'} size="sm" aria-pressed={picked} onClick={() => workflow.select(id,name)}><ListPlus className="size-4" />{picked ? 'Đã chọn' : 'Chọn gửi khách'}</Button> : null}
  </div>;
}
