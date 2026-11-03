import { Box, Button, List, ListItemButton, Stack, Typography } from '@mui/material';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRealtime } from '@/context/RealtimeContext';
import { useAuth } from '@/context/AuthContext';
import { requestPath, timeAgo } from '@/utils/format';
import { EmptyState } from './common';

export function NotificationList({ onNavigate, compact }: { onNavigate?: () => void; compact?: boolean }) {
  const { notifications, markRead, markAllRead, unread } = useRealtime();
  const { user } = useAuth();
  const nav = useNavigate();
  const items = compact ? notifications.slice(0, 20) : notifications;
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5 }}>
        <Typography fontWeight={700}>Notifications{unread > 0 ? ` (${unread})` : ''}</Typography>
        <Button size="small" onClick={() => void markAllRead()} disabled={unread === 0}>Mark all read</Button>
      </Stack>
      {items.length === 0 ? <EmptyState title="You're all caught up" text="New updates appear here instantly." /> : (
        <List disablePadding>
          {items.map((n) => (
            <ListItemButton key={n.id} alignItems="flex-start" sx={{ gap: 1.5, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: n.readAt ? 'transparent' : 'primary.light' }}
              onClick={() => { void markRead(n.id); if (n.requestId && user) { nav(requestPath(user.role, n.requestId)); onNavigate?.(); } }}>
              <Box sx={{ color: n.readAt ? 'text.disabled' : 'primary.main', mt: 0.25 }}><Bell size={18} /></Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={n.readAt ? 500 : 700} variant="body2">{n.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>{n.body}</Typography>
                <Typography variant="caption" color="text.disabled">{timeAgo(n.createdAt)}</Typography>
              </Box>
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
