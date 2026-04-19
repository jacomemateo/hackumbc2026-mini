import { Alert, Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
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
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: 48 }}>
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
    <Paper variant="outlined">
      <Stack spacing={2} style={{ padding: 20 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          style={{ alignItems: "flex-start", justifyContent: "space-between" }}
        >
          <Box style={{ flex: "1 1 260px" }}>
            <Typography variant="h6">{course.course_name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {course.course_id} • {course.professor_name}
            </Typography>
          </Box>
          <CourseGradeBadge
            summary={courseGrades.gradeSummary}
            loading={courseGrades.loading}
          />
        </Stack>

        <GradesGrid courseId={course.id} {...courseGrades} />
      </Stack>
    </Paper>
  );
};

export default CourseGradesOverview;
