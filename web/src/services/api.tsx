// src/services/api.tsx

let API_BASE_URL = "http://localhost:8080";
console.log('API Base URL:', API_BASE_URL);

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
    assignment_name: string;
    earned: number | null;
    total: number | null;
    status: GradeStatus;
    posted_date: string;
};

export type CreateCoursePayload = {
    course_name: string;
    course_id: string;
    professor_name: string;
};

export type CreateGradePayload = {
    course_uuid: string;
    assignment_name: string;
    earned?: number;
    total?: number;
    status: GradeStatus;
    posted_date: string;
};

export type UpdateGradePayload = {
    assignment_name?: string;
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

// ─── Internal helpers ─────────────────────────────────────────────────────────

const apiFetch = (input: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    return fetch(input, { ...init, headers });
};

// ─── Health ───────────────────────────────────────────────────────────────────

export const checkHealth = async (): Promise<unknown> => {
    const response = await apiFetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
};

// ─── Courses ──────────────────────────────────────────────────────────────────

export const fetchCourses = async (): Promise<Course[]> => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/courses`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error creating course:', error);
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching grade count:', error);
        throw error;
    }
};

export const createGrade = async (payload: CreateGradePayload): Promise<Grade> => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/grades`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
        console.error(`Error deleting grade ${gradeID}:`, error);
        throw error;
    }
};