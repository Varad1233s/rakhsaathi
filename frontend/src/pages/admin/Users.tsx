import { useState } from 'react';
import { Button, MenuItem, Stack, TextField, Chip } from '@mui/material';
import { useSnackbar } from 'notistack';
import { api, errMsg } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { fmtDate } from '@/utils/format';
import { ErrorBlock, LoadingBlock, PageHeader } from '@/components/common';
import { ResponsiveTable, type Column } from '@/components/ResponsiveTable';

interface U { id: string; name: string; email: string; phone: string | null; role: string; status: string; createdAt: string; hospital: { name: string; status: string } | null }

export default function Users() {
  const { enqueueSnackbar } = useSnackbar();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useApi(() => api.get<{ users: U[] }>('/admin/users', { q, role, status }), [q, role, status]);
  const set = async (u: U, s: 'ACTIVE' | 'SUSPENDED') => {
    if (s === 'SUSPENDED' && !window.confirm(`Suspend ${u.name}?`)) return;
    try { await api.patch(`/admin/users/${u.id}/status`, { status: s }); enqueueSnackbar('User updated', { variant: 'success' }); await reload(true); } catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); }
  };
  const cols: Column<U>[] = [
    { key: 'n', label: 'Name', primary: true, render: (u) => u.name },
    { key: 'e', label: 'Email', render: (u) => u.email },
    { key: 'r', label: 'Role', render: (u) => u.role },
    { key: 'h', label: 'Hospital', hideOnMobile: true, render: (u) => u.hospital?.name ?? '—' },
    { key: 's', label: 'Status', render: (u) => <Chip size="small" label={u.status.replace('_', ' ').toLowerCase()} color={u.status === 'ACTIVE' ? 'success' : u.status === 'SUSPENDED' ? 'error' : 'warning'} /> },
    { key: 'c', label: 'Joined', render: (u) => fmtDate(u.createdAt) },
    { key: 'a', label: 'Action', render: (u) => u.role === 'ADMIN' ? '—' : u.status === 'ACTIVE' ? <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); void set(u, 'SUSPENDED'); }}>Suspend</Button> : <Button size="small" onClick={(e) => { e.stopPropagation(); void set(u, 'ACTIVE'); }}>{u.status === 'PENDING_APPROVAL' ? 'Approve' : 'Reactivate'}</Button> }
  ];
  return (
    <>
      <PageHeader title="Users" subtitle="Approve hospital staff and suspend accounts" />
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2} sx={{ mb: 2 }}>
        <TextField placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value)} sx={{ minWidth: 160 }}><MenuItem value="">All</MenuItem>{['REQUESTER', 'DONOR', 'HOSPITAL', 'BLOODBANK', 'ADMIN'].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}</TextField>
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">All</MenuItem>{['ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED'].map((r) => <MenuItem key={r} value={r}>{r.replace('_', ' ')}</MenuItem>)}</TextField>
      </Stack>
      {error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock /> : <ResponsiveTable columns={cols} rows={data!.users} emptyTitle="No users match" />}
    </>
  );
}
