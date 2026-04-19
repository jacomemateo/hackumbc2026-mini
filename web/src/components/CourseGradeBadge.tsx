import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
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

export const CourseGradeBadge = ({
  summary,
  loading = false,
}: CourseGradeBadgeProps) => {
  const gradeText =
    summary?.percentage === null || summary?.percentage === undefined
      ? "--"
      : `${summary.percentage.toFixed(1)}%`;

  return (
    <Paper variant="outlined">
      <Stack spacing={1.25} style={{ width: "min(100%, 320px)", padding: 20 }}>
        <Typography variant="overline" color="text.secondary">
          Current Grade
        </Typography>

        {loading ? (
          <Box style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 60 }}>
            <CircularProgress size={24} />
            <Typography>Calculating...</Typography>
          </Box>
        ) : (
          <>
            <Typography variant="h3">{gradeText}</Typography>
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
