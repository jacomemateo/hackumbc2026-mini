import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import { type Course } from "@/services/api";
import { CourseGradeBadge } from "./CourseGradeBadge";
import { GradesGrid } from "./DisplayGrades";
import { useCourseGrades } from "./useCourseGrades";

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
        <CourseGradeCard key={course.id} course={course} />
      ))}
    </Stack>
  );
};

interface CourseGradeCardProps {
  course: Course;
}

const CourseGradeCard = ({ course }: CourseGradeCardProps) => {
  const courseGrades = useCourseGrades(course.id);

  return (
    <Box
      sx={{
        borderRadius: "10px",
        border: "1px solid #444",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        padding: "16px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <Box sx={{ flex: "1 1 260px" }}>
          <Typography variant="h6" sx={{ color: "#ecf0f1", marginBottom: "4px" }}>
            {course.course_name}
          </Typography>
          <Typography variant="body2" sx={{ color: "#aaa" }}>
            {course.course_id} • {course.professor_name}
          </Typography>
        </Box>
        <CourseGradeBadge
          summary={courseGrades.gradeSummary}
          loading={courseGrades.loading}
        />
      </Box>

      <GradesGrid courseId={course.id} {...courseGrades} />
    </Box>
  );
};

export default CourseGradesOverview;
