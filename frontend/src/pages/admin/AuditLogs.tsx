import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { fmtDateTime } from '@/utils/format';
import { ErrorBlock, LoadingBlock, PageHeader } from '@/components/common';
import { ResponsiveTable, type Column } from '@/components/ResponsiveTable';

interface L { id: string; action: string; entity: string; entityId: string; createdAt: string; actor: { name: string; role: string } | null }

export default function AuditLogs() {
  const { data, loading, error, reload } = useApi(() => api.get<{ logs: L[] }>('/admin/audit-logs'), []);
  const cols: Column<L>[] = [
    { key: 't', label: 'When', primary: true, render: (l) => fmtDateTime(l.createdAt) },
    { key: 'a', label: 'Action', render: (l) => l.action.replace(/_/g, ' ').toLowerCase() },
    { key: 'e', label: 'Entity', render: (l) => `${l.entity} · ${l.entityId.slice(0, 8)}` },
    { key: 'u', label: 'By', render: (l) => (l.actor ? `${l.actor.name} (${l.actor.role})` : 'System') }
  ];
  return (<><PageHeader title="Audit logs" subtitle="Most recent 300 events" />{error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock /> : <ResponsiveTable columns={cols} rows={data!.logs} emptyTitle="No events yet" />}</>);
}
