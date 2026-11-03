import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, Chip, Divider, Stack, Typography } from '@mui/material';
import { ArrowLeft, Phone, Sparkles } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { api, errMsg } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { useLiveRefresh } from '@/context/RealtimeContext';
import type { RequestView } from '@/types';
import { bloodLabel, fmtDateTime } from '@/utils/format';
import { BloodChip, ErrorBlock, LoadingBlock, ReasonDialog, Responsive, StatusChip, UrgencyChip } from '@/components/common';
import { RequestTimeline } from '@/components/RequestTimeline';
import { MapView } from '@/components/MapView';
import { REQUEST_EVENTS } from './RequestsList';
import NearbyBanks from './NearbyBanks';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography component="div" fontWeight={600} sx={{ wordBreak: 'break-word' }}>{children}</Typography></Box>;
}

interface Outreach { disclaimer: string; donors: { name: string; bloodGroup: string; approxDistanceKm: number | null; priorityScore: number; response: string | null }[] }

export default function RequestDetail({ backPath }: { backPath: string }) {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const role = user!.role;
  const { data, loading, error, reload, silent } = useApi(async () => {
    const [r, t] = await Promise.all([
      api.get<{ request: RequestView }>(`/requests/${id}`),
      role === 'BLOODBANK' ? Promise.resolve({ events: [] }) : api.get<{ events: { action: string; at: string }[] }>(`/requests/${id}/timeline`)
    ]);
    return { request: r.request, events: t.events };
  }, [id]);
  useLiveRefresh(REQUEST_EVENTS, () => void silent());
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [outreach, setOutreach] = useState<Outreach | null>(null);

  const act = async (path: string, ok: string, body?: object) => {
    setBusy(true);
    try { const r = await api.post<{ donorsNotified?: number }>(`/requests/${id}/${path}`, body); enqueueSnackbar(r.donorsNotified != null ? `${ok} ${r.donorsNotified} donor(s) notified.` : ok, { variant: 'success' }); await reload(true); }
    catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); } finally { setBusy(false); }
  };

  if (loading) return <LoadingBlock rows={4} />;
  if (error || !data) return <ErrorBlock message={error ?? 'Not found'} onRetry={() => void reload()} />;
  const { request: r, events } = data;
  const isHospital = role === 'HOSPITAL';
  const responses = r.donorResponses ?? [];
  const accepted = responses.filter((x) => (x.decision ?? 'ACCEPTED') === 'ACCEPTED');

  return (
    <>
      <Button startIcon={<ArrowLeft size={16} />} onClick={() => nav(backPath)} sx={{ mb: 2 }} color="inherit">Back</Button>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: { xs: 22, md: 28 } }}>{r.code}</Typography>
          <Stack direction="row" gap={1} sx={{ mt: 1 }} flexWrap="wrap"><StatusChip status={r.status} /><UrgencyChip urgency={r.urgency} /><BloodChip group={r.bloodGroup} />{r.flagged && <Chip size="small" color="warning" label={r.flagReason ?? 'Flagged'} />}</Stack>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="flex-start">
          {isHospital && r.status === 'PENDING_VERIFICATION' && (<>
            <Button variant="contained" disabled={busy} onClick={() => void act('verify', 'Request verified.')}>Verify request</Button>
            <Button variant="outlined" color="error" disabled={busy} onClick={() => setRejecting(true)}>Reject request</Button>
          </>)}
          {isHospital && (r.status === 'VERIFIED' || r.status === 'DONOR_ACCEPTED') && <Button variant="contained" disabled={busy} onClick={() => void act('coordinate', 'Medical coordination started.')}>Start medical coordination</Button>}
          {isHospital && r.status === 'MEDICAL_COORDINATION' && <Button variant="contained" color="success" disabled={busy} onClick={() => void act('fulfill', 'Marked as fulfilled.')}>Mark fulfilled</Button>}
          {role === 'REQUESTER' && ['PENDING_VERIFICATION', 'VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION'].includes(r.status) && <Button variant="outlined" color="error" disabled={busy} onClick={() => { if (window.confirm('Cancel this request?')) void act('cancel', 'Request cancelled.'); }}>Cancel request</Button>}
        </Stack>
      </Stack>

      {r.status === 'REJECTED' && <Alert severity="error" sx={{ mb: 3 }}>Not verified by the hospital: {r.rejectionReason}</Alert>}
      {r.flagged && isHospital && <Alert severity="warning" sx={{ mb: 3 }}>{r.flagReason}. Check with the requester before verifying.</Alert>}

      <Responsive cols={{ xs: 1, lg: 2 }} gap={3}>
        <Stack gap={3} sx={{ minWidth: 0 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Request details</Typography>
            <Responsive cols={{ xs: 1, sm: 2 }} gap={2.5}>
              <Field label="Patient">{r.patient?.name ?? '—'}{r.patient?.age != null ? `, ${r.patient.age} yrs` : ''}</Field>
              <Field label="Patient's blood group">{bloodLabel(r.patient?.bloodGroup ?? r.bloodGroup)}</Field>
              {r.patient?.relationship && <Field label="Requested by (relationship)">{r.requester?.name ?? 'You'} · {r.patient.relationship}</Field>}
              {isHospital || role === 'ADMIN' ? <Field label="Requester contact">{r.requester?.phone ? <a href={`tel:${r.requester.phone}`}>{r.requester.phone}</a> : '—'}</Field> : null}
              <Field label="Units needed">{r.units} (bank supply {r.unitsFromBank})</Field>
              <Field label="Needed by">{fmtDateTime(r.requiredBy)}</Field>
              <Field label="Hospital">{r.hospital.name}, {r.hospital.city}</Field>
              <Field label="Hospital phone">{r.hospital.phone}</Field>
            </Responsive>
            {r.notes && <><Divider sx={{ my: 2 }} /><Field label="Notes">{r.notes}</Field></>}
          </Card>

          {role !== 'BLOODBANK' && (
            <Card sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Donor responses ({accepted.length} yes)</Typography>
              </Stack>
              <Alert severity="info" sx={{ mb: 2 }}>A donor saying yes is willingness, not medical approval. The hospital screens every donor first.</Alert>
              {responses.length === 0 ? <Typography color="text.secondary">No responses yet.</Typography> : (
                <Stack divider={<Divider />} gap={1.5}>
                  {responses.map((x) => (
                    <Stack key={x.id} direction="row" justifyContent="space-between" gap={2} alignItems="center" flexWrap="wrap">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={600}>{x.donorName ?? x.donorFirstName}</Typography>
                        <Typography variant="body2" color="text.secondary">{x.approxDistanceKm != null ? `≈ ${x.approxDistanceKm} km from hospital` : 'Distance not shared'}{x.note ? ` · ${x.note}` : ''}</Typography>
                      </Box>
                      <Stack direction="row" gap={1} alignItems="center">
                        <BloodChip group={x.bloodGroup} />
                        <Chip size="small" color={(x.decision ?? 'ACCEPTED') === 'ACCEPTED' ? 'success' : 'default'} label={(x.decision ?? 'ACCEPTED') === 'ACCEPTED' ? 'Yes' : 'Not now'} />
                        {x.phone && isHospital && <Button size="small" href={`tel:${x.phone}`} startIcon={<Phone size={14} />}>Call</Button>}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Card>
          )}

          {(r.allocations?.length ?? 0) > 0 && (
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Blood bank supply</Typography>
              <Stack gap={1}>{r.allocations!.map((a) => <Stack key={a.id} direction="row" justifyContent="space-between"><span>{a.bloodBank} · {a.city}</span><b>{a.units} × {bloodLabel(a.bloodGroup)}</b></Stack>)}</Stack>
            </Card>
          )}
        </Stack>

        <Stack gap={3} sx={{ minWidth: 0 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Progress</Typography>
            <RequestTimeline status={r.status} events={events} />
          </Card>
          {r.hospital.lat != null && r.hospital.lng != null && (
            <Card sx={{ p: 2 }}><MapView points={[{ id: r.hospital.id, lat: r.hospital.lat, lng: r.hospital.lng, label: r.hospital.name, sub: r.hospital.city, kind: 'hospital' }]} height={220} fallback={<Typography>{r.hospital.address}</Typography>} /></Card>
          )}
          {role !== 'BLOODBANK' && (
            <Card sx={{ p: 3 }}>
              <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1 }}><Sparkles size={18} /><Typography variant="h6">AI-assisted tools</Typography></Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Summaries and ordering suggestions are generated from request data. They never decide compatibility, eligibility or treatment.</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button size="small" variant="outlined" onClick={async () => { try { setSummary((await api.get<{ summary: string }>(`/ai/requests/${id}/summary`)).summary); } catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); } }}>Emergency summary</Button>
                {(isHospital || role === 'ADMIN') && <Button size="small" variant="outlined" onClick={async () => { try { setOutreach(await api.get<Outreach>(`/ai/requests/${id}/outreach`)); } catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); } }}>Donor outreach priority</Button>}
              </Stack>
              {summary && <Alert severity="info" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{summary}</Alert>}
              {outreach && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">{outreach.disclaimer}</Typography>
                  <Stack gap={1} sx={{ mt: 1 }}>
                    {outreach.donors.length === 0 ? <Typography>No matching donors right now.</Typography> : outreach.donors.map((d, i) => (
                      <Stack key={i} direction="row" justifyContent="space-between" gap={1}><span>{i + 1}. {d.name} ({bloodLabel(d.bloodGroup)}){d.approxDistanceKm != null ? ` · ≈${d.approxDistanceKm} km` : ''}</span><Chip size="small" label={`${d.priorityScore}${d.response ? ' · ' + d.response.toLowerCase() : ''}`} /></Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </Card>
          )}
        </Stack>
      </Responsive>

      {role === 'REQUESTER' && ['VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION', 'PENDING_VERIFICATION'].includes(r.status) && (
        <Card sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Blood banks near you</Typography>
          <NearbyBanks bloodGroup={r.bloodGroup} />
        </Card>
      )}

      <ReasonDialog open={rejecting} title="Reject request" label="Reason shown to the requester" confirmLabel="Reject request" onClose={() => setRejecting(false)}
        onConfirm={async (reason) => { await act('reject', 'Request rejected.', { reason }); setRejecting(false); }} />
    </>
  );
}
