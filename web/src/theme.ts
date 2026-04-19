import { alpha, createTheme, type Theme } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";

// Pure neutral charcoal — hsl(0, 0%, L%) has zero hue and zero saturation.
// There is no blue (or any colour) anywhere in this scale.
const charcoal = {
  50:  "hsl(0, 0%, 97%)",
  100: "hsl(0, 0%, 93%)",
  200: "hsl(0, 0%, 87%)",
  300: "hsl(0, 0%, 78%)",
  400: "hsl(0, 0%, 60%)",
  500: "hsl(0, 0%, 42%)",
  600: "hsl(0, 0%, 30%)",
  700: "hsl(0, 0%, 20%)",
  800: "hsl(0, 0%, 13%)",
  900: "hsl(0, 0%, 8%)",
  950: "hsl(0, 0%, 4%)",
};

const matteShadow   = "0 18px 40px hsla(0, 0%, 0%, 0.40)";
const overlayShadow = "0 22px 52px hsla(0, 0%, 0%, 0.56)";
const surfaceRadius = 12;
const controlRadius = 10;
const optionRadius  = 8;
const dataGridBackground       = charcoal[900];
const dataGridHeaderBackground = charcoal[800];

const baseTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      light:        charcoal[200],  // highlight / hover labels
      main:         charcoal[300],  // buttons, focus rings, selected rings
      dark:         charcoal[400],  // pressed state
      contrastText: charcoal[900],  // dark text on light-gray fill
    },
    background: {
      default: charcoal[950],
      paper:   charcoal[900],
    },
    text: {
      primary:   charcoal[50],
      secondary: charcoal[400],
    },
    divider: alpha(charcoal[400], 0.2),
    success: {
      light: "hsl(142, 69%, 73%)",
      main:  "hsl(142, 71%, 45%)",
    },
    warning: {
      light: "hsl(43,  96%, 66%)",
      main:  "hsl(38,  92%, 50%)",
    },
    error: {
      light: "hsl(0,  93%, 82%)",
      main:  "hsl(0,  91%, 71%)",
    },
    info: {
      light: "hsl(214, 95%, 79%)",
      main:  "hsl(217, 91%, 68%)",
    },
    DataGrid: {
      bg:       charcoal[900],
      headerBg: charcoal[800],
      pinnedBg: charcoal[800],
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily:
      '"Avenir Next", "Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
    h3: {
      fontSize:      "clamp(2.2rem, 3vw, 3rem)",
      fontWeight:    800,
      letterSpacing: "-0.04em",
      lineHeight:    1,
    },
    h5: {
      fontSize:      "1.7rem",
      fontWeight:    700,
      letterSpacing: "-0.02em",
    },
    h6: {
      fontSize:      "1.05rem",
      fontWeight:    700,
      letterSpacing: "-0.01em",
    },
    overline: {
      color:         charcoal[400],
      fontSize:      "0.72rem",
      fontWeight:    700,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
    },
    allVariants: {
      color: charcoal[50],
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
          height:          "100%",
          backgroundColor: baseTheme.palette.background.default,
        },
        body: {
          minHeight:       "100%",
          backgroundColor: baseTheme.palette.background.default,
          backgroundImage: "none",
          color:           baseTheme.palette.text.primary,
          scrollbarColor:  `${charcoal[700]} ${charcoal[950]}`,
        },
        "#root": {
          minHeight: "100%",
        },
        "::-webkit-scrollbar": {
          width:  "12px",
          height: "12px",
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: charcoal[950],
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: charcoal[700],
          border:          `3px solid ${charcoal[950]}`,
          borderRadius:    999,
        },
        "::-webkit-scrollbar-thumb:hover": {
          backgroundColor: charcoal[500],
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
        root: ({ theme: t }: { theme: Theme }) => ({
          color:           t.palette.text.primary,
          backgroundColor: t.palette.background.paper,
          backgroundImage: "none",
          boxShadow:       matteShadow,
        }),
        outlined: ({ theme: t }: { theme: Theme }) => ({
          borderColor: alpha(t.palette.divider, 0.9),
          boxShadow:   matteShadow,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme: t }: { theme: Theme }) => ({
          color:           t.palette.text.primary,
          backgroundColor: t.palette.background.paper,
          backgroundImage: "none",
          borderRight:     `1px solid ${alpha(t.palette.divider, 0.9)}`,
          boxShadow:       "12px 0 36px hsla(0, 0%, 0%, 0.36)",
          display:         "flex",
          flexDirection:   "column",
        }),
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: ({ theme: t }: { theme: Theme }) => ({
          borderColor: alpha(t.palette.divider, 0.9),
        }),
      },
    },
    MuiList: {
      defaultProps: {
        disablePadding: true,
      },
      styleOverrides: {
        root: ({ theme: t }: { theme: Theme }) => ({
          paddingTop:    t.spacing(1.5),
          paddingBottom: t.spacing(1.5),
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme: t }: { theme: Theme }) => ({
          margin:       t.spacing(0.25, 1.5),
          padding:      t.spacing(1.25, 1.75),
          borderRadius: surfaceRadius,
          color:        t.palette.text.secondary,
          transition:   t.transitions.create(
            ["background-color", "box-shadow", "color"],
            { duration: t.transitions.duration.shorter },
          ),
          "&:hover": {
            backgroundColor: alpha(charcoal[50], 0.05),
            color:           t.palette.text.primary,
          },
          "&.Mui-selected": {
            backgroundColor: alpha(charcoal[50], 0.10),
            boxShadow:       `inset 0 0 0 1px ${alpha(charcoal[300], 0.22)}`,
            color:           t.palette.text.primary,
          },
          "&.Mui-selected:hover": {
            backgroundColor: alpha(charcoal[50], 0.14),
          },
        }),
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: ({ theme: t }: { theme: Theme }) => ({
          minWidth: t.spacing(4.5),
          color:    "inherit",
        }),
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary:   { color: "inherit" },
        secondary: { color: "inherit" },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: () => ({
          borderRadius:  controlRadius,
          fontWeight:    600,
          textTransform: "none",
          boxShadow:     "none",
        }),
        containedPrimary: ({ theme: t }: { theme: Theme }) => ({
          backgroundColor: t.palette.primary.main,
          color:           t.palette.primary.contrastText,
          "&:hover": {
            backgroundColor: t.palette.primary.dark,
            boxShadow:       "none",
          },
        }),
        outlined: ({ theme: t }: { theme: Theme }) => ({
          borderColor: alpha(t.palette.divider, 0.9),
          color:       t.palette.text.primary,
          "&:hover": {
            borderColor:     charcoal[400],
            backgroundColor: alpha(charcoal[50], 0.05),
          },
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme: t }: { theme: Theme }) => ({
          borderRadius: surfaceRadius,
          color:        t.palette.text.primary,
        }),
        standardInfo: ({ theme: t }: { theme: Theme }) => ({
          backgroundColor: alpha(t.palette.info.main, 0.14),
          border:          `1px solid ${alpha(t.palette.info.main, 0.26)}`,
        }),
        standardError: ({ theme: t }: { theme: Theme }) => ({
          backgroundColor: alpha(t.palette.error.main, 0.14),
          border:          `1px solid ${alpha(t.palette.error.main, 0.26)}`,
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme: t }: { theme: Theme }) => ({
          borderRadius:  999,
          fontSize:      t.typography.pxToRem(11),
          fontWeight:    700,
          letterSpacing: "0.04em",
        }),
        filledSuccess: ({ theme: t }: { theme: Theme }) => ({
          backgroundColor: alpha(t.palette.success.main, 0.16),
          color:           t.palette.success.light,
        }),
        filledWarning: ({ theme: t }: { theme: Theme }) => ({
          backgroundColor: alpha(t.palette.warning.main, 0.16),
          color:           t.palette.warning.light,
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
        size:    "small",
        variant: "outlined",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme: t }: { theme: Theme }) => ({
          color:           t.palette.text.primary,
          backgroundColor: alpha(t.palette.background.default, 0.72),
          borderRadius:    controlRadius,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(t.palette.divider, 0.9),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(charcoal[400], 0.92),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: charcoal[300],
          },
        }),
        input: ({ theme: t }: { theme: Theme }) => ({
          padding: t.spacing(1.1, 1.25),
          "&::placeholder": {
            color:   t.palette.text.secondary,
            opacity: 1,
          },
        }),
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: { minWidth: 0 },
        popupIndicator: ({ theme: t }: { theme: Theme }) => ({
          color: t.palette.text.secondary,
        }),
        clearIndicator: ({ theme: t }: { theme: Theme }) => ({
          color: t.palette.text.secondary,
        }),
        paper: ({ theme: t }: { theme: Theme }) => ({
          marginTop:       t.spacing(1),
          border:          `1px solid ${alpha(t.palette.divider, 0.9)}`,
          backgroundColor: t.palette.background.paper,
          backgroundImage: "none",
          boxShadow:       overlayShadow,
        }),
        listbox: ({ theme: t }: { theme: Theme }) => ({
          padding: t.spacing(0.75),
        }),
        option: ({ theme: t }: { theme: Theme }) => ({
          borderRadius: optionRadius,
          color:        t.palette.text.primary,
          "&[aria-selected='true']": {
            backgroundColor: alpha(charcoal[50], 0.10),
          },
          "&.Mui-focused, &[data-focus='true']": {
            backgroundColor: alpha(charcoal[50], 0.06),
          },
        }),
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: ({ theme: t }: { theme: Theme }) => ({
          border:          `1px solid ${alpha(t.palette.divider, 0.9)}`,
          backgroundColor: dataGridBackground,
          color:           t.palette.text.primary,
          "--DataGrid-t-color-background-base":           dataGridBackground,
          "--DataGrid-t-color-background-overlay":        t.palette.background.paper,
          "--DataGrid-t-color-border-base":               alpha(t.palette.divider, 0.9),
          "--DataGrid-t-color-foreground-base":           t.palette.text.primary,
          "--DataGrid-t-color-foreground-muted":          t.palette.text.secondary,
          "--DataGrid-t-header-background-base":          dataGridHeaderBackground,
          "--DataGrid-t-cell-background-pinned":          dataGridHeaderBackground,
          "--DataGrid-t-shadow-base":                     matteShadow,
          "--DataGrid-t-radius-base":                     `${surfaceRadius}px`,
          "--DataGrid-t-typography-font-family-base":     t.typography.fontFamily,
          "--DataGrid-t-typography-font-weight-regular":  t.typography.fontWeightRegular,
          "--DataGrid-t-typography-font-weight-bold":     t.typography.fontWeightBold,
          "& .MuiDataGrid-main": {
            backgroundColor: dataGridBackground,
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: dataGridHeaderBackground,
            borderBottom:    `1px solid ${alpha(t.palette.divider, 0.9)}`,
          },
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: dataGridHeaderBackground,
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            color:         t.palette.text.secondary,
            fontSize:      t.typography.pxToRem(12),
            fontWeight:    t.typography.fontWeightBold,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          },
          "& .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton": {
            color: t.palette.text.secondary,
          },
          "& .MuiDataGrid-cell": {
            borderBottom: `1px solid ${alpha(t.palette.divider, 0.62)}`,
          },
          "& .MuiDataGrid-row:hover": {
            backgroundColor: alpha(charcoal[50], 0.04),
          },
          "& .MuiDataGrid-columnSeparator": {
            display: "none",
          },
          "& .MuiDataGrid-withBorderColor": {
            borderColor: alpha(t.palette.divider, 0.82),
          },
          "& .MuiDataGrid-overlay": {
            backgroundColor: t.palette.background.paper,
          },
        }),
      },
    },
  },
});

export default theme;