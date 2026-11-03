import { Link as RouterLink, Navigate } from 'react-router-dom';
import { Box, Button, Card, Container, Stack, Typography } from '@mui/material';
import { Activity, BellRing, Building2, Droplet, Hospital, MapPin, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_HOME } from '@/utils/format';
import { Responsive } from '@/components/common';

const features = [
  { icon: <ShieldCheck />, title: 'Hospital-verified requests', text: 'Every request is checked by the hospital before any donor is contacted, so alerts are trustworthy.' },
  { icon: <MapPin />, title: 'Nearby donors, private location', text: 'Donors choose whether to share location. Everyone else only sees an approximate distance.' },
  { icon: <BellRing />, title: 'Live updates', text: 'Requesters, hospitals and donors see status changes instantly, without refreshing.' },
  { icon: <Building2 />, title: 'Blood bank inventory', text: 'Blood banks manage stock and expiry and can supply part or all of a request.' },
  { icon: <Hospital />, title: 'Any hospital, properly verified', text: 'Cannot find your hospital? Add it. An admin verifies it before it can verify requests.' },
  { icon: <Activity />, title: 'Operational insight', text: 'Duplicate-request flags, shortage forecasts and summaries help teams act faster.' }
];
const steps = ['Requester creates a request for themselves or someone else', 'Hospital verifies the request', 'Nearby compatible donors are notified', 'Donor says yes or not now', 'Hospital coordinates medical screening', 'Blood bank can contribute stock until fulfilled'];

export default function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return (
    <Box sx={{ minHeight: '100vh', pt: 'env(safe-area-inset-top)' }}>
      <Container maxWidth="lg">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 2 }}>
          <Stack direction="row" gap={1.25} alignItems="center">
            <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg,#E63950,#C9273F)' }}><Droplet size={20} fill="#fff" /></Box>
            <Typography variant="h6" fontWeight={800}>RaktSaathi</Typography>
          </Stack>
          <Stack direction="row" gap={1}>
            <Button component={RouterLink} to="/login">Sign in</Button>
            <Button component={RouterLink} to="/register" variant="contained">Get started</Button>
          </Stack>
        </Stack>
      </Container>

      <Box sx={{ background: 'linear-gradient(180deg,#FFF0F2 0%,#F7F8FA 100%)' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Stack gap={3} sx={{ maxWidth: 760 }}>
            <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 56 }, lineHeight: 1.08 }}>Find verified blood help, <Box component="span" sx={{ color: 'primary.main' }}>faster.</Box></Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={400}>RaktSaathi connects patients' families, hospitals, donors and blood banks in one trusted workflow, with verification at every step.</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
              <Button component={RouterLink} to="/register" size="large" variant="contained" startIcon={<UserRound size={18} />}>Request or donate blood</Button>
              <Button component={RouterLink} to="/login" size="large" variant="outlined" color="inherit">I already have an account</Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">RaktSaathi coordinates people and stock. Medical screening, compatibility checks and transfusion decisions always stay with hospital clinicians.</Typography>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Typography variant="h4" sx={{ mb: 3 }}>Built for every role</Typography>
        <Responsive cols={{ xs: 1, sm: 2, md: 3 }} gap={2.5}>
          {features.map((f) => (
            <Card key={f.title} sx={{ p: 3 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.main', mb: 2 }}>{f.icon}</Box>
              <Typography variant="h6" sx={{ mb: 0.75 }}>{f.title}</Typography>
              <Typography color="text.secondary">{f.text}</Typography>
            </Card>
          ))}
        </Responsive>
      </Container>

      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 10 } }}>
        <Card sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h4" sx={{ mb: 3 }}>How a request moves</Typography>
          <Responsive cols={{ xs: 1, md: 3 }} gap={2.5}>
            {steps.map((s, i) => (
              <Stack key={s} direction="row" gap={2} alignItems="flex-start">
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0 }}>{i + 1}</Box>
                <Typography sx={{ pt: 0.5 }}>{s}</Typography>
              </Stack>
            ))}
          </Responsive>
        </Card>
      </Container>

      <Box sx={{ borderTop: 1, borderColor: 'divider', py: 3, pb: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <Container maxWidth="lg"><Typography variant="caption" color="text.secondary">© {new Date().getFullYear()} RaktSaathi. UI patterns adapted from SaasAble UI (MIT, © Phoenixcoded). See THIRD_PARTY_LICENSES.md.</Typography></Container>
      </Box>
    </Box>
  );
}
