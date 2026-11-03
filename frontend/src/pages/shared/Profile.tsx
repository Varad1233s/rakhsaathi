import { Alert, Avatar, Box, Card, Divider, Stack, Typography } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, VerificationChip } from '@/components/common';
import { ROLE_LABEL } from '@/layouts/nav';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <Stack direction="row" justifyContent="space-between" gap={2} sx={{ py: 1.25 }}><Typography color="text.secondary">{label}</Typography><Typography fontWeight={600} sx={{ textAlign: 'right', wordBreak: 'break-word' }}>{value}</Typography></Stack>;
}

export default function Profile() {
  const { me } = useAuth();
  if (!me) return null;
  const u = me.user;
  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details" />
      <Stack gap={3} sx={{ maxWidth: 720 }}>
        <Card sx={{ p: 3 }}>
          <Stack direction="row" gap={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>{u.name[0]}</Avatar>
            <Box><Typography variant="h6">{u.name}</Typography><Typography color="text.secondary">{ROLE_LABEL[u.role]}</Typography></Box>
          </Stack>
          <Divider />
          <Row label="Email" value={u.email} /><Divider />
          <Row label="Phone" value={u.phone ?? '—'} />
        </Card>
        {me.hospital && (
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Hospital</Typography>
            <Row label="Name" value={me.hospital.name} /><Divider />
            <Row label="City" value={me.hospital.city} /><Divider />
            <Row label="Verification" value={<VerificationChip status={me.hospital.status} />} />
            {me.hospital.status !== 'VERIFIED' && <Alert severity="warning" sx={{ mt: 2 }}>Requests can be verified only after an admin verifies your hospital.</Alert>}
          </Card>
        )}
        {me.bloodBank && (
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Blood bank</Typography>
            <Row label="Name" value={me.bloodBank.name} /><Divider />
            <Row label="City" value={me.bloodBank.city} /><Divider />
            <Row label="Verification" value={<VerificationChip status={me.bloodBank.status} />} />
          </Card>
        )}
      </Stack>
    </>
  );
}
