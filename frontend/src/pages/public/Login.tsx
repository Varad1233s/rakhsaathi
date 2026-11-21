import { useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  ArrowLeft,
  CheckCircle2,
  Droplet,
  Eye,
  EyeOff,
  Heart,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { errMsg } from '@/services/api';
import { ROLE_HOME } from '@/utils/format';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password')
});
type Form = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { role: 'Requester', email: 'requester@demo.local', pass: 'Demo@12345' },
  { role: 'Donor (O+)', email: 'arjun@demo.local', pass: 'Demo@12345' },
  { role: 'Hospital', email: 'hospital@demo.local', pass: 'Demo@12345' },
  { role: 'Blood Bank', email: 'bank@demo.local', pass: 'Demo@12345' }
];

export function AuthShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #FFF1F2 0%, #F8FAFC 60%)',
        py: { xs: 3, md: 6 },
        px: { xs: 2, sm: 3 }
      }}
    >
      <Container maxWidth="lg" disableGutters>
        <Card
          sx={{
            overflow: 'hidden',
            borderRadius: { xs: 4, md: 5 },
            border: '1px solid rgba(225, 29, 72, 0.15)',
            boxShadow: '0 25px 60px -15px rgba(225, 29, 72, 0.12), 0 10px 25px -5px rgba(15, 23, 42, 0.04)',
            bgcolor: '#FFFFFF'
          }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.25fr' } }}>
            {/* Left Side: Brand Showcase Banner */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #E11D48 0%, #9F1239 100%)',
                color: '#FFFFFF',
                p: { xs: 4, md: 5 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Subtle background glow circle */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -80,
                  right: -80,
                  width: 260,
                  height: 260,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
                  pointerEvents: 'none'
                }}
              />

              <Box sx={{ position: 'relative', zIndex: 1 }}>
                {/* Back Link & Brand Logo */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                  <Button
                    component={RouterLink}
                    to="/"
                    startIcon={<ArrowLeft size={16} />}
                    sx={{
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: 13,
                      p: 0,
                      minHeight: 0,
                      '&:hover': { color: '#FFFFFF', background: 'transparent' }
                    }}
                  >
                    Back to Home
                  </Button>
                  <Chip
                    size="small"
                    label="VERIFIED GRID"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.18)',
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: 800,
                      height: 22
                    }}
                  />
                </Stack>

                <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 3,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: '#FFFFFF',
                      color: '#E11D48',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  >
                    <Droplet size={24} fill="#E11D48" />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={850} sx={{ color: '#FFFFFF', lineHeight: 1.1 }}>
                      RaktSaathi
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                      Emergency Blood Coordination
                    </Typography>
                  </Box>
                </Stack>

                <Typography variant="h4" fontWeight={800} sx={{ color: '#FFFFFF', mt: 3, mb: 1.5, fontSize: { xs: 24, md: 30 }, lineHeight: 1.2 }}>
                  Every drop holds a life.
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, mb: 4 }}>
                  Connecting verified patient distress calls directly to attending hospital desks, compatible nearby voluntary donors, and licensed blood banks in real time.
                </Typography>

                {/* Key Benefits */}
                <Stack gap={1.5}>
                  <Stack direction="row" alignItems="center" gap={1.25}>
                    <CheckCircle2 size={18} color="#A7F3D0" />
                    <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                      100% Hospital Clinical Verification
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1.25}>
                    <Lock size={18} color="#BAE6FD" />
                    <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                      Zero Raw GPS Leaks (Privacy Preserved)
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1.25}>
                    <Sparkles size={18} color="#FDE68A" />
                    <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                      Real-Time Live Socket Updates
                    </Typography>
                  </Stack>
                </Stack>
              </Box>

              {/* Bottom Trust Badge */}
              <Box
                sx={{
                  mt: 4,
                  pt: 2.5,
                  borderTop: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5
                }}
              >
                <ShieldCheck size={20} color="#FFFFFF" />
                <Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600, display: 'block' }}>
                    VERIFIED HEALTHCARE NETWORK
                  </Typography>
                  <Typography variant="body2" fontWeight={800} color="#FFFFFF">
                    Hospital Authenticated & Privacy-First
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Right Side: Form Container */}
            <Box sx={{ p: { xs: 3, sm: 5, md: 6 } }}>
              <Box sx={{ mb: 3.5 }}>
                <Typography variant="h4" fontWeight={850} color="#0F172A" sx={{ fontSize: { xs: 24, md: 30 } }}>
                  {title}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: 14, md: 15 } }}>
                  {subtitle}
                </Typography>
              </Box>

              {children}
            </Box>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<Form>({ resolver: zodResolver(schema) });

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const fillDemo = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const u = await login(v.email, v.password);
      nav(ROLE_HOME[u.role], { replace: true });
    } catch (e) {
      setError(errMsg(e));
    }
  });

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your RaktSaathi workspace">
      <Stack component="form" gap={2.5} onSubmit={onSubmit} noValidate>
        {error && <Alert severity="error" sx={{ borderRadius: 2.5 }}>{error}</Alert>}

        {/* Demo Fast-Login Selector for evaluators & guests */}
        <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
            <Sparkles size={14} color="#E11D48" />
            <Typography variant="caption" fontWeight={750} color="#0F172A">
              QUICK DEMO ACCOUNTS (1-CLICK FILL):
            </Typography>
          </Stack>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <Chip
                key={acc.role}
                size="small"
                label={acc.role}
                onClick={() => fillDemo(acc.email, acc.pass)}
                sx={{
                  fontWeight: 650,
                  fontSize: 12,
                  bgcolor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#FFF1F2', borderColor: '#E11D48', color: '#BE123C' }
                }}
              />
            ))}
          </Box>
        </Box>

        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="e.g. name@example.com"
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Mail size={18} color="#94A3B8" />
                </InputAdornment>
              )
            }
          }}
        />

        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          {...register('password')}
          error={!!errors.password}
          helperText={errors.password?.message}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Lock size={18} color="#94A3B8" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
          sx={{ py: 1.5, fontSize: 16, fontWeight: 750, borderRadius: 2.5 }}
        >
          {isSubmitting ? 'Verifying credentials…' : 'Sign In'}
        </Button>

        <Typography variant="body2" textAlign="center" color="text.secondary">
          Don't have an account yet?{' '}
          <Link component={RouterLink} to="/register" fontWeight={750} color="primary.main">
            Create an account
          </Link>
        </Typography>
      </Stack>
    </AuthShell>
  );
}
