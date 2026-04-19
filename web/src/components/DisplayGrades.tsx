import { useMemo } from "react";
import { Alert, Autocomplete, Box, Chip, TextField } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { type Grade } from "@/services/api";
import { useCourseGrades, type CourseGradesData } from "./useCourseGrades";

interface GradesTableProps {
  courseId?: string;
}

interface GradesGridProps extends CourseGradesData {
  courseId?: string;
}

// Slate & Charcoal Color Palette
const COLORS = {
  bg: "#0f172a",        // Deep Charcoal (Slate 900)
  headerBg: "#1e293b",  // Slate Blue-Gray (Slate 800)
  border: "#334155",    // Muted Slate (Slate 700)
  textPrimary: "#f8fafc", // Off-white (Slate 50)
  textSecondary: "#94a3b8", // Muted Text (Slate 400)
  rowHover: "rgba(51, 65, 85, 0.4)",
};

export const GradesGrid = ({
  courseId,
  grades,
  categories,
  loading,
  error,
  updatingGradeIDs,
  handleCategoryChange,
}: GradesGridProps) => {
  const sortedGrades = useMemo(
    () =>
      [...grades].sort(
        (left, right) =>
          new Date(right.posted_date).getTime() -
          new Date(left.posted_date).getTime(),
      ),
    [grades],
  );
  
  const visibleGrades = courseId ? sortedGrades : [];
  const visibleError = courseId ? error : null;
  const visibleLoading = courseId ? loading : false;

  const columns = useMemo<GridColDef<Grade>[]>(
    () => [
      {
        field: "assignment_name",
        headerName: "Assignment Name",
        flex: 1.8,
        minWidth: 240,
      },
      {
        field: "category_id",
        headerName: "Category",
        minWidth: 240,
        flex: 1.4,
        sortable: false,
        renderCell: (params) => {
          const currentCategory =
            categories.find((category) => category.id === params.row.category_id) ?? null;

          return (
            <Autocomplete
              disablePortal
              fullWidth
              size="small"
              options={categories}
              value={currentCategory}
              loading={Boolean(updatingGradeIDs[params.row.id])}
              onChange={(_, value) => {
                void handleCategoryChange(params.row.id, value);
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="No categories"
              renderInput={(inputParams) => (
                <TextField
                  {...inputParams}
                  placeholder="Unassigned"
                  variant="outlined"
                />
              )}
              sx={{
                minWidth: 0,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "rgba(0,0,0,0.2)",
                  color: COLORS.textPrimary,
                  fontSize: "0.875rem",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: COLORS.border,
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: COLORS.textSecondary,
                },
                "& .MuiSvgIcon-root": {
                  color: COLORS.textSecondary,
                },
              }}
            />
          );
        },
      },
      {
        field: "earned",
        headerName: "Earned",
        type: "number",
        width: 110,
        renderCell: (params) => params.value ?? "—",
      },
      {
        field: "total",
        headerName: "Total",
        type: "number",
        width: 110,
        renderCell: (params) => params.value ?? "—",
      },
      {
        field: "status",
        headerName: "Status",
        width: 140,
        sortable: false,
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            color={params.value === "GRADED" ? "success" : "warning"}
            variant="filled"
            sx={{ fontWeight: 600, fontSize: "0.7rem" }}
          />
        ),
      },
      {
        field: "posted_date",
        headerName: "Posted",
        minWidth: 150,
        flex: 1,
        renderCell: (params) =>
          params.value
            ? new Date(params.value as string).toLocaleDateString()
            : "—",
      },
    ],
    [categories, handleCategoryChange, updatingGradeIDs],
  );

  if (visibleError) {
    return <Alert severity="error">{visibleError}</Alert>;
  }

  if (!visibleLoading && visibleGrades.length === 0) {
    return <Alert severity="info">No grades found for this course.</Alert>;
  }

  return (
    <Box sx={{ width: "100%" }}>
<DataGrid
  autoHeight
  rows={visibleGrades}
  columns={columns}
  getRowId={(row) => row.id}
  loading={visibleLoading}
  disableRowSelectionOnClick
  hideFooter
  sx={{
    border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.bg,
    color: COLORS.textPrimary,
    // 1. Target the main header container
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: `${COLORS.headerBg} !important`,
      borderBottom: `1px solid ${COLORS.border}`,
    },
    // 2. Target each individual header cell (important for background color)
    "& .MuiDataGrid-columnHeader": {
      backgroundColor: COLORS.headerBg,
      color: COLORS.textSecondary,
    },
    // 3. Ensure the text specifically inside the title is correct
    "& .MuiDataGrid-columnHeaderTitle": {
      textTransform: "uppercase",
      fontSize: "0.75rem",
      letterSpacing: "0.05em",
      fontWeight: 700,
      color: COLORS.textSecondary,
    },
    // 4. Handle icons (sort, menu)
    "& .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton": {
      color: COLORS.textSecondary,
    },
    "& .MuiDataGrid-cell": {
      borderBottom: `1px solid ${COLORS.border}`,
      color: COLORS.textPrimary,
      py: 1,
    },
    "& .MuiDataGrid-row": {
      "&:hover": {
        backgroundColor: COLORS.rowHover,
      },
    },
    // Removes that thin white line/separator between headers
    "& .MuiDataGrid-columnSeparator": {
      display: "none", 
    },
    "& .MuiDataGrid-withBorderColor": {
      borderColor: COLORS.border,
    },
  }}
/>
    </Box>
  );
};

export const GradesTable = ({ courseId }: GradesTableProps) => {
  const courseGrades = useCourseGrades(courseId);
  return <GradesGrid courseId={courseId} {...courseGrades} />;
};