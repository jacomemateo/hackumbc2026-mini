import {
  getSyllabusMetadata,
  getSyllabusDownloadUrl,
  uploadSyllabus,
  type UploadedSyllabus,
} from "@/services/api";

export type SyllabusFile = UploadedSyllabus;

export { getSyllabusDownloadUrl, getSyllabusMetadata, uploadSyllabus };
