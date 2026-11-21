import { useState, useEffect } from 'react';
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  Building2,
  CheckCircle2,
  Droplets,
  Eye,
  EyeOff,
  Heart,
  Hospital,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  User,
  UserRound
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { api, errMsg } from '@/services/api';
import { BLOOD_GROUPS, type HospitalLite, type Role } from '@/types';
import { bloodLabel, ROLE_HOME } from '@/utils/format';
import { AuthShell } from './Login';
import { HospitalFields, HospitalPicker } from '@/components/HospitalPicker';

const text = (min: number, msg: string) => z.string().trim().min(min, msg);
const schema = z.object({
  role: z.enum(['REQUESTER', 'DONOR', 'HOSPITAL', 'BLOODBANK']),
  name: text(2, 'Enter your full name'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: text(7, 'Enter a valid phone number').max(20),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  bloodGroup: z.string().optional(),
  city: z.string().optional(),
  dateOfBirth: z.string().optional(),
  hospitalMode: z.enum(['existing', 'new']).default('existing'),
  hn_name: z.string().optional(),
  hn_address: z.string().optional(),
  hn_city: z.string().optional(),
  hn_phone: z.string().optional(),
  hn_additionalInfo: z.string().optional(),
  bb_name: z.string().optional(),
  bb_address: z.string().optional(),
  bb_city: z.string().optional(),
  bb_phone: z.string().optional()
}).superRefine((v, ctx) => {
  const need = (k: keyof typeof v, msg: string, min = 2) => {
    const x = v[k];
    if (typeof x !== 'string' || x.trim().length < min) ctx.addIssue({ code: 'custom', path: [k], message: msg });
  };
  if (v.role === 'DONOR') {
    need('bloodGroup', 'Choose your blood group', 1);
    need('city', 'Enter your city');
    need('dateOfBirth', 'Enter your date of birth', 1);
    if (v.dateOfBirth) {
      const age = (Date.now() - new Date(v.dateOfBirth).getTime()) / (365.25 * 864e5);
      if (!(age >= 18)) ctx.addIssue({ code: 'custom', path: ['dateOfBirth'], message: 'Donors must be at least 18 years old' });
    }
  }
  if (v.role === 'HOSPITAL' && v.hospitalMode === 'new') {
    need('hn_name', 'Enter the hospital name', 3);
    need('hn_address', 'Enter the address', 5);
    need('hn_city', 'Enter the city');
    need('hn_phone', 'Enter a valid phone number', 7);
  }
  if (v.role === 'BLOODBANK') {
    need('bb_name', 'Enter the blood bank name', 3);
    need('bb_address', 'Enter the address', 5);
    need('bb_city', 'Enter the city');
    need('bb_phone', 'Enter a valid phone number', 7);
  }
});
type Form = z.infer<typeof schema>;

const ROLES = [
  { v: 'REQUESTER', label: 'Request Blood', desc: 'Patient or family needing verified help', icon: <UserRound size={22} /> },
  { v: 'DONOR', label: 'Donate Blood', desc: 'Voluntary lifesaver with location privacy', icon: <Droplets size={22} /> },
  { v: 'HOSPITAL', label: 'Hospital Staff', desc: 'Doctors & clinical staff verifying requests', icon: <Hospital size={22} /> },
  { v: 'BLOODBANK', label: 'Blood Bank', desc: 'Licensed blood centres managing batch stock', icon: <Building2 size={22} /> }
] as const;

export default function Register() {
  const [searchParams] = useSearchParams();
  const requestedRole = (searchParams.get('role')?.toUpperCase() || 'REQUESTER') as Role;
  const initialRole = ['REQUESTER', 'DONOR', 'HOSPITAL', 'BLOODBANK'].includes(requestedRole) ? requestedRole : 'REQUESTER';

  const { user, register: signUp } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [hospital, setHospital] = useState<HospitalLite | null>(null);
  const [hospitalErr, setHospitalErr] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [pendingValues, setPendingValues] = useState<Form | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: initialRole as 'REQUESTER' | 'DONOR' | 'HOSPITAL' | 'BLOODBANK',
      hospitalMode: 'existing'
    }
  });

  const role = watch('role');
  const mode = watch('hospitalMode');

  if (user && !done) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const requestOtp = async (email: string) => {
    setSendingOtp(true);
    setOtpError(null);
    try {
      await api.post<{ ok: boolean; message: string }>('/auth/send-otp', { email });
      setCountdown(30);
    } catch (e) {
      setOtpError(errMsg(e));
    } finally {
      setSendingOtp(false);
    }
  };

  // Called when form is validated: opens the OTP dialog and dispatches OTP to Gmail
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    setHospitalErr(false);
    if (v.role === 'HOSPITAL' && v.hospitalMode === 'existing' && !hospital) {
      setHospitalErr(true);
      return;
    }
    setPendingValues(v);
    setOtpCode('');
    setOtpOpen(true);
    await requestOtp(v.email);
  });

  // Called when user submits 6-digit OTP code in the dialog
  const handleVerifyAndRegister = async () => {
    if (!pendingValues) return;
    if (otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit verification code.');
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);

    const v = pendingValues;
    const payload: Record<string, unknown> = {
      name: v.name,
      email: v.email,
      phone: v.phone,
      password: v.password,
      role: v.role,
      otp: otpCode.trim()
    };

    if (v.role === 'DONOR') {
      payload.donor = { bloodGroup: v.bloodGroup, city: v.city, dateOfBirth: v.dateOfBirth };
    }
    if (v.role === 'HOSPITAL') {
      if (v.hospitalMode === 'existing') {
        payload.hospitalId = hospital?.id;
      } else {
        payload.newHospital = {
          name: v.hn_name,
          address: v.hn_address,
          city: v.hn_city,
          phone: v.hn_phone,
          additionalInfo: v.hn_additionalInfo || undefined
        };
      }
    }
    if (v.role === 'BLOODBANK') {
      payload.bloodBank = { name: v.bb_name, address: v.bb_address, city: v.bb_city, phone: v.bb_phone };
    }

    try {
      const r = await signUp(payload);
      setOtpOpen(false);
      if (r.pending) setDone(r.message ?? 'Account created successfully. Awaiting admin approval.');
      else nav(ROLE_HOME[r.user!.role], { replace: true });
    } catch (e) {
      setOtpError(errMsg(e));
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Almost there" subtitle="Your account was created">
        <Stack gap={2.5}>
          <Alert severity="info" sx={{ borderRadius: 2.5 }}>{done}</Alert>
          <Button component={RouterLink} to="/login" variant="contained" size="large" sx={{ borderRadius: 2.5 }}>
            Proceed to Sign In
          </Button>
        </Stack>
      </AuthShell>
    );
  }

  const hospErrors = {
    name: errors.hn_name,
    address: errors.hn_address,
    city: errors.hn_city,
    phone: errors.hn_phone
  } as Record<string, { message?: string } | undefined>;

  return (
    <>
      <AuthShell title="Create your account" subtitle="Join RaktSaathi's verified lifeline network">
        <Stack component="form" gap={2.5} onSubmit={onSubmit} noValidate>
          {error && <Alert severity="error" sx={{ borderRadius: 2.5 }}>{error}</Alert>}

          {/* Role Selector Cards */}
          <Box>
            <Typography variant="caption" fontWeight={750} color="text.secondary" sx={{ display: 'block', mb: 1, letterSpacing: '0.04em' }}>
              SELECT YOUR ROLE:
            </Typography>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))' }, gap: 1.5 }}>
                  {ROLES.map((r) => {
                    const active = field.value === r.v;
                    return (
                      <Card
                        key={r.v}
                        onClick={() => field.onChange(r.v)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') field.onChange(r.v);
                        }}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                          borderRadius: 3,
                          border: '2px solid',
                          borderColor: active ? 'primary.main' : '#E2E8F0',
                          bgcolor: active ? '#FFF1F2' : '#FFFFFF',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: active ? '#FFF1F2' : '#F8FAFC'
                          }
                        }}
                      >
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 2,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: active ? 'primary.main' : '#F1F5F9',
                            color: active ? '#FFFFFF' : '#475569',
                            flexShrink: 0
                          }}
                        >
                          {r.icon}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={750} variant="body2" sx={{ color: active ? '#BE123C' : '#0F172A' }}>
                            {r.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, mt: 0.25 }}>
                            {r.desc}
                          </Typography>
                        </Box>
                      </Card>
                    );
                  })}
                </Box>
              )}
            />
          </Box>

          {/* Basic Information */}
          <Stack gap={2}>
            <TextField
              label="Full name"
              autoComplete="name"
              placeholder="e.g. Dr. Priya Sharma"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <User size={18} color="#94A3B8" />
                    </InputAdornment>
                  )
                }
              }}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <TextField
                label="Email address (Gmail / Email)"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="e.g. priya@gmail.com"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message ?? 'A 6-digit OTP code will be sent to verify this address'}
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
                label="Phone number"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="e.g. 9876543210"
                {...register('phone')}
                error={!!errors.phone}
                helperText={errors.phone?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone size={18} color="#94A3B8" />
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Stack>

            <TextField
              label="Create password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message ?? 'Use at least 8 characters'}
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
          </Stack>

          {/* Donor Specific Details */}
          {role === 'DONOR' && (
            <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#FFF1F2', border: '1px solid rgba(225, 29, 72, 0.2)' }}>
              <Typography variant="subtitle2" fontWeight={800} color="#BE123C" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Heart size={16} fill="#E11D48" /> Donor Profile Details
              </Typography>
              <Stack gap={2}>
                <Controller
                  name="bloodGroup"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField select label="Blood group" {...field} error={!!errors.bloodGroup} helperText={errors.bloodGroup?.message}>
                      {BLOOD_GROUPS.map((g) => (
                        <MenuItem key={g} value={g}>
                          {bloodLabel(g)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                  <TextField label="Current city" placeholder="e.g. Pune, Mumbai, Kolhapur" {...register('city')} error={!!errors.city} helperText={errors.city?.message} />
                  <TextField
                    label="Date of birth"
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    {...register('dateOfBirth')}
                    error={!!errors.dateOfBirth}
                    helperText={errors.dateOfBirth?.message ?? 'Donors must be 18 or older'}
                  />
                </Stack>
              </Stack>
            </Box>
          )}

          {/* Hospital Specific Details */}
          {role === 'HOSPITAL' && (
            <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <Typography variant="subtitle2" fontWeight={800} color="#166534" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Hospital size={16} /> Hospital Affiliation
              </Typography>
              <Controller
                name="hospitalMode"
                control={control}
                render={({ field }) => (
                  <RadioGroup row {...field} sx={{ mb: 2 }}>
                    <FormControlLabel value="existing" control={<Radio color="primary" />} label="Join a listed hospital" />
                    <FormControlLabel value="new" control={<Radio color="primary" />} label="Add unlisted hospital" />
                  </RadioGroup>
                )}
              />
              {mode === 'existing' ? (
                <HospitalPicker
                  value={hospital}
                  onChange={setHospital}
                  allowAdd={false}
                  error={hospitalErr}
                  helperText={hospitalErr ? 'Select an affiliated hospital from the directory' : 'An administrator validates staff requests before authorization.'}
                />
              ) : (
                <>
                  <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                    Newly submitted hospitals start in <strong>pending verification</strong>. You can sign in immediately, while request authorization unlocks upon administrator review.
                  </Alert>
                  <HospitalFields register={register as never} errors={hospErrors} prefix="hn_" />
                </>
              )}
            </Box>
          )}

          {/* Blood Bank Specific Details */}
          {role === 'BLOODBANK' && (
            <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <Typography variant="subtitle2" fontWeight={800} color="#1E40AF" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Building2 size={16} /> Blood Bank Center Details
              </Typography>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                Blood banks require administrative certificate verification before entering active fulfillment and inventory dispatch.
              </Alert>
              <Stack gap={2}>
                <TextField label="Blood bank legal name" placeholder="e.g. Jeevan Rekha Blood Centre" {...register('bb_name')} error={!!errors.bb_name} helperText={errors.bb_name?.message} />
                <TextField label="Facility address" placeholder="Street, landmark, campus" {...register('bb_address')} error={!!errors.bb_address} helperText={errors.bb_address?.message} />
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                  <TextField label="City" placeholder="e.g. Kolhapur" {...register('bb_city')} error={!!errors.bb_city} helperText={errors.bb_city?.message} />
                  <TextField label="Official contact phone" type="tel" placeholder="e.g. 0231-2550000" {...register('bb_phone')} error={!!errors.bb_phone} helperText={errors.bb_phone?.message} />
                </Stack>
              </Stack>
            </Box>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            startIcon={<KeyRound size={18} />}
            sx={{ py: 1.5, fontSize: 16, fontWeight: 750, borderRadius: 2.5 }}
          >
            {isSubmitting ? 'Validating…' : 'Verify Email & Create Account'}
          </Button>

          <Typography variant="body2" textAlign="center" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" fontWeight={750} color="primary.main">
              Sign in
            </Link>
          </Typography>
        </Stack>
      </AuthShell>

      {/* Gmail OTP Verification Dialog */}
      <Dialog
        open={otpOpen}
        onClose={verifyingOtp ? undefined : () => setOtpOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              p: 1.5,
              maxWidth: 440,
              width: '100%'
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, textAlign: 'center' }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              bgcolor: '#FFF1F2',
              color: '#E11D48',
              mx: 'auto',
              mb: 1.5
            }}
          >
            <Mail size={26} />
          </Box>
          <Typography variant="h5" fontWeight={800} color="#0F172A">
            Verify Your Gmail
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
            Enter the 6-digit code sent to <strong>{pendingValues?.email}</strong>
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Stack gap={2.5}>
            {otpError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {otpError}
              </Alert>
            )}

            <Alert severity="info" sx={{ borderRadius: 2 }}>
              A 6-digit verification code has been dispatched to your email address. Please check your inbox (and spam folder) and enter it below.
            </Alert>

            <TextField
              autoFocus
              label="6-Digit OTP"
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              slotProps={{
                htmlInput: {
                  maxLength: 6,
                  style: {
                    textAlign: 'center',
                    letterSpacing: '10px',
                    fontSize: 26,
                    fontWeight: 800,
                    fontFamily: 'monospace'
                  }
                }
              }}
              helperText="Code is valid for 10 minutes"
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Didn't get the code?
              </Typography>
              <Button
                size="small"
                disabled={countdown > 0 || sendingOtp}
                onClick={() => pendingValues && requestOtp(pendingValues.email)}
                startIcon={sendingOtp ? <CircularProgress size={12} /> : <RefreshCw size={12} />}
                sx={{ fontSize: 12, fontWeight: 700 }}
              >
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
          <Button
            onClick={() => setOtpOpen(false)}
            disabled={verifyingOtp}
            color="inherit"
            sx={{ fontWeight: 650, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleVerifyAndRegister}
            disabled={verifyingOtp || otpCode.trim().length !== 6}
            startIcon={verifyingOtp ? <CircularProgress size={16} color="inherit" /> : <CheckCircle2 size={16} />}
            sx={{ fontWeight: 750, px: 3, borderRadius: 2 }}
          >
            {verifyingOtp ? 'Verifying…' : 'Verify & Complete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
