import { useState } from 'react';
import { Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { api, errMsg } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { useLiveRefresh } from '@/context/RealtimeContext';
import type { BloodGroup, RequestView } from '@/types';
import { bloodLabel, fmtDateTime } from '@/utils/format';
import { BloodChip, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Responsive, StatusChip, UrgencyChip } from '@/components/common';
import { REQUEST_EVENTS } from '../shared/RequestsList';

export default function BankRequests() {
  const { me } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { data, loading, error, reload, silent } = useApi(() => api.get<{ requests: RequestView[] }>('/bloodbank/requests'), []);
  useLiveRefresh(REQUEST_EVENTS, () => void silent());
  const [target, setTarget] = useState<RequestView | null>(null);
  const [group, setGroup] = useState<BloodGroup | ''>('');
  const [units, setUnits] = useState('1');
  const [busy, setBusy] = useState(false);
  const verified = me?.bloodBank?.status === 'VERIFIED';

  const submit = async () => {
    if (!target || !group) return;
    setBusy(true);
    try {
      const r = await api.post<{ supplied: number; needed: number; fully: boolean }>(`/bloodbank/requests/${target.id}/fulfill`, { bloodGroup: group, units: Number(units) });
      enqueueSnackbar(r.fully ? 'Request fully supplied. The hospital will complete coordination.' : `Partial supply recorded (${r.supplied}/${r.needed}).`, { variant: 'success' });
      setTarget(null); await reload(true);
    } catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); } finally { setBusy(false); }
  };
  const openDlg = (r: RequestView) => { setTarget(r); setGroup(r.canSupply?.[0]?.bloodGroup ?? ''); setUnits('1'); };
  const sel = target?.canSupply?.find((c) => c.bloodGroup === group);

  return (
    <>
      <PageHeader title="Verified requests" subtitle="Hospital-verified requests that still need units. You can supply part or all of a request." />
      {!verified && <Alert severity="warning" sx={{ mb: 2 }}>Your blood bank must be verified by an admin before you can supply units.</Alert>}
      {error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock /> : (data!.requests.length === 0 ? <Card><EmptyState title="No open requests" text="Verified requests that still need blood appear here live." /></Card> : (
        <Responsive cols={{ xs: 1, md: 2 }}>
          {data!.requests.map((r) => (
            <Card key={r.id} sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}><Typography fontWeight={700}>{r.code}</Typography><UrgencyChip urgency={r.urgency} /></Stack>
              <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 0.5 }}><BloodChip group={r.bloodGroup} /><span>{r.units} unit(s) · remaining <b>{r.remaining}</b></span><StatusChip status={r.status} /></Stack>
              <Typography variant="body2" color="text.secondary">{r.hospital.name}, {r.hospital.city} · by {fmtDateTime(r.requiredBy)}</Typography>
              <LinearProgress variant="determinate" value={Math.min(100, (r.unitsFromBank / r.units) * 100)} sx={{ my: 1.5, height: 8, borderRadius: 4 }} />
              <Box sx={{ mb: 1.5 }}>{(r.canSupply ?? []).length === 0 ? <Typography variant="body2" color="text.secondary">You have no compatible stock.</Typography> : r.canSupply!.map((c) => <Chip key={c.bloodGroup} size="small" variant="outlined" sx={{ mr: 0.5 }} label={`${bloodLabel(c.bloodGroup)}: ${c.available}`} />)}</Box>
              <Button variant="contained" disabled={!verified || (r.canSupply ?? []).length === 0} onClick={() => openDlg(r)}>Supply units</Button>
            </Card>
          ))}
        </Responsive>
      ))}
      <Dialog open={!!target} onClose={() => (busy ? undefined : setTarget(null))}>
        <DialogTitle>Supply {target?.code}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <Alert severity="info">Needs {target?.remaining} more unit(s) of {bloodLabel(target?.bloodGroup)}. Only compatible groups are listed; the hospital still performs its own checks.</Alert>
            <TextField select label="Blood group to supply" value={group} onChange={(e) => setGroup(e.target.value as BloodGroup)}>{(target?.canSupply ?? []).map((c) => <MenuItem key={c.bloodGroup} value={c.bloodGroup}>{bloodLabel(c.bloodGroup)} ({c.available} in stock)</MenuItem>)}</TextField>
            <TextField label="Units" type="number" inputMode="numeric" value={units} onChange={(e) => setUnits(e.target.value)} helperText={sel && target ? `Up to ${Math.min(sel.available, target.remaining ?? 0)}` : undefined} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setTarget(null)} disabled={busy}>Cancel</Button><Button variant="contained" disabled={busy || !group || !(Number(units) >= 1)} onClick={() => void submit()}>Confirm supply</Button></DialogActions>
      </Dialog>
    </>
  );
}
