import { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Chip, TextField } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  fetchAllGradesForCourse,
  fetchCourseCategories,
  updateGrade,
  type Category,
  type Grade,
} from "@/services/api";

interface GradesTableProps {
  courseId?: string;
}

export const GradesTable = ({ courseId }: GradesTableProps) => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingGradeIDs, setUpdatingGradeIDs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!courseId) {
      return;
    }

    let cancelled = false;

    const loadGrades = async () => {
      try {
        setLoading(true);
        setError(null);
        setGrades([]);
        setCategories([]);
        const [gradeData, categoryData] = await Promise.all([
          fetchAllGradesForCourse(courseId),
          fetchCourseCategories(courseId),
        ]);

        if (!cancelled) {
          setGrades(gradeData);
          setCategories(categoryData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load grades.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadGrades();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const handleCategoryChange = async (gradeID: string, category: Category | null) => {
    try {
      setUpdatingGradeIDs((current) => ({ ...current, [gradeID]: true }));
      const updatedGrade = await updateGrade(gradeID, {
        category_id: category?.id ?? null,
      });

      setGrades((current) =>
        current.map((grade) => (grade.id === gradeID ? updatedGrade : grade)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category.");
    } finally {
      setUpdatingGradeIDs((current) => {
        const next = { ...current };
        delete next[gradeID];
        return next;
      });
    }
  };

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
                  backgroundColor: "rgba(255,255,255,0.03)",
                  color: "#ecf0f1",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.14)",
                },
                "& .MuiSvgIcon-root": {
                  color: "#ecf0f1",
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
    [categories, updatingGradeIDs],
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
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backgroundColor: "rgba(16, 18, 28, 0.35)",
          color: "#262B49",
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderBottomColor: "rgba(255, 255, 255, 0.12)",
            color: "#262B49",
          },
          "& .MuiDataGrid-cell": {
            borderBottomColor: "rgba(255, 255, 255, 0.08)",
            color: "#ecf0f1",
          },
          "& .MuiDataGrid-row": {
            "&:hover": {
              backgroundColor: "rgba(100, 150, 255, 0.08)",
            },
          },
          "& .MuiDataGrid-columnSeparator": {
            color: "rgba(255, 255, 255, 0.12)",
          },
          "& .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton": {
            color: "#ecf0f1",
          },
          "& .MuiDataGrid-footerContainer": {
            borderTopColor: "rgba(255, 255, 255, 0.12)",
          },
          "& .MuiDataGrid-overlay": {
            backgroundColor: "transparent",
          },
        }}
      />
    </Box>
  );
};
