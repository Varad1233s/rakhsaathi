import { useState } from 'react';
import { Alert, Card, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useLiveRefresh } from '@/context/RealtimeContext';
import type { RequestView } from '@/types';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader, Responsive } from '@/components/common';
import { MapView, type MapPoint } from '@/components/MapView';
import DonorRequestCard from './DonorRequestCard';

export default function DonorRequests() {
  const [radius, setRadius] = useState(25);
  const { data, loading, error, reload, silent } = useApi(() => api.get<{ requests: RequestView[]; mode: 'GPS' | 'CITY' }>('/donor/requests', { radiusKm: radius }), [radius]);
  useLiveRefresh(['request.verified', 'request.updated', 'request.fulfilled', 'request.expired'], () => void silent());
  const list = data?.requests ?? [];
  const points: MapPoint[] = list.filter((r) => r.hospital.lat != null && r.hospital.lng != null).map((r) => ({ id: r.id, lat: r.hospital.lat!, lng: r.hospital.lng!, label: `${r.hospital.name}`, sub: `${r.units} unit(s) · ${r.approxDistanceKm ?? '?'} km`, kind: 'request' }));
  const cards = list.length === 0 ? <Card><EmptyState title="No open requests match you right now" text="Only hospital-verified requests compatible with your blood group are shown." /></Card> : <Responsive cols={{ xs: 1, md: 2 }}>{list.map((r) => <DonorRequestCard key={r.id} r={r} />)}</Responsive>;
  return (
    <>
      <PageHeader title="Nearby requests" subtitle="Verified requests compatible with your blood group"
        actions={<TextField select size="small" label="Radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))} sx={{ minWidth: 120 }}>{[5, 10, 25, 50, 100].map((k) => <MenuItem key={k} value={k}>{k} km</MenuItem>)}</TextField>} />
      {data?.mode === 'CITY' && <Alert severity="info" sx={{ mb: 2 }}>Location sharing is off, so requests are matched by your city. Turn location on from your dashboard for distance-based matching.</Alert>}
      {error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock /> : (
        <Stack gap={3}>
          {points.length > 0 && <MapView points={points} fallback={null} />}
          <Typography variant="caption" color="text.secondary">Map pins show hospitals, never other people's locations.</Typography>
          {cards}
        </Stack>
      )}
    </>
  );
}
