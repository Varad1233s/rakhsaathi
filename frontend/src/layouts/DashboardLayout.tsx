import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Avatar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Bell,
  LogOut,
  Menu as MenuIcon,
  MoreHorizontal,
  Droplet,
  ShieldCheck,
  User
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { NotificationList } from '@/components/NotificationList';
import { NAV, ROLE_LABEL } from './nav';
import { VERIFICATION_META } from '@/utils/format';

const DRAWER = 264;

function Brand() {
  return (
    <Stack direction="row" alignItems="center" gap={1.25}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          color: '#FFFFFF',
          background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
          boxShadow: '0 4px 12px rgba(225, 29, 72, 0.35)'
        }}
      >
        <Droplet size={19} fill="#FFFFFF" />
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 850, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#0F172A' }}>
          RaktSaathi
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10.5, fontWeight: 650 }}>
          LIFELINE NETWORK
        </Typography>
      </Box>
    </Stack>
  );
}

function SideNav({ onPick }: { onPick?: () => void }) {
  const { user } = useAuth();
  const items = NAV[user!.role];

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 1, py: 1 }}><Brand /></Box>

      <Box sx={{ px: 1, mt: 2, mb: 1.5 }}>
        <Chip
          size="small"
          label={`${ROLE_LABEL[user!.role]} Portal`}
          sx={{
            fontWeight: 750,
            fontSize: 11,
            bgcolor: '#FFF1F2',
            color: '#BE123C',
            border: '1px solid rgba(225,29,72,0.2)'
          }}
        />
      </Box>

      <List sx={{ mt: 0.5, flexGrow: 1 }}>
        {items.map((it) => (
          <ListItemButton
            key={it.to}
            component={NavLink}
            to={it.to}
            onClick={onPick}
            sx={{
              borderRadius: 3,
              mb: 0.75,
              minHeight: 46,
              px: 2,
              transition: 'all 0.2s ease',
              '&.active': {
                bgcolor: '#FFF1F2',
                color: '#BE123C',
                fontWeight: 750,
                '& .MuiListItemIcon-root': { color: '#E11D48' },
                borderLeft: '4px solid #E11D48'
              },
              '&:hover:not(.active)': {
                bgcolor: '#F8FAFC'
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: '#64748B' }}>{it.icon}</ListItemIcon>
            <ListItemText primary={it.label} slotProps={{ primary: { fontWeight: 650, fontSize: 14 } }} />
          </ListItemButton>
        ))}
      </List>

      {/* Network status mini-card in sidebar */}
      <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', mt: 'auto' }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
          <ShieldCheck size={16} color="#E11D48" />
          <Typography variant="caption" fontWeight={750} color="#0F172A">
            RaktSaathi Network
          </Typography>
        </Stack>
        <Typography variant="body2" fontWeight={800} color="#E11D48">
          Verified Active Grid
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Real-time Hospital Dispatch
        </Typography>
      </Box>
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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      {desktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER,
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: '#FFFFFF'
            }
          }}
        >
          <SideNav />
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Sticky Glass Top Navigation Bar */}
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid',
            borderColor: 'divider',
            pt: 'env(safe-area-inset-top)',
            zIndex: 1100
          }}
        >
          <Toolbar sx={{ gap: 1.5, minHeight: { xs: 58, md: 68 }, px: { xs: 2, md: 3.5 } }}>
            {!desktop && <Brand />}

            <Box sx={{ flexGrow: 1 }} />

            {/* Notification Bell */}
            <IconButton
              aria-label="Notifications"
              onClick={(e) => (desktop ? setBell(e.currentTarget) : setBellSheet(true))}
              sx={{
                bgcolor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                '&:hover': { bgcolor: '#FFF1F2', borderColor: '#E11D48' }
              }}
            >
              <Badge badgeContent={unread} color="primary" max={99}>
                <Bell size={20} color="#334155" />
              </Badge>
            </IconButton>

            {/* Profile Avatar Trigger */}
            <IconButton
              aria-label="Account menu"
              onClick={(e) => setMenu(e.currentTarget)}
              sx={{ p: 0.5 }}
            >
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                  fontSize: 14,
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(225, 29, 72, 0.3)'
                }}
              >
                {initials}
              </Avatar>
            </IconButton>

            {desktop && (
              <Box sx={{ lineHeight: 1.2 }}>
                <Typography variant="body2" fontWeight={750} color="#0F172A">
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {ROLE_LABEL[user.role]}
                </Typography>
              </Box>
            )}
          </Toolbar>
        </AppBar>

        {/* Profile Dropdown Menu */}
        <Menu
          anchorEl={menu}
          open={!!menu}
          onClose={() => setMenu(null)}
          slotProps={{ paper: { sx: { width: 220, borderRadius: 3, p: 0.5 } } }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography fontWeight={750} color="#0F172A">{user.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-all' }}>
              {user.email}
            </Typography>
            <Chip size="small" label={ROLE_LABEL[user.role]} sx={{ mt: 1, fontSize: 11, fontWeight: 700 }} />
          </Box>
          <Divider />
          <MenuItem onClick={() => { setMenu(null); logout(); nav('/login'); }} sx={{ color: 'error.main', borderRadius: 2, my: 0.5 }}>
            <LogOut size={16} style={{ marginRight: 10 }} /> Sign out
          </MenuItem>
        </Menu>

        {/* Desktop Notifications Popover */}
        <Popover
          open={!!bell}
          anchorEl={bell}
          onClose={() => setBell(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { width: 420, maxHeight: 540, borderRadius: 4, boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.15)' } } }}
        >
          <NotificationList compact onNavigate={() => setBell(null)} />
        </Popover>

        {/* Mobile Notifications Drawer Sheet */}
        <Drawer
          anchor="bottom"
          open={bellSheet}
          onClose={() => setBellSheet(false)}
          slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85dvh', pb: 'env(safe-area-inset-bottom)' } } }}
        >
          <NotificationList compact onNavigate={() => setBellSheet(false)} />
        </Drawer>

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4.5 },
            pb: { xs: 'calc(90px + env(safe-area-inset-bottom))', md: 5 },
            width: '100%',
            maxWidth: 1320,
            mx: 'auto'
          }}
        >
          {status && status !== 'VERIFIED' && (
            <Alert
              severity={status === 'PENDING_VERIFICATION' ? 'warning' : 'error'}
              sx={{ mb: 3.5, borderRadius: 3 }}
            >
              Your {user.role === 'HOSPITAL' ? `hospital (${me?.hospital?.name})` : `blood bank (${me?.bloodBank?.name})`} is{' '}
              <strong>{VERIFICATION_META[status].label.toLowerCase()}</strong>.
              {status === 'PENDING_VERIFICATION'
                ? ' An admin must verify the facility before you can verify or fulfill emergency requests.'
                : me?.hospital?.rejectionReason
                  ? ` Reason: ${me.hospital.rejectionReason}`
                  : ''}
            </Alert>
          )}

          <Outlet />
        </Box>

        {/* Mobile Bottom Navigation Bar */}
        {!desktop && (
          <Paper
            elevation={0}
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1200,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              pb: 'env(safe-area-inset-bottom)'
            }}
          >
            <BottomNavigation
              showLabels
              value={more ? 99 : activeIdx >= 0 ? activeIdx : false}
              onChange={(_, v) => {
                if (v === 99) setMore(true);
                else nav(bottom[v].to);
              }}
              sx={{ height: 62 }}
            >
              {bottom.map((b) => (
                <BottomNavigationAction
                  key={b.to}
                  label={b.label}
                  icon={b.icon}
                  sx={{
                    minWidth: 0,
                    px: 0.5,
                    '&.Mui-selected': { color: 'primary.main' },
                    '& .MuiBottomNavigationAction-label': { fontSize: 11, fontWeight: 650 }
                  }}
                />
              ))}
              <BottomNavigationAction
                value={99}
                label="More"
                icon={<MoreHorizontal size={20} />}
                sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: 11, fontWeight: 650 } }}
              />
            </BottomNavigation>
          </Paper>
        )}

        {/* Mobile Full Sidebar Drawer */}
        <Drawer
          anchor="left"
          open={more && !desktop}
          onClose={() => setMore(false)}
          slotProps={{ paper: { sx: { width: 'min(300px, 85vw)', pt: 'env(safe-area-inset-top)' } } }}
        >
          <SideNav onPick={() => setMore(false)} />
        </Drawer>
      </Box>
      {void MenuIcon}
    </Box>
  );
}
