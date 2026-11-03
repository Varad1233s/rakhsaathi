import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Alert, AppBar, Avatar, Badge, BottomNavigation, BottomNavigationAction, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Popover, Stack, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Bell, LogOut, Menu as MenuIcon, MoreHorizontal, Droplet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { NotificationList } from '@/components/NotificationList';
import { NAV, ROLE_LABEL } from './nav';
import { VERIFICATION_META } from '@/utils/format';

const DRAWER = 256;

function Brand() {
  return (
    <Stack direction="row" alignItems="center" gap={1.25}>
      <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg,#E63950,#C9273F)' }}><Droplet size={18} fill="#fff" /></Box>
      <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>RaktSaathi</Typography>
    </Stack>
  );
}

function SideNav({ onPick }: { onPick?: () => void }) {
  const { user } = useAuth();
  const items = NAV[user!.role];
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ px: 1, py: 1.5 }}><Brand /></Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 1.5 }}>{ROLE_LABEL[user!.role]} workspace</Typography>
      <List sx={{ mt: 0.5 }}>
        {items.map((it) => (
          <ListItemButton key={it.to} component={NavLink} to={it.to} onClick={onPick} sx={{ borderRadius: 2.5, mb: 0.5, minHeight: 46, '&.active': { bgcolor: 'primary.light', color: 'primary.dark', '& .MuiListItemIcon-root': { color: 'primary.main' } } }}>
            <ListItemIcon sx={{ minWidth: 38, color: 'text.secondary' }}>{it.icon}</ListItemIcon>
            <ListItemText primary={it.label} slotProps={{ primary: { fontWeight: 600, fontSize: 14.5 } }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

export function DashboardLayout() {
  const { user, me, logout } = useAuth();
  const { unread } = useRealtime();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const nav = useNavigate();
  const loc = useLocation();
  const [more, setMore] = useState(false);
  const [bell, setBell] = useState<HTMLElement | null>(null);
  const [bellSheet, setBellSheet] = useState(false);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  if (!user) return null;
  const items = NAV[user.role];
  const bottom = items.filter((x) => x.bottom).slice(0, 4);
  const activeIdx = bottom.findIndex((b) => loc.pathname.startsWith(b.to));
  const status = user.role === 'HOSPITAL' ? me?.hospital?.status : user.role === 'BLOODBANK' ? me?.bloodBank?.status : undefined;
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {desktop && (
        <Drawer variant="permanent" sx={{ width: DRAWER, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER, borderRight: 1, borderColor: 'divider', bgcolor: '#fff' } }}><SideNav /></Drawer>
      )}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderBottom: 1, borderColor: 'divider', pt: 'env(safe-area-inset-top)' }}>
          <Toolbar sx={{ gap: 1, minHeight: { xs: 56, md: 64 } }}>
            {!desktop && <Brand />}
            <Box sx={{ flexGrow: 1 }} />
            <IconButton aria-label="Notifications" onClick={(e) => (desktop ? setBell(e.currentTarget) : setBellSheet(true))}>
              <Badge badgeContent={unread} color="primary" max={99}><Bell size={22} /></Badge>
            </IconButton>
            <IconButton aria-label="Account menu" onClick={(e) => setMenu(e.currentTarget)}><Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>{initials}</Avatar></IconButton>
            {desktop && <Box sx={{ lineHeight: 1.2 }}><Typography variant="body2" fontWeight={700}>{user.name}</Typography><Typography variant="caption" color="text.secondary">{ROLE_LABEL[user.role]}</Typography></Box>}
          </Toolbar>
        </AppBar>

        <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
          <Box sx={{ px: 2, py: 1 }}><Typography fontWeight={700}>{user.name}</Typography><Typography variant="caption" color="text.secondary">{user.email}</Typography></Box>
          <Divider />
          <MenuItem onClick={() => { setMenu(null); logout(); nav('/login'); }}><LogOut size={16} style={{ marginRight: 8 }} /> Sign out</MenuItem>
        </Menu>
        <Popover open={!!bell} anchorEl={bell} onClose={() => setBell(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { width: 400, maxHeight: 520, borderRadius: 3 } } }}>
          <NotificationList compact onNavigate={() => setBell(null)} />
        </Popover>
        <Drawer anchor="bottom" open={bellSheet} onClose={() => setBellSheet(false)} slotProps={{ paper: { sx: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85dvh', pb: 'env(safe-area-inset-bottom)' } } }}>
          <NotificationList compact onNavigate={() => setBellSheet(false)} />
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, pb: { xs: 'calc(88px + env(safe-area-inset-bottom))', md: 4 }, width: '100%', maxWidth: 1280, mx: 'auto' }}>
          {status && status !== 'VERIFIED' && (
            <Alert severity={status === 'PENDING_VERIFICATION' ? 'warning' : 'error'} sx={{ mb: 3 }}>
              Your {user.role === 'HOSPITAL' ? `hospital (${me?.hospital?.name})` : `blood bank (${me?.bloodBank?.name})`} is <b>{VERIFICATION_META[status].label.toLowerCase()}</b>.
              {status === 'PENDING_VERIFICATION' ? ' An admin must verify it before you can act on requests.' : me?.hospital?.rejectionReason ? ` Reason: ${me.hospital.rejectionReason}` : ''}
            </Alert>
          )}
          <Outlet />
        </Box>

        {!desktop && (
          <Paper elevation={0} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200, borderTop: 1, borderColor: 'divider', pb: 'env(safe-area-inset-bottom)' }}>
            <BottomNavigation showLabels value={more ? 99 : activeIdx >= 0 ? activeIdx : false} onChange={(_, v) => { if (v === 99) setMore(true); else nav(bottom[v].to); }} sx={{ height: 60 }}>
              {bottom.map((b) => <BottomNavigationAction key={b.to} label={b.label} icon={b.icon} sx={{ minWidth: 0, px: 0.5, '&.Mui-selected': { color: 'primary.main' }, '& .MuiBottomNavigationAction-label': { fontSize: 11 } }} />)}
              <BottomNavigationAction value={99} label="More" icon={<MoreHorizontal size={20} />} sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: 11 } }} />
            </BottomNavigation>
          </Paper>
        )}
        <Drawer anchor="left" open={more && !desktop} onClose={() => setMore(false)} slotProps={{ paper: { sx: { width: 'min(300px, 85vw)', pt: 'env(safe-area-inset-top)' } } }}>
          <SideNav onPick={() => setMore(false)} />
        </Drawer>
      </Box>
      {void MenuIcon}
    </Box>
  );
}
