import { Alert, Box, Card, Chip, Skeleton, Stack, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, type ChipProps, type SxProps, type Theme } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { Droplet, PackageOpen } from 'lucide-react';
import { STATUS_META, URGENCY_TONE, VERIFICATION_META, bloodLabel } from '@/utils/format';
import type { RequestStatus, Urgency, VerificationStatus } from '@/types';

const toneColor = (t: string): ChipProps['color'] => (t === 'primary' ? 'primary' : (t as ChipProps['color']));

export const StatusChip = ({ status }: { status: RequestStatus }) => (
  <Chip
    size="small"
    label={STATUS_META[status].label}
    color={toneColor(STATUS_META[status].tone)}
    variant={STATUS_META[status].tone === 'default' ? 'outlined' : 'filled'}
    sx={{ fontWeight: 650, borderRadius: '8px' }}
  />
);

export const VerificationChip = ({ status }: { status: VerificationStatus }) => (
  <Chip
    size="small"
    label={VERIFICATION_META[status].label}
    color={toneColor(VERIFICATION_META[status].tone)}
    variant={VERIFICATION_META[status].tone === 'default' ? 'outlined' : 'filled'}
    sx={{ fontWeight: 650, borderRadius: '8px' }}
  />
);

export const UrgencyChip = ({ urgency }: { urgency: Urgency }) => (
  <Chip
    size="small"
    label={urgency[0] + urgency.slice(1).toLowerCase()}
    color={toneColor(URGENCY_TONE[urgency])}
    variant={urgency === 'CRITICAL' ? 'filled' : 'outlined'}
    sx={{
      fontWeight: 700,
      borderRadius: '8px',
      ...(urgency === 'CRITICAL' && {
        boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
        animation: 'radar-pulse 2s infinite'
      })
    }}
  />
);

export const BloodChip = ({ group }: { group?: string | null }) => (
  <Chip
    size="small"
    icon={<Droplet size={13} fill="#E11D48" color="#E11D48" style={{ marginLeft: 6 }} />}
    label={bloodLabel(group)}
    sx={{
      bgcolor: '#FFF1F2',
      color: '#BE123C',
      border: '1px solid rgba(225, 29, 72, 0.25)',
      fontWeight: 800,
      minWidth: 54,
      borderRadius: '8px'
    }}
  />
);

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      gap={2}
      sx={{ mb: 3.5 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 800, letterSpacing: '-0.025em', wordBreak: 'break-word', color: '#0F172A' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: 14, md: 15 } }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Stack direction="row" gap={1.25} flexWrap="wrap">{actions}</Stack>}
    </Stack>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'primary',
  hint
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'info';
  hint?: string;
}) {
  const bgMap = {
    primary: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
    success: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
    warning: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    info: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)'
  };
  const colorMap = {
    primary: '#E11D48',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6'
  };

  return (
    <Card
      sx={{
        p: 2.75,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 12px 24px -6px rgba(15, 23, 42, 0.08)'
        }
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={550} noWrap>
            {label}
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.75, fontWeight: 800, color: '#0F172A' }}>
            {value}
          </Typography>
          {hint && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {hint}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            background: bgMap[tone],
            color: colorMap[tone],
            border: `1px solid ${colorMap[tone]}25`
          }}
        >
          {icon}
        </Box>
      </Stack>
    </Card>
  );
}

export function Responsive({ cols, gap = 2.5, sx, children }: { cols: Record<string, number>; gap?: number; sx?: SxProps<Theme>; children: ReactNode }) {
  const tpl = Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, `repeat(${v}, minmax(0, 1fr))`]));
  return <Box sx={[{ display: 'grid', gap, gridTemplateColumns: tpl }, ...(Array.isArray(sx) ? sx : [sx])]}>{children}</Box>;
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <Stack alignItems="center" textAlign="center" gap={2} sx={{ py: 7, px: 3 }}>
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: 4,
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
          color: '#E11D48',
          border: '1px solid rgba(225, 29, 72, 0.2)'
        }}
      >
        <PackageOpen size={34} />
      </Box>
      <Box sx={{ maxWidth: 440 }}>
        <Typography variant="h6" fontWeight={750} sx={{ color: '#0F172A' }}>{title}</Typography>
        {text && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{text}</Typography>}
      </Box>
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Stack>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <Stack gap={2}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 3 }} />
      ))}
    </Stack>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert
      severity="error"
      sx={{ borderRadius: 3 }}
      action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : undefined}
    >
      {message}
    </Alert>
  );
}

/** Dialog asking for a required text reason (reject / suspend). */
export function ReasonDialog({
  open,
  title,
  label,
  confirmLabel,
  onClose,
  onConfirm
}: {
  open: boolean;
  title: string;
  label: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = reason.trim().length >= 5;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose}>
      <DialogTitle sx={{ fontWeight: 750 }}>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          multiline
          minRows={3}
          label={label}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          helperText="At least 5 characters required"
          sx={{ mt: 1.5 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={busy} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!ok || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm(reason.trim());
              setReason('');
            } finally {
              setBusy(false);
            }
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
