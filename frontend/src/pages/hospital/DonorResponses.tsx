import { useNavigate } from 'react-router-dom';
import { Button, Chip } from '@mui/material';
import { Phone } from 'lucide-react';
import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useLiveRefresh } from '@/context/RealtimeContext';
import type { DonorResponseView, RequestView } from '@/types';
import { fmtDateTime } from '@/utils/format';
import { BloodChip, ErrorBlock, LoadingBlock, PageHeader, StatusChip } from '@/components/common';
import { ResponsiveTable, type Column } from '@/components/ResponsiveTable';
import { REQUEST_EVENTS } from '../shared/RequestsList';

interface Row extends DonorResponseView { request: RequestView }

export default function HospitalDonorResponses() {
  const nav = useNavigate();
  const { data, loading, error, reload, silent } = useApi(() => api.get<{ requests: RequestView[] }>('/requests'), []);
  useLiveRefresh(REQUEST_EVENTS, () => void silent());
  const rows: Row[] = (data?.requests ?? []).flatMap((r) => (r.donorResponses ?? []).map((d) => ({ ...d, request: r })));
  rows.sort((a, b) => +new Date(b.respondedAt) - +new Date(a.respondedAt));
  const cols: Column<Row>[] = [
    { key: 'd', label: 'Donor', primary: true, render: (r) => r.donorName },
    { key: 'b', label: 'Blood group', render: (r) => <BloodChip group={r.bloodGroup} /> },
    { key: 'r', label: 'Response', render: (r) => <Chip size="small" color={r.decision === 'ACCEPTED' ? 'success' : 'default'} label={r.decision === 'ACCEPTED' ? 'Yes' : 'Not now'} /> },
    { key: 'dist', label: 'Distance', render: (r) => (r.approxDistanceKm != null ? `≈ ${r.approxDistanceKm} km` : '—') },
    { key: 'req', label: 'Request', render: (r) => `${r.request.code} · ${r.request.patient?.name}` },
    { key: 's', label: 'Status', render: (r) => <StatusChip status={r.request.status} /> },
    { key: 't', label: 'Responded', render: (r) => fmtDateTime(r.respondedAt) },
    { key: 'c', label: 'Contact', render: (r) => (r.phone ? <Button size="small" startIcon={<Phone size={14} />} href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()}>Call</Button> : '—') }
  ];
  return (
    <>
      <PageHeader title="Donor responses" subtitle="Willingness only. Medical screening and eligibility are decided by your clinical team." />
      {error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock /> : <ResponsiveTable columns={cols} rows={rows} onRowClick={(r) => nav(`/hospital/requests/${r.request.id}`)} emptyTitle="No donor responses yet" emptyText="Responses appear after you verify a request." />}
    </>
  );
}
