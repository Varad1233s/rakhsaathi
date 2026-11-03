import { Typography } from '@mui/material';
import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import type { BloodGroup } from '@/types';
import { fmtDateTime } from '@/utils/format';
import { BloodChip, ErrorBlock, LoadingBlock, PageHeader } from '@/components/common';
import { ResponsiveTable, type Column } from '@/components/ResponsiveTable';

interface Row { id: string; bloodGroup: BloodGroup; change: number; balanceAfter: number; reason: string; createdAt: string }

export default function BankHistory() {
  const { data, loading, error, reload } = useApi(() => api.get<{ logs: Row[] }>('/bloodbank/history'), []);
  const cols: Column<Row>[] = [
    { key: 't', label: 'When', primary: true, render: (r) => fmtDateTime(r.createdAt) },
    { key: 'g', label: 'Group', render: (r) => <BloodChip group={r.bloodGroup} /> },
    { key: 'c', label: 'Change', render: (r) => <Typography fontWeight={700} color={r.change >= 0 ? 'success.main' : 'error.main'}>{r.change > 0 ? '+' : ''}{r.change}</Typography> },
    { key: 'b', label: 'Balance', render: (r) => r.balanceAfter },
    { key: 'r', label: 'Reason', render: (r) => r.reason }
  ];
  return (<><PageHeader title="Inventory history" subtitle="Every stock change is logged" />{error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock /> : <ResponsiveTable columns={cols} rows={data!.logs} emptyTitle="No stock changes yet" />}</>);
}
