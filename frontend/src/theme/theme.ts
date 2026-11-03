import { createTheme, alpha } from '@mui/material/styles';

export const colors = {
  primary: '#E63950', primaryDark: '#C9273F', softRed: '#FFF0F2', background: '#F7F8FA', white: '#FFFFFF',
  text: '#17191D', muted: '#667085', success: '#22A06B', warning: '#F59E0B', info: '#4F7CFF', border: '#E7E9EE'
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: colors.primary, dark: colors.primaryDark, light: colors.softRed, contrastText: '#fff' },
    success: { main: colors.success }, warning: { main: colors.warning }, info: { main: colors.info }, error: { main: '#D92D20' },
    background: { default: colors.background, paper: colors.white },
    text: { primary: colors.text, secondary: colors.muted },
    divider: colors.border
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.03em' }, h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' }, h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 700 }, h6: { fontWeight: 650 }, subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 }
  },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { backgroundColor: colors.background } } },
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: `1px solid ${colors.border}`, boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.04)', borderRadius: 16 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, minHeight: 40, '@media (pointer: coarse)': { minHeight: 44 } },
        containedPrimary: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`, '&:hover': { background: colors.primaryDark } }
      }
    },
    MuiIconButton: { styleOverrides: { root: { '@media (pointer: coarse)': { minWidth: 44, minHeight: 44 } } } },
    MuiTextField: { defaultProps: { size: 'medium', fullWidth: true } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10, backgroundColor: '#fff', '& fieldset': { borderColor: colors.border }, '&:hover fieldset': { borderColor: alpha(colors.primary, 0.5) } } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600, color: colors.muted, backgroundColor: '#FAFAFB', whiteSpace: 'nowrap' } } },
    MuiDialog: { defaultProps: { fullWidth: true }, styleOverrides: { paper: { borderRadius: 16, margin: 16, maxHeight: 'calc(100% - 32px)' } } },
    MuiTooltip: { defaultProps: { enterTouchDelay: 0 } }
  }
});
