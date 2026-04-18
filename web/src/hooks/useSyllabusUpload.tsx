import { useState } from "react";
import { uploadSyllabus } from "../services/syllabusService";
import type { SyllabusFile } from "../services/syllabusService";

interface UploadState {
  loading: boolean;
  error: string | null;
  data: SyllabusFile | null;
}

export const useSyllabusUpload = () => {
  const [state, setState] = useState<UploadState>({
    loading: false,
    error: null,
    data: null,
  });

  const handleUpload = async (courseId: string, file: File) => {
    setState({ loading: true, error: null, data: null });
    try {
      const result = await uploadSyllabus(courseId, file);
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      setState({ loading: false, error, data: null });
      throw err;
    }
  };

  return { ...state, handleUpload };
};
