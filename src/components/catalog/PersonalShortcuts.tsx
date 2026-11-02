import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Car, Heart } from 'lucide-react';
import { useWorkflow } from './WorkflowProvider';
import { parseRecent, preferenceOptions, type RecentVehicle } from '@/data/workflow.api';
export function PersonalShortcuts() {
  const workflow = useWorkflow(); const [guestRecent,setGuestRecent] = useState<RecentVehicle[]>([]);
  const {data} = useQuery(preferenceOptions(workflow?.userId ?? null));
  useEffect(() => { try {const saved = localStorage.getItem('sk.recentVehicle'); if(saved) setGuestRecent(parseRecent([JSON.parse(saved)]));} catch { /* invalid stored value */ } },[]);
  const recent = workflow?.userId ? parseRecent(data?.recent_vehicles) : guestRecent;
  return <div className="space-y-2 px-3 pt-3">
    {workflow?.userId ? <Link to="/yeu-thich" className="flex items-center gap-2 border-b border-border py-2 text-sm font-medium"><Heart className="size-4 text-gold" /> Sản phẩm yêu thích <span className="ml-auto text-muted-foreground">{workflow.favorites.length}</span></Link> : null}
    {recent.length ? <div><p className="mb-2 text-xs font-semibold text-muted-foreground">Xe vừa xem</p><div className="flex gap-2 overflow-x-auto pb-2">{recent.map(v => <a key={v.path} href={v.path} className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs"><Car className="size-4 text-brand" />{v.name}</a>)}</div></div> : null}
  </div>;
}
