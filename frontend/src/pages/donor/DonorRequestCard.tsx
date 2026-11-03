import { useNavigate } from 'react-router-dom';
import { Card, Chip, Stack, Typography } from '@mui/material';
import { MapPin } from 'lucide-react';
import type { RequestView } from '@/types';
import { fmtDateTime } from '@/utils/format';
import { BloodChip, UrgencyChip } from '@/components/common';

export default function DonorRequestCard({ r }: { r: RequestView }) {
  const nav = useNavigate();
  return (
    <Card sx={{ p: 2.5, cursor: 'pointer', borderColor: r.urgency === 'CRITICAL' ? 'error.main' : 'divider' }} onClick={() => nav(`/donor/requests/${r.id}`)}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
        <Stack direction="row" gap={1} alignItems="center"><BloodChip group={r.bloodGroup} /><Typography fontWeight={700}>{r.units} unit(s)</Typography></Stack>
        <UrgencyChip urgency={r.urgency} />
      </Stack>
      <Typography fontWeight={600}>{r.hospital.name}</Typography>
      <Typography variant="body2" color="text.secondary">{r.hospital.city} · needed by {fmtDateTime(r.requiredBy)}</Typography>
      <Stack direction="row" gap={1} sx={{ mt: 1.5 }} flexWrap="wrap">
        <Chip size="small" icon={<MapPin size={14} />} variant="outlined" label={r.approxDistanceKm != null ? `≈ ${r.approxDistanceKm} km away` : 'Distance unknown'} />
        {r.myResponse && <Chip size="small" color={r.myResponse.decision === 'ACCEPTED' ? 'success' : 'default'} label={r.myResponse.decision === 'ACCEPTED' ? 'You said yes' : 'You said not now'} />}
      </Stack>
    </Card>
  );
}
