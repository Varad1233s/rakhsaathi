import { Card, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { bloodLabel } from '@/utils/format';
import { ErrorBlock, LoadingBlock, PageHeader, Responsive, StatCard } from '@/components/common';
import { Activity, CheckCircle2, Clock } from 'lucide-react';

interface A { perDay: { date: string; count: number }[]; demandByGroup: { bloodGroup: string; units: number }[]; donorsByGroup: { bloodGroup: string; count: number }[]; stockByGroup: { bloodGroup: string; units: number }[]; totals: { requests30d: number; fulfilled30d: number; fulfilmentRate: number | null; avgVerifyHours: number | null } }

export default function Analytics() {
  const { data, loading, error, reload } = useApi(() => api.get<A>('/admin/analytics'), []);
  if (error) return <ErrorBlock message={error} onRetry={() => void reload()} />;
  if (loading || !data) return <LoadingBlock />;
  const g = (rows: { bloodGroup: string }[]) => rows.map((r) => bloodLabel(r.bloodGroup));
  return (
    <>
      <PageHeader title="Analytics" subtitle="Last 30 days" />
      <Responsive cols={{ xs: 1, sm: 3 }}>
        <StatCard label="Requests (30d)" value={data.totals.requests30d} icon={<Activity size={22} />} />
        <StatCard label="Fulfilment rate" value={data.totals.fulfilmentRate != null ? `${data.totals.fulfilmentRate}%` : '—'} icon={<CheckCircle2 size={22} />} tone="success" />
        <StatCard label="Avg. time to verify" value={data.totals.avgVerifyHours != null ? `${data.totals.avgVerifyHours} h` : '—'} icon={<Clock size={22} />} tone="info" />
      </Responsive>
      <Responsive cols={{ xs: 1, lg: 2 }} gap={3}>
        <Card sx={{ p: 3, mt: 3 }}><Typography variant="h6">Requests per day</Typography><LineChart height={260} xAxis={[{ scaleType: 'point', data: data.perDay.map((d) => d.date.slice(5)) }]} series={[{ data: data.perDay.map((d) => d.count), color: '#E63950', area: true }]} /></Card>
        <Card sx={{ p: 3, mt: { xs: 0, lg: 3 } }}><Typography variant="h6">Demand by blood group (units)</Typography>{data.demandByGroup.length ? <BarChart height={260} xAxis={[{ scaleType: 'band', data: g(data.demandByGroup) }]} series={[{ data: data.demandByGroup.map((d) => d.units), color: '#E63950' }]} /> : <Typography color="text.secondary">No data yet.</Typography>}</Card>
        <Card sx={{ p: 3 }}><Typography variant="h6">Registered donors by group</Typography>{data.donorsByGroup.length ? <BarChart height={260} xAxis={[{ scaleType: 'band', data: g(data.donorsByGroup) }]} series={[{ data: data.donorsByGroup.map((d) => d.count), color: '#4F7CFF' }]} /> : <Typography color="text.secondary">No donors yet.</Typography>}</Card>
        <Card sx={{ p: 3 }}><Typography variant="h6">Blood bank stock by group</Typography>{data.stockByGroup.length ? <BarChart height={260} xAxis={[{ scaleType: 'band', data: g(data.stockByGroup) }]} series={[{ data: data.stockByGroup.map((d) => d.units), color: '#22A06B' }]} /> : <Typography color="text.secondary">No stock yet.</Typography>}</Card>
      </Responsive>
    </>
  );
}
