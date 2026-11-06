import { supabase } from './supabase.js';
import { newCode, rankHelpers, byId, num } from './logic.js';

export async function createSquad({ squadName, name, limit, hasBand, loc }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const { data: squad, error } = await supabase.from('squads')
      .insert({ code, name: squadName.trim() || 'Tonight’s squad' }).select().single();
    if (error) {
      if (error.code === '23505') continue; // code taken, try another
      throw error;
    }
    const member = await addMember(squad.id, { name, limit, hasBand, loc });
    await supabase.from('squads').update({ host_member_id: member.id }).eq('id', squad.id);
    return { squad, member };
  }
  throw new Error('Could not create a squad code. Try again.');
}

export async function findSquad(code) {
  const { data, error } = await supabase.from('squads').select('*').eq('code', code.trim().toUpperCase()).maybeSingle();
  if (error) throw error;
  return data;
}

export async function addMember(squadId, { name, limit, hasBand, loc }) {
  const row = {
    squad_id: squadId,
    name: name.trim() || 'Friend',
    bac_limit: limit,
    has_band: hasBand,
  };
  if (loc?.ok) {
    Object.assign(row, {
      lat: loc.lat, lng: loc.lng, accuracy_m: loc.accuracy, location_source: 'gps',
      location_updated_at: new Date().toISOString(),
    });
  }
  const { data, error } = await supabase.from('members').insert(row).select().single();
  if (error) throw error;
  return data;
}

export const startNight = (squadId) =>
  supabase.from('squads').update({ status: 'live', started_at: new Date().toISOString() }).eq('id', squadId);

const WIPE = { lat: null, lng: null, accuracy_m: null, location_source: null, location_updated_at: null };

export async function endNight(squadId) {
  await supabase.from('alerts').update({ status: 'resolved', resolution: 'night_ended', resolved_at: new Date().toISOString() })
    .eq('squad_id', squadId).eq('status', 'open');
  await supabase.from('squads').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', squadId);
  await supabase.from('members').update(WIPE).eq('squad_id', squadId);
}

export const leaveSquad = (memberId) =>
  supabase.from('members').update({ status: 'left', ...WIPE }).eq('id', memberId);

// Add me to the people going for this alert. Re-checks to survive two taps at once.
export async function joinGoing(alertId, memberId) {
  for (let i = 0; i < 4; i++) {
    const { data: a } = await supabase.from('alerts').select('going_ids,responder_ids').eq('id', alertId).single();
    if (!a) return;
    if (a.going_ids.includes(memberId)) return;
    const going = [...a.going_ids, memberId];
    const responders = a.responder_ids.includes(memberId) ? a.responder_ids : [...a.responder_ids, memberId];
    await supabase.from('alerts').update({ going_ids: going, responder_ids: responders }).eq('id', alertId);
  }
}

export const resolveAlert = (alertId, memberId, resolution) =>
  supabase.from('alerts').update({
    status: 'resolved', resolved_by: memberId, resolution, resolved_at: new Date().toISOString(),
  }).eq('id', alertId).eq('status', 'open');

// Fire an alert for a member (facilitator). Responders default to the 2 closest.
export async function fireAlert(squadId, members, subject, responderIds) {
  const responders = responderIds && responderIds.length
    ? responderIds
    : rankHelpers(members, subject).slice(0, 2).map((m) => m.id);
  const bac = Math.max(num(subject.bac), num(subject.bac_limit));
  await supabase.from('members').update({ bac }).eq('id', subject.id);
  await supabase.from('alerts').update({ status: 'resolved', resolution: 'superseded', resolved_at: new Date().toISOString() })
    .eq('squad_id', squadId).eq('subject_member_id', subject.id).eq('status', 'open');
  const { error } = await supabase.from('alerts').insert({
    squad_id: squadId, subject_member_id: subject.id, bac, responder_ids: responders,
  });
  if (error) throw error;
}

export async function escalate(alert, members) {
  const subject = byId(members, alert.subject_member_id);
  if (!subject) return;
  const next = rankHelpers(members, subject, alert.responder_ids)[0];
  if (!next) return;
  await supabase.from('alerts').update({ responder_ids: [...alert.responder_ids, next.id] }).eq('id', alert.id);
}

export async function submitFeedback(row) {
  const { error } = await supabase.from('feedback').insert(row);
  if (error) throw error;
}
