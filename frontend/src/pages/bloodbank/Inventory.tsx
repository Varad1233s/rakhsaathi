import { useState } from 'react';
import { Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { PackagePlus, Trash2 } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { api, errMsg } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { BLOOD_GROUPS, type BloodGroup } from '@/types';
import { bloodLabel } from '@/utils/format';
import { ErrorBlock, LoadingBlock, PageHeader, Responsive } from '@/components/common';

export interface InvRow { bloodGroup: BloodGroup; units: number; lowThreshold: number; low: boolean; expiringSoon: number; expired: number }
type Dlg = { kind: 'adjust' | 'set'; group: BloodGroup } | { kind: 'batch' } | null;

export default function Inventory() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, loading, error, reload } = useApi(() => api.get<{ inventory: InvRow[] }>('/bloodbank/inventory'), []);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [group, setGroup] = useState<BloodGroup>('O_POS');
  const [units, setUnits] = useState('');
  const [reason, setReason] = useState('');
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (d: Dlg) => { setDlg(d); setUnits(''); setReason(''); setExpiry(''); if (d && d.kind !== 'batch') setGroup(d.group); };
  const submit = async () => {
    setBusy(true);
    try {
      const n = Number(units);
      if (!Number.isInteger(n)) throw new Error('Enter a whole number of units');
      if (dlg?.kind === 'batch') {
        if (!expiry) throw new Error('Choose the expiry date');
        await api.post('/bloodbank/batches', { bloodGroup: group, units: n, expiresAt: new Date(expiry).toISOString() });
      } else if (dlg) {
        await api.put(`/bloodbank/inventory/${group}`, { mode: dlg.kind, units: n, reason: reason.trim() });
      }
      enqueueSnackbar('Inventory updated', { variant: 'success' }); setDlg(null); await reload(true);
    } catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); } finally { setBusy(false); }
  };
  const discard = async () => { try { const r = await api.post<{ discarded: number }>('/bloodbank/batches/discard-expired'); enqueueSnackbar(`${r.discarded} expired unit(s) discarded`, { variant: 'info' }); await reload(true); } catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); } };

  return (
    <>
      <PageHeader title="Inventory" subtitle="Live stock for all eight blood groups" actions={<><Button variant="contained" startIcon={<PackagePlus size={18} />} onClick={() => { open({ kind: 'batch' }); }}>Receive batch</Button><Button variant="outlined" color="inherit" startIcon={<Trash2 size={18} />} onClick={() => void discard()}>Discard expired</Button></>} />
      {error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock /> : (
        <Responsive cols={{ xs: 2, sm: 3, lg: 4 }}>
          {data!.inventory.map((i) => (
            <Card key={i.bloodGroup} sx={{ p: 2.5, borderColor: i.low ? 'warning.main' : 'divider' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h5" color="primary.main">{bloodLabel(i.bloodGroup)}</Typography>{i.low && <Chip size="small" color="warning" label="Low" />}</Stack>
              <Typography variant="h3" sx={{ my: 1 }}>{i.units}</Typography>
              <Typography variant="caption" color="text.secondary">units · low below {i.lowThreshold + 1}</Typography>
              {(i.expiringSoon > 0 || i.expired > 0) && <Box sx={{ mt: 1 }}>{i.expired > 0 && <Chip size="small" color="error" label={`${i.expired} expired`} sx={{ mr: 0.5 }} />}{i.expiringSoon > 0 && <Chip size="small" color="warning" variant="outlined" label={`${i.expiringSoon} expiring ≤7d`} />}</Box>}
              <Stack direction="row" gap={1} sx={{ mt: 2 }}><Button size="small" variant="outlined" onClick={() => open({ kind: 'adjust', group: i.bloodGroup })}>Adjust</Button><Button size="small" variant="text" onClick={() => open({ kind: 'set', group: i.bloodGroup })}>Set</Button></Stack>
            </Card>
          ))}
        </Responsive>
      )}
      <Dialog open={!!dlg} onClose={() => (busy ? undefined : setDlg(null))}>
        <DialogTitle>{dlg?.kind === 'batch' ? 'Receive a batch' : dlg?.kind === 'set' ? 'Set stock count' : 'Adjust stock'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            {dlg?.kind === 'batch' && <TextField select label="Blood group" value={group} onChange={(e) => setGroup(e.target.value as BloodGroup)}>{BLOOD_GROUPS.map((g) => <MenuItem key={g} value={g}>{bloodLabel(g)}</MenuItem>)}</TextField>}
            {dlg && dlg.kind !== 'batch' && <Alert severity="info">{bloodLabel(group)} · {dlg.kind === 'adjust' ? 'Use a negative number to remove units.' : 'Sets the total to the number you enter.'}</Alert>}
            <TextField label={dlg?.kind === 'adjust' ? 'Change in units (+/-)' : 'Units'} type="number" inputMode="numeric" value={units} onChange={(e) => setUnits(e.target.value)} />
            {dlg?.kind === 'batch' ? <TextField label="Expiry date" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /> : <TextField label="Reason (recorded in history)" value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setDlg(null)} disabled={busy}>Cancel</Button><Button variant="contained" onClick={() => void submit()} disabled={busy || units === '' || (dlg?.kind !== 'batch' && reason.trim().length < 3)}>Save</Button></DialogActions>
      </Dialog>
    </>
  );
}
