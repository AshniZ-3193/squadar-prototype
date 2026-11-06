import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';

// Loads one squad (by code) with its members and alerts, and keeps it live.
export function useSquad(code) {
  const [state, setState] = useState({ loading: true, squad: null, members: [], alerts: [], error: null });
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (!code) return;
    const { data: squad, error } = await supabase.from('squads').select('*').eq('code', code).maybeSingle();
    if (!alive.current) return;
    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      return;
    }
    if (!squad) {
      setState({ loading: false, squad: null, members: [], alerts: [], error: 'not_found' });
      return;
    }
    const [m, a] = await Promise.all([
      supabase.from('members').select('*').eq('squad_id', squad.id).order('joined_at'),
      supabase.from('alerts').select('*').eq('squad_id', squad.id).order('created_at'),
    ]);
    if (!alive.current) return;
    setState({ loading: false, squad, members: m.data || [], alerts: a.data || [], error: null });
  }, [code]);

  useEffect(() => {
    alive.current = true;
    refresh();
    return () => { alive.current = false; };
  }, [refresh]);

  const squadId = state.squad?.id;
  useEffect(() => {
    if (!squadId) return undefined;
    let timer;
    const kick = () => { clearTimeout(timer); timer = setTimeout(refresh, 120); };
    const channel = supabase
      .channel(`squad-${squadId}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'squads', filter: `id=eq.${squadId}` }, kick)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `squad_id=eq.${squadId}` }, kick)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `squad_id=eq.${squadId}` }, kick)
      .subscribe();
    const poll = setInterval(refresh, 8000); // safety net if a live update is missed
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [squadId, refresh]);

  return { ...state, refresh };
}
