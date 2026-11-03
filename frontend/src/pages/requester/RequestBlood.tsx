import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, FormControlLabel, MenuItem, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { api, errMsg } from '@/services/api';
import { BLOOD_GROUPS, type HospitalLite, type RequestView } from '@/types';
import { bloodLabel, toLocalInput } from '@/utils/format';
import { HospitalPicker } from '@/components/HospitalPicker';
import { PageHeader } from '@/components/common';

const schema = z.object({
  who: z.enum(['self', 'other']),
  patientName: z.string().trim().optional(), relationship: z.string().trim().optional(),
  age: z.coerce.number({ invalid_type_error: 'Enter the age' }).int().min(0, 'Enter a valid age').max(120, 'Enter a valid age'),
  bloodGroup: z.enum(BLOOD_GROUPS, { errorMap: () => ({ message: 'Choose the blood group' }) }),
  units: z.coerce.number({ invalid_type_error: 'Enter units' }).int().min(1, 'At least 1 unit').max(20, 'Maximum 20 units'),
  urgency: z.enum(['NORMAL', 'URGENT', 'CRITICAL']),
  requiredBy: z.string().min(1, 'Choose date and time'),
  notes: z.string().trim().max(500).optional()
}).superRefine((v, ctx) => {
  if (v.who === 'other') {
    if (!v.patientName || v.patientName.length < 2) ctx.addIssue({ code: 'custom', path: ['patientName'], message: 'Enter the patient name' });
    if (!v.relationship) ctx.addIssue({ code: 'custom', path: ['relationship'], message: 'Enter your relationship to the patient' });
  }
  if (v.requiredBy && new Date(v.requiredBy).getTime() < Date.now()) ctx.addIssue({ code: 'custom', path: ['requiredBy'], message: 'Choose a time in the future' });
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

export default function RequestBlood() {
  const nav = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [hospital, setHospital] = useState<HospitalLite | null>(null);
  const [hospErr, setHospErr] = useState(false);
  const [dupe, setDupe] = useState<string | null>(null);
  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema) as never, defaultValues: { who: 'self', urgency: 'URGENT', units: 1, requiredBy: toLocalInput(new Date(Date.now() + 6 * 36e5)) }
  });
  const who = watch('who');

  const onSubmit = handleSubmit(async (v) => {
    if (!hospital) { setHospErr(true); return; }
    setHospErr(false);
    try {
      const r = await api.post<{ request: RequestView; duplicateWarning: string | null }>('/requests', {
        forSelf: v.who === 'self',
        patient: { name: v.who === 'other' ? v.patientName : undefined, age: v.age, bloodGroup: v.bloodGroup, relationship: v.who === 'other' ? v.relationship : undefined },
        hospitalId: hospital.id, units: v.units, urgency: v.urgency, requiredBy: new Date(v.requiredBy).toISOString(), notes: v.notes || undefined
      });
      if (r.duplicateWarning) setDupe(r.duplicateWarning);
      enqueueSnackbar('Request sent to the hospital for verification.', { variant: 'success' });
      nav(`/requester/requests/${r.request.id}`);
    } catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); }
  });

  return (
    <>
      <PageHeader title="Request blood" subtitle="The hospital verifies every request before donors are contacted." />
      <Card sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 760 }}>
        <Stack component="form" gap={3} onSubmit={onSubmit} noValidate>
          {dupe && <Alert severity="warning">{dupe}</Alert>}
          <Box>
            <Typography fontWeight={700} sx={{ mb: 0.5 }}>Who are you requesting blood for?</Typography>
            <Controller name="who" control={control} render={({ field }) => (
              <RadioGroup row {...field}><FormControlLabel value="self" control={<Radio />} label="Myself" /><FormControlLabel value="other" control={<Radio />} label="Someone else" /></RadioGroup>
            )} />
          </Box>
          {who === 'other' && (
            <Stack gap={2}>
              <Alert severity="info">The patient does not need a RaktSaathi account. Your name and the patient's name are stored separately.</Alert>
              <TextField label="Patient name" {...register('patientName')} error={!!errors.patientName} helperText={errors.patientName?.message} />
              <TextField label="Your relationship to the patient" placeholder="e.g. Brother" {...register('relationship')} error={!!errors.relationship} helperText={errors.relationship?.message} />
            </Stack>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
            <TextField label="Patient age" type="number" inputMode="numeric" {...register('age')} error={!!errors.age} helperText={errors.age?.message} />
            <Controller name="bloodGroup" control={control} defaultValue={undefined} render={({ field }) => (
              <TextField select label="Patient's blood group" {...field} value={field.value ?? ''} error={!!errors.bloodGroup} helperText={errors.bloodGroup?.message}>
                {BLOOD_GROUPS.map((g) => <MenuItem key={g} value={g}>{bloodLabel(g)}</MenuItem>)}
              </TextField>
            )} />
          </Stack>
          <Box><HospitalPicker value={hospital} onChange={(h) => { setHospital(h); setHospErr(false); }} error={hospErr} helperText={hospErr ? 'Select a verified hospital' : 'Only verified hospitals can be selected.'} /></Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
            <TextField label="Units needed" type="number" inputMode="numeric" {...register('units')} error={!!errors.units} helperText={errors.units?.message} />
            <Controller name="urgency" control={control} render={({ field }) => (
              <TextField select label="Urgency" {...field}><MenuItem value="NORMAL">Normal</MenuItem><MenuItem value="URGENT">Urgent</MenuItem><MenuItem value="CRITICAL">Critical</MenuItem></TextField>
            )} />
          </Stack>
          <TextField label="Needed by" type="datetime-local" slotProps={{ inputLabel: { shrink: true } }} {...register('requiredBy')} error={!!errors.requiredBy} helperText={errors.requiredBy?.message} />
          <TextField label="Notes for the hospital (optional)" multiline minRows={2} {...register('notes')} />
          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send request for verification'}</Button>
        </Stack>
      </Card>
    </>
  );
}
