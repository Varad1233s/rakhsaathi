import { useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, Container, Link, Stack, TextField, Typography } from '@mui/material';
import { Droplet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { errMsg } from '@/services/api';
import { ROLE_HOME } from '@/utils/format';

const schema = z.object({ email: z.string().trim().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') });
type Form = z.infer<typeof schema>;

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', alignItems: 'center', background: 'linear-gradient(180deg,#FFF0F2 0%,#F7F8FA 60%)', py: 3, pt: 'calc(24px + env(safe-area-inset-top))', pb: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <Container maxWidth="sm">
        <Stack alignItems="center" gap={1} sx={{ mb: 3 }}>
          <Box component={RouterLink} to="/" sx={{ width: 48, height: 48, borderRadius: 3, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg,#E63950,#C9273F)' }}><Droplet size={26} fill="#fff" /></Box>
          <Typography variant="h4">{title}</Typography>
          <Typography color="text.secondary" textAlign="center">{subtitle}</Typography>
        </Stack>
        <Card sx={{ p: { xs: 2.5, sm: 4 } }}>{children}</Card>
      </Container>
    </Box>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try { const u = await login(v.email, v.password); nav(ROLE_HOME[u.role], { replace: true }); } catch (e) { setError(errMsg(e)); }
  });
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to RaktSaathi">
      <Stack component="form" gap={2.5} onSubmit={onSubmit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
        <TextField label="Password" type="password" autoComplete="current-password" {...register('password')} error={!!errors.password} helperText={errors.password?.message} />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
        <Typography variant="body2" textAlign="center">New here? <Link component={RouterLink} to="/register" fontWeight={600}>Create an account</Link></Typography>
      </Stack>
    </AuthShell>
  );
}
