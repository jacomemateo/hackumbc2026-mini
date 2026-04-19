// src/services/api.tsx

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc';
export type GradeSortBy = 'date' | 'assignment' | 'grade';
export type GradeStatus = 'GRADED' | 'UNGRADED';

export type Course = {
    id: string;
    course_name: string;
    course_id: string;
    professor_name: string;
};

export type Grade = {
    id: string;
    course_uuid: string;
    category_id: string | null;
    category_name: string | null;
    assignment_name: string;
    earned: number | null;
    total: number | null;
    status: GradeStatus;
    posted_date: string;
};

export type Category = {
    id: string;
    course_uuid: string;
    name: string;
    weight: number;
};

export type CreateCoursePayload = {
    course_name: string;
    course_id: string;
    professor_name: string;
};

export type CreateGradePayload = {
    course_uuid: string;
    category_id?: string;
    assignment_name: string;
    earned?: number;
    total?: number;
    status: GradeStatus;
    posted_date: string;
};

export type UpdateGradePayload = {
    assignment_name?: string;
    category_id?: string | null;
    earned?: number;
    total?: number;
    status?: GradeStatus;
    posted_date?: string;
};

export type GradeListOptions = {
    courseId?: string;
    search?: string;
    sortBy?: GradeSortBy;
    sortDir?: SortDirection;
};

export type GradeCountOptions = {
    courseId?: string;
    search?: string;
};

export type UploadedSyllabus = {
    course_id: string;
    original_filename: string;
    content_type: string;
    size_bytes: number;
    uploaded_at: string;
    parse_status: string;
    parse_message?: string;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

export class APIError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

const apiFetch = (input: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    return fetch(input, { ...init, headers });
};

const readAPIError = async (response: Response): Promise<never> => {
    let message = `HTTP error! status: ${response.status}`;

    try {
        const data = await response.json() as { error?: string };
        if (typeof data.error === 'string' && data.error.trim() !== '') {
            message = data.error;
        }
    } catch {
        // Ignore non-JSON error bodies and keep the fallback message.
    }

    throw new APIError(response.status, message);
};

// ─── Health ───────────────────────────────────────────────────────────────────

export const checkHealth = async (): Promise<unknown> => {
    const response = await apiFetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) await readAPIError(response);
    return await response.json();
};

// ─── Courses ──────────────────────────────────────────────────────────────────

export const fetchCourses = async (): Promise<Course[]> => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/courses`);
        if (!response.ok) await readAPIError(response);
        return await response.json();
    } catch (error) {
        console.error('Error fetching courses:', error);
        throw error;
    }
};

export const createCourse = async (payload: CreateCoursePayload): Promise<Course> => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/courses`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (!response.ok) await readAPIError(response);
        return await response.json();
    } catch (error) {
        console.error('Error creating course:', error);
        throw error;
    }
};

export const fetchCourseCategories = async (courseID: string): Promise<Category[]> => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/courses/${courseID}/categories`);
        if (!response.ok) await readAPIError(response);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching categories for course ${courseID}:`, error);
        throw error;
    }
};

// ─── Grades ───────────────────────────────────────────────────────────────────

export const fetchGrades = async (
    numRows: number,
    pageOffset: number,
    options: GradeListOptions = {},
): Promise<Grade[]> => {
    try {
        const params = new URLSearchParams({
            num_rows: numRows.toString(),
            page_offset: pageOffset.toString(),
        });
        if (options.courseId)  params.set('course_id', options.courseId);
        if (options.search)    params.set('search', options.search);
        if (options.sortBy)    params.set('sort_by', options.sortBy);
        if (options.sortDir)   params.set('sort_dir', options.sortDir);

        const response = await apiFetch(
            `${API_BASE_URL}/api/grades?${params.toString()}`,
        );
        if (!response.ok) await readAPIError(response);
        return await response.json();
    } catch (error) {
        console.error('Error fetching grades:', error);
        throw error;
    }
};

export const getGradeCount = async (options: GradeCountOptions = {}): Promise<number> => {
    try {
        const params = new URLSearchParams();
        if (options.courseId) params.set('course_id', options.courseId);
        if (options.search)   params.set('search', options.search);

        const query = params.toString();
        const response = await apiFetch(
            `${API_BASE_URL}/api/grades/count${query ? `?${query}` : ''}`,
        );
        if (!response.ok) await readAPIError(response);
        return await response.json();
    } catch (error) {
        console.error('Error fetching grade count:', error);
        throw error;
    }
};

export const fetchAllGradesForCourse = async (courseId: string): Promise<Grade[]> => {
    const totalRows = await getGradeCount({ courseId });

    if (totalRows === 0) {
        return [];
    }

    return fetchGrades(totalRows, 0, { courseId });
};

export const createGrade = async (payload: CreateGradePayload): Promise<Grade> => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/grades`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (!response.ok) await readAPIError(response);
        return await response.json();
    } catch (error) {
        console.error('Error creating grade:', error);
        throw error;
    }
};

export const updateGrade = async (
    gradeID: string,
    payload: UpdateGradePayload,
): Promise<Grade> => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/grades/${gradeID}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        if (!response.ok) await readAPIError(response);
        return await response.json();
    } catch (error) {
        console.error(`Error updating grade ${gradeID}:`, error);
        throw error;
    }
};

export const deleteGrade = async (gradeID: string): Promise<void> => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/grades/${gradeID}`, {
            method: 'DELETE',
        });
        if (!response.ok) await readAPIError(response);
    } catch (error) {
        console.error(`Error deleting grade ${gradeID}:`, error);
        throw error;
    }
};

// ─── Syllabus Uploads ─────────────────────────────────────────────────────────

export const uploadSyllabus = async (
    courseID: string,
    file: File,
): Promise<UploadedSyllabus> => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await apiFetch(`${API_BASE_URL}/api/courses/${courseID}/syllabus/upload`, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) await readAPIError(response);
        return await response.json();
    } catch (error) {
        console.error(`Error uploading syllabus for course ${courseID}:`, error);
        throw error;
    }
};

export const getSyllabusMetadata = async (courseID: string): Promise<UploadedSyllabus> => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/courses/${courseID}/syllabus`);
        if (!response.ok) await readAPIError(response);
        return await response.json();
    } catch (error) {
        if (!(error instanceof APIError && error.status === 404)) {
            console.error(`Error fetching syllabus for course ${courseID}:`, error);
        }
        throw error;
    }
};

export const getSyllabusDownloadUrl = (courseID: string): string =>
    `${API_BASE_URL}/api/courses/${courseID}/syllabus/download`;
