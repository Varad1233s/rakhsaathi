import { Alert, Card, Divider, Stack, Typography } from '@mui/material';
import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { ErrorBlock, LoadingBlock, PageHeader } from '@/components/common';

export default function Settings() {
  const { data, loading, error, reload } = useApi(() => api.get<{ settings: { defaultRadiusKm: number; minDonationIntervalDays: number; environment: string; note: string } }>('/admin/settings'), []);
  if (error) return <ErrorBlock message={error} onRetry={() => void reload()} />;
  if (loading || !data) return <LoadingBlock rows={2} />;
  const s = data.settings;
  const Row = ({ k, v }: { k: string; v: string | number }) => <Stack direction="row" justifyContent="space-between" sx={{ py: 1.5 }}><Typography color="text.secondary">{k}</Typography><Typography fontWeight={700}>{v}</Typography></Stack>;
  return (
    <>
      <PageHeader title="Settings" subtitle="Effective platform configuration (read-only)" />
      <Card sx={{ p: 3, maxWidth: 640 }}>
        <Row k="Donor matching radius" v={`${s.defaultRadiusKm} km`} /><Divider />
        <Row k="Minimum days between donations (outreach filter)" v={`${s.minDonationIntervalDays} days`} /><Divider />
        <Row k="Environment" v={s.environment} />
        <Alert severity="info" sx={{ mt: 2 }}>{s.note} Clinical eligibility is always decided by hospital screening.</Alert>
      </Card>
    </>
  );
}
