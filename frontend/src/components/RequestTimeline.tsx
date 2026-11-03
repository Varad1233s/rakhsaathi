import { Box, Stack, Typography } from '@mui/material';
import { Check, Circle, X } from 'lucide-react';
import { fmtDateTime, STATUS_META } from '@/utils/format';
import type { RequestStatus } from '@/types';

const STEPS: { key: RequestStatus; action: string; label: string; desc: string }[] = [
  { key: 'PENDING_VERIFICATION', action: 'REQUEST_CREATED', label: 'Request created', desc: 'Sent to the hospital for verification' },
  { key: 'VERIFIED', action: 'REQUEST_VERIFIED', label: 'Hospital verified', desc: 'Nearby compatible donors are notified' },
  { key: 'DONOR_ACCEPTED', action: 'REQUEST_DONOR_ACCEPTED', label: 'Donor said yes', desc: 'A donor is willing; this is not medical approval' },
  { key: 'MEDICAL_COORDINATION', action: 'REQUEST_MEDICAL_COORDINATION', label: 'Medical coordination', desc: 'Hospital screens donors and coordinates supply' },
  { key: 'FULFILLED', action: 'REQUEST_FULFILLED', label: 'Fulfilled', desc: 'Blood requirement completed' }
];
const ORDER: RequestStatus[] = ['PENDING_VERIFICATION', 'VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION', 'FULFILLED'];
const TERMINAL: RequestStatus[] = ['REJECTED', 'CANCELLED', 'EXPIRED'];

export function RequestTimeline({ status, events }: { status: RequestStatus; events: { action: string; at: string }[] }) {
  const terminal = TERMINAL.includes(status);
  const doneIdx = (() => {
    if (terminal) { let max = 0; STEPS.forEach((s, i) => { if (events.some((e) => e.action === s.action)) max = i; }); return max; }
    return ORDER.indexOf(status);
  })();
  const at = (action: string) => events.find((e) => e.action === action)?.at;
  return (
    <Stack>
      {STEPS.map((s, i) => {
        const current = !terminal && i === doneIdx && status !== 'FULFILLED';
        const reached = terminal ? i <= doneIdx : i <= doneIdx;
        return (
          <Stack key={s.key} direction="row" gap={2}>
            <Stack alignItems="center">
              <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, bgcolor: reached && !current ? 'success.main' : current ? 'primary.main' : 'action.hover', color: reached ? '#fff' : 'text.disabled', boxShadow: current ? '0 0 0 4px rgba(230,57,80,0.18)' : 'none' }}>
                {reached && !current ? <Check size={16} /> : <Circle size={10} fill="currentColor" />}
              </Box>
              {(i < STEPS.length - 1 || terminal) && <Box sx={{ width: 2, flexGrow: 1, minHeight: 28, bgcolor: i < doneIdx ? 'success.main' : 'divider' }} />}
            </Stack>
            <Box sx={{ pb: 2.5, minWidth: 0 }}>
              <Typography fontWeight={600} color={reached ? 'text.primary' : 'text.secondary'}>{s.label}</Typography>
              <Typography variant="body2" color="text.secondary">{reached && at(s.action) ? fmtDateTime(at(s.action)) : s.desc}</Typography>
            </Box>
          </Stack>
        );
      })}
      {terminal && (
        <Stack direction="row" gap={2}>
          <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'error.main', color: '#fff', flexShrink: 0 }}><X size={16} /></Box>
          <Box>
            <Typography fontWeight={600}>{STATUS_META[status].label}</Typography>
            <Typography variant="body2" color="text.secondary">{fmtDateTime(at(`REQUEST_${status}`))}</Typography>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
