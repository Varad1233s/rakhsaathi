import { useEffect, useState } from 'react';
import { Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { api, errMsg } from '@/services/api';
import type { HospitalLite } from '@/types';
import { VerificationChip } from './common';

export const hospitalSchema = z.object({
  name: z.string().trim().min(3, 'Enter the hospital name'),
  address: z.string().trim().min(5, 'Enter the address'),
  city: z.string().trim().min(2, 'Enter the city'),
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(20),
  additionalInfo: z.string().trim().max(500).optional()
});
export type HospitalForm = z.infer<typeof hospitalSchema>;

export function HospitalFields({ register, errors, prefix = '' }: { register: (n: never) => object; errors: Record<string, { message?: string } | undefined>; prefix?: string }) {
  const f = (n: string) => `${prefix}${n}`;
  const e = (n: string) => errors[n];
  const reg = register as unknown as (n: string) => object;
  return (
    <Stack gap={2}>
      <TextField label="Hospital name" {...reg(f('name'))} error={!!e('name')} helperText={e('name')?.message} />
      <TextField label="Address" {...reg(f('address'))} error={!!e('address')} helperText={e('address')?.message} />
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
        <TextField label="City" {...reg(f('city'))} error={!!e('city')} helperText={e('city')?.message} />
        <TextField label="Phone" type="tel" inputMode="tel" {...reg(f('phone'))} error={!!e('phone')} helperText={e('phone')?.message} />
      </Stack>
      <TextField label="Additional information (optional)" multiline minRows={2} {...reg(f('additionalInfo'))} />
    </Stack>
  );
}

export function AddHospitalDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (h: { id: string; name: string; city: string; status: string }) => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<HospitalForm>({ resolver: zodResolver(hospitalSchema) });
  const submit = handleSubmit(async (v) => {
    try {
      const r = await api.post<{ hospital: { id: string; name: string; city: string; status: string } }>('/hospitals', v);
      enqueueSnackbar('Hospital submitted. It starts as pending until an admin verifies it.', { variant: 'success' });
      reset(); onAdded(r.hospital); onClose();
    } catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); }
  });
  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose}>
      <DialogTitle>Add a hospital</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>New hospitals start as <b>pending verification</b>. Requests can be sent only to verified hospitals.</Typography>
        <HospitalFields register={register as never} errors={errors as never} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={isSubmitting}>Submit hospital</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Searches hospitals live from PostgreSQL. Pending hospitals are visible (with status) but not selectable. */
export function HospitalPicker({ value, onChange, error, helperText, allowAdd = true }: { value: HospitalLite | null; onChange: (h: HospitalLite | null) => void; error?: boolean; helperText?: string; allowAdd?: boolean }) {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<HospitalLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const q = input.trim();
        const r = await api.get<{ hospitals: HospitalLite[] }>('/hospitals', { q });
        let list = r.hospitals;
        if (q && list.length === 0) list = (await api.get<{ hospitals: HospitalLite[] }>('/hospitals', { city: q })).hospitals;
        if (!cancelled) setOptions(list);
      } catch { if (!cancelled) setOptions([]); } finally { if (!cancelled) setLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [input, tick]);

  return (
    <>
      <Autocomplete
        value={value} options={options} loading={loading}
        onChange={(_, v) => onChange(v)} onInputChange={(_, v) => setInput(v)}
        getOptionLabel={(o) => `${o.name}, ${o.city}`} isOptionEqualToValue={(a, b) => a.id === b.id}
        getOptionDisabled={(o) => o.status !== 'VERIFIED'} filterOptions={(x) => x}
        noOptionsText="No hospital found. Use “Add hospital” below."
        renderOption={(props, o) => {
          const { key, ...rest } = props as typeof props & { key: string };
          return (
            <Box component="li" key={key} {...rest} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: 0 }}><Typography fontWeight={600}>{o.name}</Typography><Typography variant="caption" color="text.secondary">{o.city}</Typography></Box>
              <VerificationChip status={o.status} />
            </Box>
          );
        }}
        renderInput={(p) => <TextField {...p} label="Hospital (search by name or city)" error={error} helperText={helperText} slotProps={{ input: { ...p.InputProps, endAdornment: <>{loading ? <CircularProgress size={18} /> : null}{p.InputProps.endAdornment}</> } }} />}
      />
      {allowAdd && <Button size="small" startIcon={<Plus size={16} />} onClick={() => setAdding(true)} sx={{ mt: 1 }}>Hospital not listed? Add hospital</Button>}
      <AddHospitalDialog open={adding} onClose={() => setAdding(false)} onAdded={() => setTick((t) => t + 1)} />
    </>
  );
}
