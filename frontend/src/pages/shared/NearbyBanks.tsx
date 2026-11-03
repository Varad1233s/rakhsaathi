import { useState } from 'react';
import { Alert, Box, Button, Card, Chip, Stack, Typography } from '@mui/material';
import { Navigation, Phone } from 'lucide-react';
import { api, errMsg } from '@/services/api';
import { explainError, getCurrentPosition } from '@/services/location';
import type { BloodGroup } from '@/types';
import { MapView, type MapPoint } from '@/components/MapView';
import { useApi } from '@/hooks/useApi';
import { EmptyState, LoadingBlock } from '@/components/common';

interface Bank { id: string; name: string; city: string; address: string; phone: string; lat: number | null; lng: number | null; compatibleUnits: number; approxDistanceKm: number | null }

/** Nearby verified blood banks. Your location is requested only when you tap the button, and is not stored. */
export default function NearbyBanks({ bloodGroup }: { bloodGroup: BloodGroup }) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { data, loading, error } = useApi(() => api.get<{ bloodBanks: Bank[] }>('/bloodbanks/nearby', { bloodGroup, ...(pos ?? {}) }), [bloodGroup, pos?.lat, pos?.lng]);
  const locate = async () => { setErr(null); try { setPos(await getCurrentPosition()); } catch (e) { setErr(e instanceof Error && 'code' in e ? explainError(e as GeolocationPositionError) : errMsg(e)); } };
  const banks = data?.bloodBanks ?? [];
  const points: MapPoint[] = [
    ...banks.filter((b) => b.lat != null && b.lng != null).map((b) => ({ id: b.id, lat: b.lat!, lng: b.lng!, label: b.name, sub: `${b.compatibleUnits} compatible unit(s)`, kind: 'bank' as const })),
    ...(pos ? [{ id: 'me', ...pos, label: 'You', kind: 'me' as const }] : [])
  ];
  const list = (
    <Stack gap={1.5}>
      {banks.map((b) => (
        <Card key={b.id} sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" gap={1} flexWrap="wrap">
            <Box sx={{ minWidth: 0 }}><Typography fontWeight={700}>{b.name}</Typography><Typography variant="body2" color="text.secondary">{b.address}, {b.city}</Typography></Box>
            <Stack alignItems="flex-end" gap={0.5}>
              <Chip size="small" color={b.compatibleUnits > 0 ? 'success' : 'default'} label={`${b.compatibleUnits} compatible unit(s)`} />
              {b.approxDistanceKm != null && <Typography variant="caption" color="text.secondary">≈ {b.approxDistanceKm} km away</Typography>}
            </Stack>
          </Stack>
          <Button size="small" startIcon={<Phone size={14} />} href={`tel:${b.phone}`} sx={{ mt: 1 }}>{b.phone}</Button>
        </Card>
      ))}
    </Stack>
  );
  return (
    <Stack gap={2}>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Button variant="outlined" size="small" startIcon={<Navigation size={16} />} onClick={() => void locate()}>{pos ? 'Update my location' : 'Show distances from me'}</Button>
        <Typography variant="caption" color="text.secondary">Optional. Your position is used only for this search and is not saved.</Typography>
      </Stack>
      {err && <Alert severity="warning">{err}</Alert>}
      {error ? <Alert severity="error">{error}</Alert> : loading ? <LoadingBlock rows={2} /> : banks.length === 0 ? <EmptyState title="No verified blood banks yet" text="Verified blood banks will appear here." /> : (
        <>
          <MapView points={points} fallback={null} height={260} />
          {list}
        </>
      )}
    </Stack>
  );
}
