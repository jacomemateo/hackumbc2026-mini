import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { gradeColors } from "@/theme";
import type { CourseGradeSummary } from "./courseGradeSummary";

const formatWeight = (weight: number) => {
  if (Number.isInteger(weight)) {
    return weight.toFixed(0);
  }

  return weight.toFixed(1);
};

interface CourseGradeBadgeProps {
  summary?: CourseGradeSummary | null;
  loading?: boolean;
}

const getGradeTone = (percentage?: number | null) => {
  if (percentage === null || percentage === undefined) {
    return gradeColors.noGrade;
  }

  if (percentage > 90) {
    return gradeColors.above90;
  }

  if (percentage > 80) {
    return gradeColors.above80;
  }

  if (percentage > 70) {
    return gradeColors.above70;
  }

  if (percentage > 60) {
    return gradeColors.above60;
  }

  return gradeColors.below60;
};

export const CourseGradeBadge = ({
  summary,
  loading = false,
}: CourseGradeBadgeProps) => {
  const tone = getGradeTone(summary?.percentage);
  const gradeText =
    summary?.percentage === null || summary?.percentage === undefined
      ? "--"
      : `${summary.percentage.toFixed(1)}%`;

  return (
    <Paper
      variant="outlined"
      style={{
        borderColor: tone.border,
        backgroundColor: tone.background,
        boxShadow: `0 18px 40px ${tone.shadow}`,
      }}
    >
      <Stack spacing={1.25} style={{ width: "min(100%, 320px)", padding: 20 }}>
        <Typography variant="overline" color="text.secondary">
          Current Grade
        </Typography>

        {loading ? (
          <Box style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 60 }}>
            <CircularProgress size={24} style={{ color: tone.accent }} />
            <Typography>Calculating...</Typography>
          </Box>
        ) : (
          <>
            <Typography variant="h3" style={{ color: tone.accent }}>
              {gradeText}
            </Typography>
            <Typography>
              {summary?.percentage === null || summary?.percentage === undefined
                ? "Waiting for graded work with a category."
                : `${summary.gradedAssignments} graded assignment${
                    summary.gradedAssignments === 1 ? "" : "s"
                  } across ${summary.gradedCategories} categor${
                    summary.gradedCategories === 1 ? "y" : "ies"
                  }.`}
            </Typography>
            {summary?.percentage !== null && summary?.percentage !== undefined && (
              <Typography variant="body2" color="text.secondary">
                Based on {formatWeight(summary.trackedWeight)}% of the syllabus weight.
              </Typography>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
};
