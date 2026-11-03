import { Alert, Box, Card, Chip, Skeleton, Stack, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, type ChipProps } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { PackageOpen } from 'lucide-react';
import { STATUS_META, URGENCY_TONE, VERIFICATION_META, bloodLabel } from '@/utils/format';
import type { RequestStatus, Urgency, VerificationStatus } from '@/types';

const toneColor = (t: string): ChipProps['color'] => (t === 'primary' ? 'primary' : (t as ChipProps['color']));

export const StatusChip = ({ status }: { status: RequestStatus }) => <Chip size="small" label={STATUS_META[status].label} color={toneColor(STATUS_META[status].tone)} variant={STATUS_META[status].tone === 'default' ? 'outlined' : 'filled'} />;
export const VerificationChip = ({ status }: { status: VerificationStatus }) => <Chip size="small" label={VERIFICATION_META[status].label} color={toneColor(VERIFICATION_META[status].tone)} variant={VERIFICATION_META[status].tone === 'default' ? 'outlined' : 'filled'} />;
export const UrgencyChip = ({ urgency }: { urgency: Urgency }) => <Chip size="small" label={urgency[0] + urgency.slice(1).toLowerCase()} color={toneColor(URGENCY_TONE[urgency])} variant="outlined" />;
export const BloodChip = ({ group }: { group?: string | null }) => (
  <Chip size="small" label={bloodLabel(group)} sx={{ bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 700, minWidth: 44 }} />
);

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} sx={{ mb: 3 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" sx={{ fontSize: { xs: 22, md: 28 }, wordBreak: 'break-word' }}>{title}</Typography>
        {subtitle && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" gap={1} flexWrap="wrap">{actions}</Stack>}
    </Stack>
  );
}

export function StatCard({ label, value, icon, tone = 'primary', hint }: { label: string; value: ReactNode; icon: ReactNode; tone?: 'primary' | 'success' | 'warning' | 'info'; hint?: string }) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
          <Typography variant="h4" sx={{ mt: 0.5 }}>{value}</Typography>
          {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
        </Box>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'grid', placeItems: 'center', flexShrink: 0, bgcolor: tone === 'primary' ? 'primary.light' : `${tone}.main`, color: tone === 'primary' ? 'primary.main' : '#fff', opacity: tone === 'primary' ? 1 : 0.92 }}>{icon}</Box>
      </Stack>
    </Card>
  );
}

export function Responsive({ cols, gap = 2, children }: { cols: Record<string, number>; gap?: number; children: ReactNode }) {
  const tpl = Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, `repeat(${v}, minmax(0, 1fr))`]));
  return <Box sx={{ display: 'grid', gap, gridTemplateColumns: tpl }}>{children}</Box>;
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <Stack alignItems="center" textAlign="center" gap={1.5} sx={{ py: 6, px: 2 }}>
      <Box sx={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.main' }}><PackageOpen size={28} /></Box>
      <Typography variant="h6">{title}</Typography>
      {text && <Typography color="text.secondary" sx={{ maxWidth: 420 }}>{text}</Typography>}
      {action}
    </Stack>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return <Stack gap={1.5}>{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} variant="rounded" height={72} />)}</Stack>;
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <Alert severity="error" action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : undefined}>{message}</Alert>;
}

/** Dialog asking for a required text reason (reject / suspend). */
export function ReasonDialog({ open, title, label, confirmLabel, onClose, onConfirm }: { open: boolean; title: string; label: string; confirmLabel: string; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = reason.trim().length >= 5;
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField autoFocus multiline minRows={3} label={label} value={reason} onChange={(e) => setReason(e.target.value)} helperText="At least 5 characters" sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" color="primary" disabled={!ok || busy} onClick={async () => { setBusy(true); try { await onConfirm(reason.trim()); setReason(''); } finally { setBusy(false); } }}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
