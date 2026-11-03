import { Box, Card, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { EmptyState } from './common';

export interface Column<T> { key: string; label: string; render: (row: T) => ReactNode; primary?: boolean; hideOnMobile?: boolean }

/** Table on tablets/desktops; stacked cards on phones. No horizontal scrolling. */
export function ResponsiveTable<T extends { id: string }>({ columns, rows, onRowClick, emptyTitle = 'Nothing here yet', emptyText }: { columns: Column<T>[]; rows: T[]; onRowClick?: (r: T) => void; emptyTitle?: string; emptyText?: string }) {
  if (rows.length === 0) return <Card><EmptyState title={emptyTitle} text={emptyText} /></Card>;
  const primary = columns.find((c) => c.primary) ?? columns[0];
  return (
    <>
      <Card sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4 }}>
          <Table size="medium">
            <TableHead><TableRow>{columns.map((c) => <TableCell key={c.key}>{c.label}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover={!!onRowClick} onClick={() => onRowClick?.(r)} sx={{ cursor: onRowClick ? 'pointer' : 'default', '&:last-child td': { border: 0 } }}>
                  {columns.map((c) => <TableCell key={c.key}>{c.render(r)}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      <Stack gap={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
        {rows.map((r) => (
          <Card key={r.id} onClick={() => onRowClick?.(r)} sx={{ p: 2, cursor: onRowClick ? 'pointer' : 'default' }}>
            <Box sx={{ mb: 1, fontWeight: 600, wordBreak: 'break-word' }}>{primary.render(r)}</Box>
            <Stack gap={0.75}>
              {columns.filter((c) => c !== primary && !c.hideOnMobile).map((c) => (
                <Stack key={c.key} direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{c.label}</Typography>
                  <Box sx={{ textAlign: 'right', minWidth: 0, wordBreak: 'break-word' }}>{c.render(r)}</Box>
                </Stack>
              ))}
            </Stack>
          </Card>
        ))}
      </Stack>
    </>
  );
}
