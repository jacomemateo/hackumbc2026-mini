import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchAllGradesForCourse, type Grade } from "@/services/api";

interface GradesTableProps {
  courseId?: string;
}

const columns: GridColDef[] = [
  {
    field: "assignment_name",
    headerName: "Assignment Name",
    flex: 1.8,
    minWidth: 240,
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
      params.value ? new Date(params.value as string).toLocaleDateString() : "—",
  },
];

export const GradesTable = ({ courseId }: GradesTableProps) => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      setGrades([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadGrades = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAllGradesForCourse(courseId);

        if (!cancelled) {
          setGrades(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load grades.");
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

  const sortedGrades = useMemo(
    () =>
      [...grades].sort(
        (left, right) =>
          new Date(right.posted_date).getTime() - new Date(left.posted_date).getTime(),
      ),
    [grades],
  );

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!loading && sortedGrades.length === 0) {
    return <Alert severity="info">No grades found for this course.</Alert>;
  }

  return (
    <Box sx={{ width: "100%" }}>
      <DataGrid
        autoHeight
        rows={sortedGrades}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading}
        disableRowSelectionOnClick
        hideFooter
        sx={{
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backgroundColor: "rgba(16, 18, 28, 0.35)",
          color: "#ecf0f1",
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            borderBottomColor: "rgba(255, 255, 255, 0.12)",
          },
          "& .MuiDataGrid-cell": {
            borderBottomColor: "rgba(255, 255, 255, 0.08)",
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
