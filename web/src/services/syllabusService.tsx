const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export interface GradeComponent {
  name: string;
  percentage: number;
  specialRules?: string[];
}

export interface SyllabusAnalysis {
  courseId: string;
  courseName: string;
  gradeComponents: GradeComponent[];
  specialRules: string[];
  rawText?: string;
  uploadedAt: string;
}

export const uploadSyllabus = async (
  courseId: string,
  file: File
): Promise<SyllabusAnalysis> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("courseId", courseId);

  const response = await fetch(
    `${API_BASE}/api/courses/${courseId}/syllabus/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
};

export const getSyllabusAnalysis = async (
  courseId: string
): Promise<SyllabusAnalysis> => {
  const response = await fetch(
    `${API_BASE}/api/courses/${courseId}/syllabus`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch syllabus: ${response.statusText}`);
  }

  return response.json();
};