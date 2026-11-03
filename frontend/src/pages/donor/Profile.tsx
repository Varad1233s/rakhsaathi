import { useEffect, useState } from 'react';
import { Alert, Button, Card, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { api, errMsg } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { bloodLabel } from '@/utils/format';
import { ErrorBlock, LoadingBlock, PageHeader } from '@/components/common';

interface P { name: string; email: string; phone: string | null; bloodGroup: string; city: string; available: boolean; lastDonationDate: string | null }

export default function DonorProfile() {
  const { enqueueSnackbar } = useSnackbar();
  const { refresh } = useAuth();
  const { data, loading, error, reload } = useApi(() => api.get<{ profile: P }>('/donor/profile'), []);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [last, setLast] = useState('');
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) { setPhone(data.profile.phone ?? ''); setCity(data.profile.city); setLast(data.profile.lastDonationDate?.slice(0, 10) ?? ''); setAvailable(data.profile.available); } }, [data]);
  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? 'Failed'} onRetry={() => void reload()} />;
  const save = async () => {
    setBusy(true);
    try { await api.put('/donor/profile', { phone: phone.trim().length >= 7 ? phone.trim() : undefined, city, available, lastDonationDate: last || null }); await refresh(); enqueueSnackbar('Profile saved', { variant: 'success' }); }
    catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Profile" subtitle={`${data.profile.name} · ${data.profile.email} · Blood group ${bloodLabel(data.profile.bloodGroup)}`} />
      <Card sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 640 }}>
        <Stack gap={2.5}>
          <TextField label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <TextField label="Last donation date (optional)" type="date" value={last} onChange={(e) => setLast(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} helperText="Used only to avoid notifying you too soon. The hospital makes the final eligibility decision." />
          <FormControlLabel control={<Switch checked={available} onChange={(_, v) => setAvailable(v)} />} label="Available to receive requests" />
          <Alert severity="info">Blood group cannot be changed here. Contact support if it was entered incorrectly.</Alert>
          <Button variant="contained" onClick={() => void save()} disabled={busy}>Save changes</Button>
          <Typography variant="caption" color="text.secondary">Location sharing is controlled from your dashboard.</Typography>
        </Stack>
      </Card>
    </>
  );
}
