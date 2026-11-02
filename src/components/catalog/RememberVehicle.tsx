import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { rememberVehicle } from '@/data/workflow.api';
import { useWorkflow } from './WorkflowProvider';
export function RememberVehicle({path,name}: {path:string;name:string}) {
  const userId = useWorkflow()?.userId; const qc = useQueryClient();
  useEffect(() => {
    if (userId) { void rememberVehicle(userId,{path,name}).then(() => qc.invalidateQueries({queryKey:['catalog-preferences',userId]})).catch(() => {}); }
    else { try { localStorage.setItem('sk.recentVehicle', JSON.stringify({path,name})); } catch { /* storage unavailable */ } }
  }, [userId,path,name,qc]);
  return null;
}
