import { useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, FormControlLabel, Link, MenuItem, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { Building2, Droplets, Hospital, UserRound } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { errMsg } from '@/services/api';
import { BLOOD_GROUPS, type HospitalLite } from '@/types';
import { bloodLabel, ROLE_HOME } from '@/utils/format';
import { AuthShell } from './Login';
import { HospitalFields, HospitalPicker } from '@/components/HospitalPicker';

const text = (min: number, msg: string) => z.string().trim().min(min, msg);
const schema = z.object({
  role: z.enum(['REQUESTER', 'DONOR', 'HOSPITAL', 'BLOODBANK']),
  name: text(2, 'Enter your full name'),
  email: z.string().trim().email('Enter a valid email'),
  phone: text(7, 'Enter a valid phone number').max(20),
  password: z.string().min(8, 'At least 8 characters'),
  bloodGroup: z.string().optional(), city: z.string().optional(), dateOfBirth: z.string().optional(),
  hospitalMode: z.enum(['existing', 'new']).default('existing'),
  hn_name: z.string().optional(), hn_address: z.string().optional(), hn_city: z.string().optional(), hn_phone: z.string().optional(), hn_additionalInfo: z.string().optional(),
  bb_name: z.string().optional(), bb_address: z.string().optional(), bb_city: z.string().optional(), bb_phone: z.string().optional()
}).superRefine((v, ctx) => {
  const need = (k: keyof typeof v, msg: string, min = 2) => { const x = v[k]; if (typeof x !== 'string' || x.trim().length < min) ctx.addIssue({ code: 'custom', path: [k], message: msg }); };
  if (v.role === 'DONOR') {
    need('bloodGroup', 'Choose your blood group', 1); need('city', 'Enter your city'); need('dateOfBirth', 'Enter your date of birth', 1);
    if (v.dateOfBirth) { const age = (Date.now() - new Date(v.dateOfBirth).getTime()) / (365.25 * 864e5); if (!(age >= 18)) ctx.addIssue({ code: 'custom', path: ['dateOfBirth'], message: 'Donors must be at least 18' }); }
  }
  if (v.role === 'HOSPITAL' && v.hospitalMode === 'new') { need('hn_name', 'Enter the hospital name', 3); need('hn_address', 'Enter the address', 5); need('hn_city', 'Enter the city'); need('hn_phone', 'Enter a valid phone', 7); }
  if (v.role === 'BLOODBANK') { need('bb_name', 'Enter the blood bank name', 3); need('bb_address', 'Enter the address', 5); need('bb_city', 'Enter the city'); need('bb_phone', 'Enter a valid phone', 7); }
});
type Form = z.infer<typeof schema>;

const ROLES = [
  { v: 'REQUESTER', label: 'Request blood', icon: <UserRound size={22} /> }, { v: 'DONOR', label: 'Donate blood', icon: <Droplets size={22} /> },
  { v: 'HOSPITAL', label: 'Hospital staff', icon: <Hospital size={22} /> }, { v: 'BLOODBANK', label: 'Blood bank', icon: <Building2 size={22} /> }
] as const;

export default function Register() {
  const { user, register: signUp } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [hospital, setHospital] = useState<HospitalLite | null>(null);
  const [hospitalErr, setHospitalErr] = useState(false);
  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { role: 'REQUESTER', hospitalMode: 'existing' } });
  const role = watch('role');
  const mode = watch('hospitalMode');
  if (user && !done) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const onSubmit = handleSubmit(async (v) => {
    setError(null); setHospitalErr(false);
    const payload: Record<string, unknown> = { name: v.name, email: v.email, phone: v.phone, password: v.password, role: v.role };
    if (v.role === 'DONOR') payload.donor = { bloodGroup: v.bloodGroup, city: v.city, dateOfBirth: v.dateOfBirth };
    if (v.role === 'HOSPITAL') {
      if (v.hospitalMode === 'existing') { if (!hospital) { setHospitalErr(true); return; } payload.hospitalId = hospital.id; }
      else payload.newHospital = { name: v.hn_name, address: v.hn_address, city: v.hn_city, phone: v.hn_phone, additionalInfo: v.hn_additionalInfo || undefined };
    }
    if (v.role === 'BLOODBANK') payload.bloodBank = { name: v.bb_name, address: v.bb_address, city: v.bb_city, phone: v.bb_phone };
    try {
      const r = await signUp(payload);
      if (r.pending) setDone(r.message ?? 'Account created. Awaiting approval.'); else nav(ROLE_HOME[r.user!.role], { replace: true });
    } catch (e) { setError(errMsg(e)); }
  });

  if (done) return (
    <AuthShell title="Almost there" subtitle="Your account was created">
      <Stack gap={2}><Alert severity="info">{done}</Alert><Button component={RouterLink} to="/login" variant="contained">Back to sign in</Button></Stack>
    </AuthShell>
  );

  const hospErrors = { name: errors.hn_name, address: errors.hn_address, city: errors.hn_city, phone: errors.hn_phone } as Record<string, { message?: string } | undefined>;
  return (
    <AuthShell title="Create your account" subtitle="Join RaktSaathi in under a minute">
      <Stack component="form" gap={2.5} onSubmit={onSubmit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <Controller name="role" control={control} render={({ field }) => (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 1.25 }}>
            {ROLES.map((r) => (
              <Card key={r.v} onClick={() => field.onChange(r.v)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') field.onChange(r.v); }}
                sx={{ p: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.25, borderColor: field.value === r.v ? 'primary.main' : 'divider', bgcolor: field.value === r.v ? 'primary.light' : '#fff', color: field.value === r.v ? 'primary.dark' : 'text.primary' }}>
                {r.icon}<Typography fontWeight={600} variant="body2">{r.label}</Typography>
              </Card>
            ))}
          </Box>
        )} />
        <TextField label="Full name" autoComplete="name" {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
        <TextField label="Phone" type="tel" autoComplete="tel" inputMode="tel" {...register('phone')} error={!!errors.phone} helperText={errors.phone?.message} />
        <TextField label="Password" type="password" autoComplete="new-password" {...register('password')} error={!!errors.password} helperText={errors.password?.message ?? 'At least 8 characters'} />

        {role === 'DONOR' && (<>
          <Controller name="bloodGroup" control={control} defaultValue="" render={({ field }) => (
            <TextField select label="Blood group" {...field} error={!!errors.bloodGroup} helperText={errors.bloodGroup?.message}>{BLOOD_GROUPS.map((g) => <MenuItem key={g} value={g}>{bloodLabel(g)}</MenuItem>)}</TextField>
          )} />
          <TextField label="City" {...register('city')} error={!!errors.city} helperText={errors.city?.message} />
          <TextField label="Date of birth" type="date" slotProps={{ inputLabel: { shrink: true } }} {...register('dateOfBirth')} error={!!errors.dateOfBirth} helperText={errors.dateOfBirth?.message ?? 'Donors must be 18 or older'} />
        </>)}

        {role === 'HOSPITAL' && (<>
          <Controller name="hospitalMode" control={control} render={({ field }) => (
            <RadioGroup row {...field}><FormControlLabel value="existing" control={<Radio />} label="Join a listed hospital" /><FormControlLabel value="new" control={<Radio />} label="My hospital is not listed" /></RadioGroup>
          )} />
          {mode === 'existing' ? (<>
            <HospitalPicker value={hospital} onChange={setHospital} allowAdd={false} error={hospitalErr} helperText={hospitalErr ? 'Select a hospital' : 'An admin approves staff who join an existing hospital.'} />
          </>) : (<>
            <Alert severity="info">New hospitals start as <b>pending verification</b>. You can sign in, but verifying requests unlocks only after an admin verifies the hospital.</Alert>
            <HospitalFields register={register as never} errors={hospErrors} prefix="hn_" />
          </>)}
        </>)}

        {role === 'BLOODBANK' && (<>
          <Alert severity="info">Blood banks are verified by an admin before they can fulfil requests.</Alert>
          <TextField label="Blood bank name" {...register('bb_name')} error={!!errors.bb_name} helperText={errors.bb_name?.message} />
          <TextField label="Address" {...register('bb_address')} error={!!errors.bb_address} helperText={errors.bb_address?.message} />
          <TextField label="City" {...register('bb_city')} error={!!errors.bb_city} helperText={errors.bb_city?.message} />
          <TextField label="Blood bank phone" type="tel" {...register('bb_phone')} error={!!errors.bb_phone} helperText={errors.bb_phone?.message} />
        </>)}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</Button>
        <Typography variant="body2" textAlign="center">Already registered? <Link component={RouterLink} to="/login" fontWeight={600}>Sign in</Link></Typography>
      </Stack>
    </AuthShell>
  );
}
