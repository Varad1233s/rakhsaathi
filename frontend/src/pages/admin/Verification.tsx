import { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { api, errMsg } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useLiveRefresh } from '@/context/RealtimeContext';
import type { VerificationStatus } from '@/types';
import { fmtDate } from '@/utils/format';
import { ErrorBlock, LoadingBlock, PageHeader, ReasonDialog, VerificationChip } from '@/components/common';
import { ResponsiveTable, type Column } from '@/components/ResponsiveTable';

interface Item { id: string; name: string; city: string; address: string; phone: string; status: VerificationStatus; createdAt: string; lat: number | null; lng: number | null; extra?: string }

/** Shared admin screen for hospital and blood bank verification. */
export default function Verification({ kind }: { kind: 'hospitals' | 'bloodbanks' }) {
  const { enqueueSnackbar } = useSnackbar();
  const [filter, setFilter] = useState<string>('PENDING_VERIFICATION');
  const { data, loading, error, reload, silent } = useApi(async () => {
    if (kind === 'hospitals') {
      const r = await api.get<{ hospitals: (Item & { additionalInfo?: string; submissions: { submittedBy: { name: string; email: string } | null; notes: string | null }[]; _count: { staff: number } })[] }>('/admin/hospitals', filter ? { status: filter } : {});
      return r.hospitals.map((h) => ({ ...h, extra: [h.submissions[0]?.submittedBy ? `Submitted by ${h.submissions[0].submittedBy.name} (${h.submissions[0].submittedBy.email})` : '', h.additionalInfo ?? h.submissions[0]?.notes ?? '', `${h._count.staff} staff`].filter(Boolean).join(' · ') }));
    }
    const r = await api.get<{ bloodBanks: (Item & { user: { name: string; email: string } })[] }>('/admin/bloodbanks');
    return r.bloodBanks.filter((b) => !filter || b.status === filter).map((b) => ({ ...b, extra: `Manager: ${b.user.name} (${b.user.email})` }));
  }, [kind, filter]);
  useLiveRefresh(['notification.created'], () => void silent());
  const [verify, setVerify] = useState<Item | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [reject, setReject] = useState<Item | null>(null);
  const base = `/admin/${kind}`;

  const doVerify = async () => {
    if (!verify) return;
    try {
      const body: { lat?: number; lng?: number } = {};
      if (lat && lng) { body.lat = Number(lat); body.lng = Number(lng); if (Number.isNaN(body.lat) || Number.isNaN(body.lng)) throw new Error('Coordinates must be numbers'); }
      await api.post(`${base}/${verify.id}/verify`, body);
      enqueueSnackbar(`${verify.name} verified`, { variant: 'success' }); setVerify(null); setLat(''); setLng(''); await reload(true);
    } catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); }
  };

  const cols: Column<Item>[] = [
    { key: 'n', label: 'Name', primary: true, render: (i) => <Box><Typography fontWeight={700}>{i.name}</Typography><Typography variant="caption" color="text.secondary">{i.extra}</Typography></Box> },
    { key: 'c', label: 'City', render: (i) => i.city },
    { key: 'a', label: 'Address', hideOnMobile: true, render: (i) => i.address },
    { key: 'p', label: 'Phone', render: (i) => i.phone },
    { key: 'd', label: 'Added', render: (i) => fmtDate(i.createdAt) },
    { key: 's', label: 'Status', render: (i) => <VerificationChip status={i.status} /> },
    { key: 'x', label: 'Actions', render: (i) => (
      <Stack direction="row" gap={1} justifyContent="flex-end">
        {i.status !== 'VERIFIED' && <Button size="small" variant="contained" onClick={() => { setVerify(i); setLat(i.lat?.toString() ?? ''); setLng(i.lng?.toString() ?? ''); }}>Verify</Button>}
        {i.status === 'PENDING_VERIFICATION' && <Button size="small" color="error" variant="outlined" onClick={() => setReject(i)}>Reject</Button>}
      </Stack>) }
  ];
  return (
    <>
      <PageHeader title={kind === 'hospitals' ? 'Hospitals' : 'Blood banks'} subtitle="Nothing is trusted until you verify it" actions={
        <TextField select size="small" label="Status" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">All</MenuItem>{['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((s) => <MenuItem key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</MenuItem>)}
        </TextField>} />
      {error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock /> : <ResponsiveTable columns={cols} rows={data ?? []} emptyTitle="Nothing to review" emptyText="New submissions appear here instantly." />}
      <Dialog open={!!verify} onClose={() => setVerify(null)}>
        <DialogTitle>Verify {verify?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Confirm the details are genuine (call the listed phone, check registration). Optionally set map coordinates so distances and maps work.</Typography>
          <Stack direction="row" gap={2}><TextField label="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" /><TextField label="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" /></Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setVerify(null)}>Cancel</Button><Button variant="contained" onClick={() => void doVerify()}>Verify</Button></DialogActions>
      </Dialog>
      <ReasonDialog open={!!reject} title={`Reject ${reject?.name ?? ''}`} label="Reason" confirmLabel="Reject" onClose={() => setReject(null)}
        onConfirm={async (reason) => { try { await api.post(`${base}/${reject!.id}/reject`, { reason }); enqueueSnackbar('Rejected', { variant: 'info' }); setReject(null); await reload(true); } catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); } }} />
    </>
  );
}
