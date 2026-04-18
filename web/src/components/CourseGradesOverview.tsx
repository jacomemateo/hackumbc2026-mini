import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import { type Course } from "@/services/api";
import { GradesTable } from "./DisplayGrades";

interface CourseGradesOverviewProps {
  courses: Course[];
  loading: boolean;
  error: string | null;
}

const CourseGradesOverview = ({
  courses,
  loading,
  error,
}: CourseGradesOverviewProps) => {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (courses.length === 0) {
    return <Alert severity="info">No courses available yet.</Alert>;
  }

  return (
    <Stack spacing={2.5}>
      {courses.map((course) => (
        <Box
          key={course.id}
          sx={{
            borderRadius: "10px",
            border: "1px solid #444",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            padding: "16px",
          }}
        >
          <Typography variant="h6" sx={{ color: "#ecf0f1", marginBottom: "4px" }}>
            {course.course_name}
          </Typography>
          <Typography variant="body2" sx={{ color: "#aaa", marginBottom: "16px" }}>
            {course.course_id} • {course.professor_name}
          </Typography>
          <GradesTable courseId={course.id} />
        </Box>
      ))}
    </Stack>
  );
};

export default CourseGradesOverview;
