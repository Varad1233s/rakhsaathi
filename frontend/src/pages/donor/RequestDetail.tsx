import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { api, errMsg } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useLiveRefresh } from '@/context/RealtimeContext';
import type { RequestView } from '@/types';
import { fmtDateTime } from '@/utils/format';
import { BloodChip, ErrorBlock, LoadingBlock, StatusChip, UrgencyChip } from '@/components/common';
import { MapView } from '@/components/MapView';

export default function DonorRequestDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data, loading, error, reload, silent } = useApi(() => api.get<{ request: RequestView }>(`/donor/requests/${id}`), [id]);
  useLiveRefresh(['request.updated', 'request.fulfilled', 'request.expired'], () => void silent());
  const [confirm, setConfirm] = useState<'ACCEPTED' | 'DECLINED' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading) return <LoadingBlock rows={3} />;
  if (error || !data) return <ErrorBlock message={error ?? 'Not found'} onRetry={() => void reload()} />;
  const r = data.request;
  const open = r.status === 'VERIFIED' || r.status === 'DONOR_ACCEPTED';
  const send = async () => {
    if (!confirm) return;
    setBusy(true);
    try { await api.post(`/donor/requests/${id}/respond`, { response: confirm, note: note || undefined }); enqueueSnackbar(confirm === 'ACCEPTED' ? 'Thank you! The hospital has been notified.' : 'Response saved.', { variant: 'success' }); setConfirm(null); await reload(true); }
    catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); } finally { setBusy(false); }
  };
  return (
    <>
      <Button startIcon={<ArrowLeft size={16} />} onClick={() => nav('/donor/requests')} color="inherit" sx={{ mb: 2 }}>Back</Button>
      <Card sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 760 }}>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}><BloodChip group={r.bloodGroup} /><UrgencyChip urgency={r.urgency} /><StatusChip status={r.status} /></Stack>
        <Typography variant="h5">{r.units} unit(s) of blood needed</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>{r.hospital.name}, {r.hospital.city}</Typography>
        <Stack gap={1.5} sx={{ mb: 3 }}>
          <Stack direction="row" gap={1} alignItems="center"><MapPin size={18} /><span>{r.approxDistanceKm != null ? `≈ ${r.approxDistanceKm} km from you` : 'Distance unavailable (location off)'}</span></Stack>
          <Typography>Needed by <b>{fmtDateTime(r.requiredBy)}</b></Typography>
          <Typography>{r.hospital.address}</Typography>
        </Stack>
        {r.hospital.lat != null && r.hospital.lng != null && <Box sx={{ mb: 3 }}><MapView height={220} points={[{ id: r.hospital.id, lat: r.hospital.lat, lng: r.hospital.lng, label: r.hospital.name, kind: 'hospital' }]} fallback={null} /></Box>}
        <Alert severity="info" sx={{ mb: 3 }}>Patient and requester details stay private. If you say yes, the hospital contacts you to arrange medical screening. Saying yes is not medical approval.</Alert>
        {r.myResponse && <Alert severity={r.myResponse.decision === 'ACCEPTED' ? 'success' : 'info'} sx={{ mb: 3 }}>You responded <b>{r.myResponse.decision === 'ACCEPTED' ? 'yes' : 'not now'}</b> on {fmtDateTime(r.myResponse.at)}.</Alert>}
        {open && r.myResponse?.decision !== 'ACCEPTED' ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <Button variant="contained" size="large" onClick={() => setConfirm('ACCEPTED')}>YES, I CAN HELP</Button>
            {!r.myResponse && <Button variant="outlined" color="inherit" size="large" onClick={() => setConfirm('DECLINED')}>NOT NOW</Button>}
          </Stack>
        ) : !open && <Alert severity="warning">This request is no longer accepting donors.</Alert>}
      </Card>
      <Dialog open={!!confirm} onClose={() => (busy ? undefined : setConfirm(null))}>
        <DialogTitle>{confirm === 'ACCEPTED' ? 'Confirm you can help' : 'Not available right now?'}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>{confirm === 'ACCEPTED' ? 'The hospital and requester will be told you are willing. The hospital will contact you for medical screening.' : 'We will record that you cannot help with this request.'}</Typography>
          <TextField label="Note for the hospital (optional)" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setConfirm(null)} disabled={busy}>Back</Button><Button variant="contained" onClick={() => void send()} disabled={busy}>{confirm === 'ACCEPTED' ? 'Yes, confirm' : 'Confirm'}</Button></DialogActions>
      </Dialog>
    </>
  );
}
