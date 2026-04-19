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
            <Box style={{ width: "100%", minWidth: 0 }}>
              <Autocomplete
                disablePortal
                fullWidth
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
                  <TextField {...inputParams} placeholder="Unassigned" />
                )}
              />
            </Box>
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
    <Box style={{ width: "100%" }}>
      <DataGrid
        autoHeight
        rows={visibleGrades}
        columns={columns}
        getRowId={(row) => row.id}
        loading={visibleLoading}
        disableRowSelectionOnClick
        hideFooter
      />
    </Box>
  );
};

export const GradesTable = ({ courseId }: GradesTableProps) => {
  const courseGrades = useCourseGrades(courseId);
  return <GradesGrid courseId={courseId} {...courseGrades} />;
};
