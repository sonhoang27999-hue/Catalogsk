import { notFound } from '@tanstack/react-router';
import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SafeProductRow } from '@/data/workflow.api';

export type SharedList = { id:string;title:string;created_at:string;products:SafeProductRow[] };
export const shareOptions = (id:string) => queryOptions({queryKey:['public-share',id],queryFn:async () => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound();
  const {data,error} = await supabase.rpc('read_catalog_share',{_id:id});
  if(error) throw new Error(error.message);
  if(!data) throw notFound();
  return data as unknown as SharedList;
}});
