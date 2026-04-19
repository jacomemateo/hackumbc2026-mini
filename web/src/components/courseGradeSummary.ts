import type { Category, Grade } from "@/services/api";

export type CourseGradeSummary = {
  percentage: number | null;
  trackedWeight: number;
  gradedCategories: number;
  totalCategories: number;
  gradedAssignments: number;
};

export const calculateCourseGradeSummary = (
  grades: Grade[],
  categories: Category[],
): CourseGradeSummary => {
  const categoryWeights = new Map(
    categories.map((category) => [category.id, category.weight]),
  );
  const weightedCategoryTotals = new Map<
    string,
    { earned: number; total: number; weight: number }
  >();

  let gradedAssignments = 0;

  for (const grade of grades) {
    if (
      grade.status !== "GRADED" ||
      !grade.category_id ||
      grade.earned === null ||
      grade.total === null ||
      grade.total <= 0
    ) {
      continue;
    }

    const weight = categoryWeights.get(grade.category_id);
    if (weight === undefined) {
      continue;
    }

    gradedAssignments += 1;

    const existing =
      weightedCategoryTotals.get(grade.category_id) ?? {
        earned: 0,
        total: 0,
        weight,
      };

    existing.earned += grade.earned;
    existing.total += grade.total;
    weightedCategoryTotals.set(grade.category_id, existing);
  }

  let trackedWeight = 0;
  let weightedScore = 0;

  for (const category of weightedCategoryTotals.values()) {
    if (category.total <= 0) {
      continue;
    }

    trackedWeight += category.weight;
    weightedScore += (category.earned / category.total) * category.weight;
  }

  if (trackedWeight <= 0) {
    return {
      percentage: null,
      trackedWeight: 0,
      gradedCategories: 0,
      totalCategories: categories.length,
      gradedAssignments,
    };
  }

  return {
    percentage: (weightedScore / trackedWeight) * 100,
    trackedWeight,
    gradedCategories: weightedCategoryTotals.size,
    totalCategories: categories.length,
    gradedAssignments,
  };
};
