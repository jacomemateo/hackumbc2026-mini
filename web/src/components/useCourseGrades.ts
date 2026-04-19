import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAllGradesForCourse,
  fetchCourseCategories,
  updateGrade,
  type Category,
  type Grade,
} from "@/services/api";
import {
  calculateCourseGradeSummary,
  type CourseGradeSummary,
} from "./courseGradeSummary";

export type CourseGradesData = {
  grades: Grade[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  updatingGradeIDs: Record<string, boolean>;
  gradeSummary: CourseGradeSummary;
  handleCategoryChange: (gradeID: string, category: Category | null) => Promise<void>;
};

export const useCourseGrades = (courseId?: string): CourseGradesData => {
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

    void loadGrades();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const handleCategoryChange = useCallback(
    async (gradeID: string, category: Category | null) => {
      try {
        setError(null);
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
    },
    [],
  );

  const gradeSummary = useMemo(
    () => calculateCourseGradeSummary(grades, categories),
    [grades, categories],
  );

  return {
    grades,
    categories,
    loading,
    error,
    updatingGradeIDs,
    gradeSummary,
    handleCategoryChange,
  };
};
