import { Box, CircularProgress, Typography } from "@mui/material";
import type { CourseGradeSummary } from "./courseGradeSummary";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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
  const colorStop =
    summary?.percentage === null || summary?.percentage === undefined
      ? 215
      : clamp(summary.percentage, 0, 100) * 1.2;
  const accent = `hsl(${colorStop}, 76%, 46%)`;
  const accentSoft = `hsla(${colorStop}, 80%, 58%, 0.28)`;
  const accentGlow = `hsla(${colorStop}, 80%, 58%, 0.22)`;
  const gradeText =
    summary?.percentage === null || summary?.percentage === undefined
      ? "--"
      : `${summary.percentage.toFixed(1)}%`;

  return (
    <Box
      sx={{
        minWidth: { xs: "100%", sm: 220 },
        padding: "18px 20px",
        borderRadius: "20px",
        border: `1px solid ${accentSoft}`,
        background: `linear-gradient(135deg, ${accentSoft} 0%, rgba(10, 14, 28, 0.92) 100%)`,
        boxShadow: `0 14px 34px ${accentGlow}`,
        backdropFilter: "blur(10px)",
      }}
    >
      <Typography
        variant="overline"
        sx={{
          color: "rgba(236, 240, 241, 0.78)",
          letterSpacing: "0.18em",
          display: "block",
          marginBottom: "6px",
        }}
      >
        Current Grade
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px", minHeight: "60px" }}>
          <CircularProgress size={24} sx={{ color: accent }} />
          <Typography sx={{ color: "#ecf0f1" }}>Calculating...</Typography>
        </Box>
      ) : (
        <>
          <Typography
            sx={{
              color: "#f7f9fb",
              fontSize: { xs: "2.1rem", sm: "2.8rem" },
              lineHeight: 1,
              fontWeight: 800,
            }}
          >
            {gradeText}
          </Typography>
          <Typography sx={{ color: "rgba(236, 240, 241, 0.82)", marginTop: "10px" }}>
            {summary?.percentage === null || summary?.percentage === undefined
              ? "Waiting for graded work with a category."
              : `${summary.gradedAssignments} graded assignment${
                  summary.gradedAssignments === 1 ? "" : "s"
                } across ${summary.gradedCategories} categor${
                  summary.gradedCategories === 1 ? "y" : "ies"
                }.`}
          </Typography>
          {summary?.percentage !== null && summary?.percentage !== undefined && (
            <Typography sx={{ color: "rgba(236, 240, 241, 0.65)", marginTop: "4px" }}>
              Based on {formatWeight(summary.trackedWeight)}% of the syllabus weight.
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};
