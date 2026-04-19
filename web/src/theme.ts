import { alpha, createTheme, type Theme } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";

const slate = {
  50: "#f8fafc",
  400: "#94a3b8",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
  950: "#020617",
};

const indigo = {
  300: "#a5b4fc",
  400: "#818cf8",
  500: "#6366f1",
};

const matteShadow = "0 18px 40px rgba(2, 6, 23, 0.32)";
const overlayShadow = "0 22px 52px rgba(2, 6, 23, 0.44)";
const surfaceRadius = 12;
const controlRadius = 10;
const optionRadius = 8;
const dataGridBackground = slate[900];
const dataGridHeaderBackground = slate[800];

const baseTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      light: indigo[300],
      main: indigo[400],
      dark: indigo[500],
      contrastText: slate[50],
    },
    background: {
      default: slate[950],
      paper: slate[900],
    },
    text: {
      primary: slate[50],
      secondary: slate[400],
    },
    divider: alpha(slate[400], 0.2),
    success: {
      light: "#86efac",
      main: "#22c55e",
    },
    warning: {
      light: "#fcd34d",
      main: "#f59e0b",
    },
    error: {
      light: "#fca5a5",
      main: "#f87171",
    },
    info: {
      light: "#93c5fd",
      main: "#60a5fa",
    },
    DataGrid: {
      bg: slate[900],
      headerBg: slate[800],
      pinnedBg: slate[800],
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily:
      '"Avenir Next", "Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
    h3: {
      fontSize: "clamp(2.2rem, 3vw, 3rem)",
      fontWeight: 800,
      letterSpacing: "-0.04em",
      lineHeight: 1,
    },
    h5: {
      fontSize: "1.7rem",
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h6: {
      fontSize: "1.05rem",
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    overline: {
      color: slate[400],
      fontSize: "0.72rem",
      fontWeight: 700,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
    },
    allVariants: {
      color: slate[50],
    },
  },
});

const theme = createTheme(baseTheme, {
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*, *::before, *::after": {
          boxSizing: "border-box",
        },
        html: {
          height: "100%",
          backgroundColor: baseTheme.palette.background.default,
        },
        body: {
          minHeight: "100%",
          backgroundColor: baseTheme.palette.background.default,
          backgroundImage: "none",
          color: baseTheme.palette.text.primary,
          scrollbarColor: `${slate[700]} ${slate[950]}`,
        },
        "#root": {
          minHeight: "100%",
        },
        "::-webkit-scrollbar": {
          width: "12px",
          height: "12px",
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: slate[950],
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: slate[700],
          border: `3px solid ${slate[950]}`,
          borderRadius: 999,
        },
        "::-webkit-scrollbar-thumb:hover": {
          backgroundColor: slate[400],
        },
      },
    },
    MuiTypography: {
      defaultProps: {
        color: "text.primary",
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: ({ theme: activeTheme }: { theme: Theme }) => ({
          color: activeTheme.palette.text.primary,
          backgroundColor: activeTheme.palette.background.paper,
          backgroundImage: "none",
          boxShadow: matteShadow,
        }),
        outlined: ({ theme: activeTheme }: { theme: Theme }) => ({
          borderColor: alpha(activeTheme.palette.divider, 0.9),
          boxShadow: matteShadow,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme: activeTheme }: { theme: Theme }) => ({
          color: activeTheme.palette.text.primary,
          backgroundColor: activeTheme.palette.background.paper,
          backgroundImage: "none",
          borderRight: `1px solid ${alpha(activeTheme.palette.divider, 0.9)}`,
          boxShadow: "12px 0 36px rgba(2, 6, 23, 0.28)",
          display: "flex",
          flexDirection: "column",
        }),
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: ({ theme: activeTheme }: { theme: Theme }) => ({
          borderColor: alpha(activeTheme.palette.divider, 0.9),
        }),
      },
    },
    MuiList: {
      defaultProps: {
        disablePadding: true,
      },
      styleOverrides: {
        root: ({ theme: activeTheme }: { theme: Theme }) => ({
          paddingTop: activeTheme.spacing(1.5),
          paddingBottom: activeTheme.spacing(1.5),
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme: activeTheme }: { theme: Theme }) => ({
          margin: activeTheme.spacing(0.25, 1.5),
          padding: activeTheme.spacing(1.25, 1.75),
          borderRadius: surfaceRadius,
          color: activeTheme.palette.text.secondary,
          transition: activeTheme.transitions.create(
            ["background-color", "box-shadow", "color"],
            {
              duration: activeTheme.transitions.duration.shorter,
            },
          ),
          "&:hover": {
            backgroundColor: alpha(activeTheme.palette.primary.main, 0.08),
            color: activeTheme.palette.text.primary,
          },
          "&.Mui-selected": {
            backgroundColor: alpha(activeTheme.palette.primary.main, 0.16),
            boxShadow: `inset 0 0 0 1px ${alpha(activeTheme.palette.primary.main, 0.2)}`,
            color: activeTheme.palette.text.primary,
          },
          "&.Mui-selected:hover": {
            backgroundColor: alpha(activeTheme.palette.primary.main, 0.22),
          },
        }),
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: ({ theme: activeTheme }: { theme: Theme }) => ({
          minWidth: activeTheme.spacing(4.5),
          color: "inherit",
        }),
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          color: "inherit",
        },
        secondary: {
          color: "inherit",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: () => ({
          borderRadius: controlRadius,
          fontWeight: 600,
          textTransform: "none",
          boxShadow: "none",
        }),
        containedPrimary: ({ theme: activeTheme }: { theme: Theme }) => ({
          backgroundColor: activeTheme.palette.primary.main,
          color: activeTheme.palette.primary.contrastText,
          "&:hover": {
            backgroundColor: activeTheme.palette.primary.dark,
            boxShadow: "none",
          },
        }),
        outlined: ({ theme: activeTheme }: { theme: Theme }) => ({
          borderColor: alpha(activeTheme.palette.divider, 0.9),
          color: activeTheme.palette.text.primary,
          "&:hover": {
            borderColor: activeTheme.palette.primary.main,
            backgroundColor: alpha(activeTheme.palette.primary.main, 0.08),
          },
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme: activeTheme }: { theme: Theme }) => ({
          borderRadius: surfaceRadius,
          color: activeTheme.palette.text.primary,
        }),
        standardInfo: ({ theme: activeTheme }: { theme: Theme }) => ({
          backgroundColor: alpha(activeTheme.palette.info.main, 0.14),
          border: `1px solid ${alpha(activeTheme.palette.info.main, 0.26)}`,
        }),
        standardError: ({ theme: activeTheme }: { theme: Theme }) => ({
          backgroundColor: alpha(activeTheme.palette.error.main, 0.14),
          border: `1px solid ${alpha(activeTheme.palette.error.main, 0.26)}`,
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme: activeTheme }: { theme: Theme }) => ({
          borderRadius: 999,
          fontSize: activeTheme.typography.pxToRem(11),
          fontWeight: 700,
          letterSpacing: "0.04em",
        }),
        filledSuccess: ({ theme: activeTheme }: { theme: Theme }) => ({
          backgroundColor: alpha(activeTheme.palette.success.main, 0.16),
          color: activeTheme.palette.success.light,
        }),
        filledWarning: ({ theme: activeTheme }: { theme: Theme }) => ({
          backgroundColor: alpha(activeTheme.palette.warning.main, 0.16),
          color: activeTheme.palette.warning.light,
        }),
      },
    },
    MuiCircularProgress: {
      defaultProps: {
        color: "primary",
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme: activeTheme }: { theme: Theme }) => ({
          color: activeTheme.palette.text.primary,
          backgroundColor: alpha(activeTheme.palette.background.default, 0.72),
          borderRadius: controlRadius,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(activeTheme.palette.divider, 0.9),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(activeTheme.palette.text.secondary, 0.92),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: activeTheme.palette.primary.main,
          },
        }),
        input: ({ theme: activeTheme }: { theme: Theme }) => ({
          padding: activeTheme.spacing(1.1, 1.25),
          "&::placeholder": {
            color: activeTheme.palette.text.secondary,
            opacity: 1,
          },
        }),
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
        popupIndicator: ({ theme: activeTheme }: { theme: Theme }) => ({
          color: activeTheme.palette.text.secondary,
        }),
        clearIndicator: ({ theme: activeTheme }: { theme: Theme }) => ({
          color: activeTheme.palette.text.secondary,
        }),
        paper: ({ theme: activeTheme }: { theme: Theme }) => ({
          marginTop: activeTheme.spacing(1),
          border: `1px solid ${alpha(activeTheme.palette.divider, 0.9)}`,
          backgroundColor: activeTheme.palette.background.paper,
          backgroundImage: "none",
          boxShadow: overlayShadow,
        }),
        listbox: ({ theme: activeTheme }: { theme: Theme }) => ({
          padding: activeTheme.spacing(0.75),
        }),
        option: ({ theme: activeTheme }: { theme: Theme }) => ({
          borderRadius: optionRadius,
          color: activeTheme.palette.text.primary,
          "&[aria-selected='true']": {
            backgroundColor: alpha(activeTheme.palette.primary.main, 0.16),
          },
          "&.Mui-focused, &[data-focus='true']": {
            backgroundColor: alpha(activeTheme.palette.primary.main, 0.1),
          },
        }),
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: ({ theme: activeTheme }: { theme: Theme }) => ({
          border: `1px solid ${alpha(activeTheme.palette.divider, 0.9)}`,
          backgroundColor: dataGridBackground,
          color: activeTheme.palette.text.primary,
          "--DataGrid-t-color-background-base": dataGridBackground,
          "--DataGrid-t-color-background-overlay": activeTheme.palette.background.paper,
          "--DataGrid-t-color-border-base": alpha(activeTheme.palette.divider, 0.9),
          "--DataGrid-t-color-foreground-base": activeTheme.palette.text.primary,
          "--DataGrid-t-color-foreground-muted": activeTheme.palette.text.secondary,
          "--DataGrid-t-header-background-base": dataGridHeaderBackground,
          "--DataGrid-t-cell-background-pinned": dataGridHeaderBackground,
          "--DataGrid-t-shadow-base": matteShadow,
          "--DataGrid-t-radius-base": `${surfaceRadius}px`,
          "--DataGrid-t-typography-font-family-base": activeTheme.typography.fontFamily,
          "--DataGrid-t-typography-font-weight-regular":
            activeTheme.typography.fontWeightRegular,
          "--DataGrid-t-typography-font-weight-bold":
            activeTheme.typography.fontWeightBold,
          "& .MuiDataGrid-main": {
            backgroundColor: dataGridBackground,
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: dataGridHeaderBackground,
            borderBottom: `1px solid ${alpha(activeTheme.palette.divider, 0.9)}`,
          },
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: dataGridHeaderBackground,
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            color: activeTheme.palette.text.secondary,
            fontSize: activeTheme.typography.pxToRem(12),
            fontWeight: activeTheme.typography.fontWeightBold,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          },
          "& .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton": {
            color: activeTheme.palette.text.secondary,
          },
          "& .MuiDataGrid-cell": {
            borderBottom: `1px solid ${alpha(activeTheme.palette.divider, 0.62)}`,
          },
          "& .MuiDataGrid-row:hover": {
            backgroundColor: alpha(activeTheme.palette.primary.main, 0.08),
          },
          "& .MuiDataGrid-columnSeparator": {
            display: "none",
          },
          "& .MuiDataGrid-withBorderColor": {
            borderColor: alpha(activeTheme.palette.divider, 0.82),
          },
          "& .MuiDataGrid-overlay": {
            backgroundColor: activeTheme.palette.background.paper,
          },
        }),
      },
    },
  },
});

export default theme;
