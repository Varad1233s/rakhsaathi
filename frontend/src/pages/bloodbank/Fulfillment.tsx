import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useLiveRefresh } from '@/context/RealtimeContext';
import type { BloodGroup, RequestStatus } from '@/types';
import { fmtDateTime } from '@/utils/format';
import { BloodChip, ErrorBlock, LoadingBlock, PageHeader, StatusChip } from '@/components/common';
import { ResponsiveTable, type Column } from '@/components/ResponsiveTable';

interface Row { id: string; bloodGroup: BloodGroup; units: number; createdAt: string; request: { code: string; status: RequestStatus; units: number; hospital: { name: string; city: string } } }

export default function Fulfillment() {
  const { data, loading, error, reload, silent } = useApi(() => api.get<{ allocations: Row[] }>('/bloodbank/allocations'), []);
  useLiveRefresh(['bloodbank.updated', 'request.fulfilled'], () => void silent());
  const cols: Column<Row>[] = [
    { key: 'c', label: 'Request', primary: true, render: (r) => r.request.code },
    { key: 'g', label: 'Supplied', render: (r) => <span>{r.units} × <BloodChip group={r.bloodGroup} /></span> },
    { key: 'n', label: 'Request size', render: (r) => `${r.request.units} unit(s)` },
    { key: 'h', label: 'Hospital', render: (r) => `${r.request.hospital.name}, ${r.request.hospital.city}` },
    { key: 's', label: 'Request status', render: (r) => <StatusChip status={r.request.status} /> },
    { key: 't', label: 'When', render: (r) => fmtDateTime(r.createdAt) }
  ];
  return (<><PageHeader title="Fulfillment" subtitle="Units you supplied to requests" />{error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock /> : <ResponsiveTable columns={cols} rows={data!.allocations} emptyTitle="No supplies yet" />}</>);
}
