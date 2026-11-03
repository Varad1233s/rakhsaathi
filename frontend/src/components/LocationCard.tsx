import { Alert, Box, Button, Card, Chip, Stack, Switch, Typography } from '@mui/material';
import { MapPin } from 'lucide-react';
import { useDonorLocation } from '@/hooks/useDonorLocation';
import { isSecure } from '@/services/location';

export function LocationCard({ sharing, onChanged }: { sharing: boolean; onChanged: () => void }) {
  const loc = useDonorLocation(sharing, onChanged);
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return (
    <Card sx={{ p: 2.5 }}>
      <Stack direction="row" gap={2} alignItems="flex-start">
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: 'primary.light', color: 'primary.main', display: 'grid', placeItems: 'center', flexShrink: 0 }}><MapPin size={22} /></Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Typography variant="subtitle1">{loc.sharing ? 'Location sharing is on' : 'Allow location to discover nearby verified blood requests?'}</Typography>
            {loc.sharing && <Switch checked disabled={loc.busy} onChange={() => void loc.turnOff()} inputProps={{ 'aria-label': 'Turn location sharing off' }} />}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {loc.sharing ? 'Requesters and hospitals only ever see an approximate distance (rounded to 0.5 km). Your exact position is never shown.' : 'You can use RaktSaathi without it; requests are then matched by your city. Your exact position is never shown to anyone.'}
          </Typography>
          {!loc.sharing && (
            <Stack direction="row" gap={1} sx={{ mt: 2 }} flexWrap="wrap">
              <Button variant="contained" onClick={() => void loc.start()} disabled={loc.busy || loc.perm === 'unsupported'}>Allow Location</Button>
              <Button variant="text" color="inherit" disabled={loc.busy}>Not Now</Button>
              {loc.perm === 'denied' && <Chip size="small" color="warning" label="Blocked in browser settings" />}
            </Stack>
          )}
          {loc.lastError && <Alert severity="warning" sx={{ mt: 2 }}>{loc.lastError}</Alert>}
          {!isSecure() && <Alert severity="info" sx={{ mt: 2 }}>Location works on HTTPS or localhost only.</Alert>}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Browser limits: position updates only while RaktSaathi is open on your screen. {ios ? 'On iPhone, Safari pauses location as soon as the page is in the background or the screen locks. ' : 'Closed or sleeping tabs stop sending location. '}This is a website, not a background tracking app.
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}
