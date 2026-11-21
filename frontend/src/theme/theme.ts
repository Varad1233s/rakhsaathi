import { createTheme, alpha } from '@mui/material/styles';

export const colors = {
  primary: '#E11D48',      // Vibrant crimson rose
  primaryDark: '#BE123C',  // Deep blood crimson
  primaryLight: '#FFF1F2', // Soft delicate rose mist
  primaryHover: '#CD1842',
  accent: '#0F172A',       // Rich slate
  background: '#F8FAFC',   // Clean ultra-soft light gray
  white: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  error: '#EF4444',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9'
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      dark: colors.primaryDark,
      light: colors.primaryLight,
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: colors.accent,
      contrastText: '#FFFFFF'
    },
    success: { main: colors.success },
    warning: { main: colors.warning },
    info: { main: colors.info },
    error: { main: colors.error },
    background: {
      default: colors.background,
      paper: colors.white
    },
    text: {
      primary: colors.text,
      secondary: colors.muted
    },
    divider: colors.border
  },
  shape: {
    borderRadius: 14
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.035em',
      lineHeight: 1.15
    },
    h2: {
      fontWeight: 800,
      letterSpacing: '-0.025em',
      lineHeight: 1.2
    },
    h3: {
      fontWeight: 750,
      letterSpacing: '-0.02em',
      lineHeight: 1.25
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.015em',
      lineHeight: 1.3
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.01em'
    },
    h6: {
      fontWeight: 650,
      letterSpacing: '-0.005em'
    },
    subtitle1: {
      fontWeight: 600,
      letterSpacing: '-0.005em'
    },
    body1: {
      lineHeight: 1.6
    },
    body2: {
      lineHeight: 1.55
    },
    button: {
      textTransform: 'none',
      fontWeight: 650,
      letterSpacing: '0.01em'
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.background,
          color: colors.text
        }
      }
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 6px 16px -4px rgba(15, 23, 42, 0.05)',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            boxShadow: '0 4px 6px rgba(15, 23, 42, 0.03), 0 12px 24px -4px rgba(15, 23, 42, 0.08)'
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 12,
          minHeight: 42,
          padding: '8px 18px',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          '@media (pointer: coarse)': { minHeight: 46 }
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
          boxShadow: `0 4px 14px 0 ${alpha(colors.primary, 0.35)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${colors.primaryHover} 0%, #9F1239 100%)`,
            boxShadow: `0 6px 20px 0 ${alpha(colors.primary, 0.45)}`,
            transform: 'translateY(-1px)'
          },
          '&:active': {
            transform: 'translateY(0px)'
          }
        },
        outlinedPrimary: {
          borderColor: alpha(colors.primary, 0.3),
          color: colors.primary,
          '&:hover': {
            borderColor: colors.primary,
            backgroundColor: alpha(colors.primary, 0.04),
            transform: 'translateY(-1px)'
          }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: 'all 0.2s ease',
          '@media (pointer: coarse)': { minWidth: 44, minHeight: 44 }
        }
      }
    },
    MuiTextField: {
      defaultProps: { size: 'medium', fullWidth: true }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '& fieldset': {
            borderColor: colors.border
          },
          '&:hover fieldset': {
            borderColor: alpha(colors.primary, 0.5)
          },
          '&.Mui-focused fieldset': {
            borderColor: colors.primary,
            borderWidth: '1.5px',
            boxShadow: `0 0 0 3px ${alpha(colors.primary, 0.15)}`
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 10,
          height: 28,
          fontSize: '0.8125rem'
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 650,
          color: colors.muted,
          backgroundColor: '#F8FAFC',
          whiteSpace: 'nowrap',
          borderBottom: `1px solid ${colors.border}`
        },
        body: {
          borderBottom: `1px solid ${colors.borderSubtle}`
        }
      }
    },
    MuiDialog: {
      defaultProps: { fullWidth: true },
      styleOverrides: {
        paper: {
          borderRadius: 20,
          margin: 16,
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          maxHeight: 'calc(100% - 32px)'
        }
      }
    },
    MuiTooltip: {
      defaultProps: { enterTouchDelay: 0 },
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          backgroundColor: colors.accent,
          fontSize: '0.75rem'
        }
      }
    }
  }
});
