import { Alert, Box, Card, Chip, Stack, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { AlertTriangle, ClipboardList, Droplets, Hourglass } from 'lucide-react';
import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useLiveRefresh } from '@/context/RealtimeContext';
import type { RequestView } from '@/types';
import { bloodLabel } from '@/utils/format';
import { ErrorBlock, LoadingBlock, PageHeader, Responsive, StatCard } from '@/components/common';
import type { InvRow } from './Inventory';

interface Forecast { bloodGroup: string; stock: number; dailyRate: number; daysOfCover: number | null; level: 'OK' | 'WATCH' | 'LOW' | 'CRITICAL' }
const LEVEL = { OK: 'success', WATCH: 'info', LOW: 'warning', CRITICAL: 'error' } as const;

export default function BankDashboard() {
  const { data, loading, error, reload, silent } = useApi(() => Promise.all([
    api.get<{ inventory: InvRow[] }>('/bloodbank/inventory'), api.get<{ requests: RequestView[] }>('/bloodbank/requests'), api.get<{ method: string; forecast: Forecast[] }>('/ai/forecast')
  ]), []);
  useLiveRefresh(['request.verified', 'bloodbank.updated', 'request.fulfilled'], () => void silent());
  if (error) return <ErrorBlock message={error} onRetry={() => void reload()} />;
  if (loading || !data) return <LoadingBlock />;
  const [inv, reqs, fc] = data;
  const total = inv.inventory.reduce((s, i) => s + i.units, 0);
  return (
    <>
      <PageHeader title="Blood bank dashboard" subtitle="Stock, open requests and shortage outlook" />
      <Stack gap={3}>
        <Responsive cols={{ xs: 2, md: 4 }}>
          <StatCard label="Total units" value={total} icon={<Droplets size={22} />} />
          <StatCard label="Low-stock groups" value={inv.inventory.filter((i) => i.low).length} icon={<AlertTriangle size={22} />} tone="warning" />
          <StatCard label="Expiring ≤ 7 days" value={inv.inventory.reduce((s, i) => s + i.expiringSoon, 0)} icon={<Hourglass size={22} />} tone="info" />
          <StatCard label="Open requests" value={reqs.requests.length} icon={<ClipboardList size={22} />} tone="success" />
        </Responsive>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Stock by blood group</Typography>
          <Box sx={{ width: '100%', overflow: 'hidden' }}>
            <BarChart height={280} xAxis={[{ scaleType: 'band', data: inv.inventory.map((i) => bloodLabel(i.bloodGroup)) }]} series={[{ data: inv.inventory.map((i) => i.units), color: '#E63950', label: 'Units' }]} />
          </Box>
        </Card>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6">Shortage outlook (AI-assisted)</Typography>
          <Typography variant="caption" color="text.secondary">{fc.method}</Typography>
          <Responsive cols={{ xs: 2, sm: 4 }} gap={1.5}>
            {fc.forecast.map((f) => (
              <Box key={f.bloodGroup} sx={{ mt: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between"><b>{bloodLabel(f.bloodGroup)}</b><Chip size="small" color={LEVEL[f.level]} label={f.level} /></Stack>
                <Typography variant="body2" color="text.secondary">{f.stock} in stock · {f.daysOfCover != null ? `${f.daysOfCover} days cover` : 'no recent demand'}</Typography>
              </Box>
            ))}
          </Responsive>
        </Card>
        <Alert severity="info">Allocation compatibility is checked by fixed rules. The hospital performs final compatibility checks.</Alert>
      </Stack>
    </>
  );
}
