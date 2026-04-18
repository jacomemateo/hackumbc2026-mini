import { useState, useRef, useEffect } from "react";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  fetchCourses,
  getSyllabusDownloadUrl,
  getSyllabusMetadata,
  uploadSyllabus,
  type Course,
  type UploadedSyllabus,
} from "@/services/api";
import CourseGradesOverview from "./CourseGradesOverview";
import { GradesTable } from "./DisplayGrades";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const courseToNavItem = (course: Course): NavItem => ({
  id: course.id,
  label: course.course_name,
  icon: "📚",
  path: `course-${course.course_id}`,
});

const ALL_COURSES_PAGE_ID = "all-courses";

const Template = () => {
  const [activePage, setActivePage] = useState<string | null>(ALL_COURSES_PAGE_ID);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [uploadingSyllabus, setUploadingSyllabus] = useState(false);
  const [syllabusError, setSyllabusError] = useState<string | null>(null);
  const [syllabusNotice, setSyllabusNotice] = useState<string | null>(null);
  const [currentSyllabus, setCurrentSyllabus] = useState<UploadedSyllabus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        setCourseError(null);
        const data = await fetchCourses();
        const safe = data ?? [];
        setCourses(safe);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setCourseError("Failed to load courses.");
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, []);

  const coursePages = (courses ?? []).map(courseToNavItem);
  const allPages = [
    { id: ALL_COURSES_PAGE_ID, label: "All Courses", icon: "🗂️", path: ALL_COURSES_PAGE_ID },
    ...coursePages,
  ];

  const isCourse = (pageId: string | null) =>
    pageId !== null && courses.some((c) => c.id === pageId);

  const activeCourse = courses.find((course) => course.id === activePage) ?? null;

  useEffect(() => {
    if (!activeCourse) {
      setCurrentSyllabus(null);
      setSyllabusError(null);
      setSyllabusNotice(null);
      setLoadingSyllabus(false);
      return;
    }

    let cancelled = false;

    const loadSyllabus = async () => {
      try {
        setLoadingSyllabus(true);
        setSyllabusError(null);
        setSyllabusNotice(null);
        const syllabus = await getSyllabusMetadata(activeCourse.id);
        if (!cancelled) {
          setCurrentSyllabus(syllabus);
        }
      } catch (err) {
        if (cancelled) return;

        const message = err instanceof Error ? err.message : "Unknown error";
        if (message.includes("404")) {
          setSyllabusNotice("No syllabus uploaded for this course yet.");
        } else {
          console.error("Failed to fetch syllabus metadata:", err);
          setSyllabusError("Failed to load syllabus details.");
        }
        setCurrentSyllabus(null);
      } finally {
        if (!cancelled) {
          setLoadingSyllabus(false);
        }
      }
    };

    loadSyllabus();

    return () => {
      cancelled = true;
    };
  }, [activeCourse]);

  const DRAWER_WIDTH = 250;

  const handleUploadClick = () => {
    setSyllabusNotice(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !activeCourse) {
      event.target.value = "";
      return;
    }

    setSyllabusNotice(null);
    setSyllabusError(null);

    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
      setSyllabusError("Only PDF files are supported.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingSyllabus(true);
      const uploaded = await uploadSyllabus(activeCourse.id, file);
      setCurrentSyllabus(uploaded);
      setSyllabusNotice(`Uploaded ${uploaded.original_filename} successfully.`);
    } catch (err) {
      console.error("Upload failed:", err);
      const message = err instanceof Error ? err.message : "Upload failed.";
      if (message.includes("413")) {
        setSyllabusError("The PDF is too large. Maximum size is 10MB.");
      } else if (message.includes("400")) {
        setSyllabusError("Upload rejected. Only PDF files are supported.");
      } else if (message.includes("404")) {
        setSyllabusError("The selected course could not be found.");
      } else {
        setSyllabusError("Upload failed. Please try again.");
      }
    } finally {
      setUploadingSyllabus(false);
      event.target.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100%" }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            background: `linear-gradient(180deg, #262B49 0%, #181822 100%)`,
            color: "#ecf0f1",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Header */}
        <Box sx={{ padding: "20px", borderBottom: "1px solid #444" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            🪏 Grade Harvester
          </Typography>
        </Box>

        {/* Navigation */}
        <List sx={{ flex: 1, overflowY: "auto" }}>
          {loadingCourses ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: "20px" }}>
              <CircularProgress size={24} />
            </Box>
          ) : courseError ? (
            <Typography sx={{ padding: "20px", color: "#f44336", fontSize: "0.875rem" }}>
              {courseError}
            </Typography>
          ) : allPages.length === 0 ? (
            <Typography sx={{ padding: "20px", color: "#aaa", fontSize: "0.875rem" }}>
              No courses available
            </Typography>
          ) : (
            allPages.map((page) => (
              <ListItemButton
                key={page.id}
                selected={activePage === page.id}
                onClick={() => setActivePage(page.id)}
                sx={{
                  color: activePage === page.id ? "#fff" : "#aaa",
                  backgroundColor: activePage === page.id ? "rgba(255, 255, 255, 0.1)" : "transparent",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" },
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: "40px" }}>
                  {page.icon}
                </ListItemIcon>
                <ListItemText primary={page.label} />
              </ListItemButton>
            ))
          )}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(180deg, #262B49 0%, #181822 100%)`,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            padding: "20px 24px",
            // borderBottom: "1px solid #444",
            color: "#ecf0f1",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {isCourse(activePage) && activeCourse
              ? activeCourse.course_name
              : activePage === ALL_COURSES_PAGE_ID
                ? "All Course Grades"
                : "Grade Tracker"}
          </Typography>
          {isCourse(activePage) && activeCourse && (
            <Typography variant="body2" sx={{ color: "#aaa", marginTop: "4px" }}>
              {activeCourse.course_id} • {activeCourse.professor_name}
            </Typography>
          )}
          {activePage === ALL_COURSES_PAGE_ID && (
            <Typography variant="body2" sx={{ color: "#aaa", marginTop: "4px" }}>
              Browse every course and its assignments in one place.
            </Typography>
          )}
        </Box>

        {/* Content Body */}
        <Box
          sx={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {activePage === ALL_COURSES_PAGE_ID && (
            <CourseGradesOverview
              courses={courses}
              loading={loadingCourses}
              error={courseError}
            />
          )}

          {/* Syllabus Section - Only show for course pages */}
          {isCourse(activePage) && activeCourse && (
            <Box
              sx={{
                padding: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                border: "1px solid #444",
              }}
            >
              <Typography variant="h6" sx={{ color: "#ecf0f1", marginBottom: "12px" }}>
                Syllabus
              </Typography>

              {loadingSyllabus ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CircularProgress size={20} />
                  <Typography sx={{ color: "#aaa" }}>Loading syllabus...</Typography>
                </Box>
              ) : syllabusError ? (
                <Alert severity="error" sx={{ marginBottom: "12px" }}>
                  {syllabusError}
                </Alert>
              ) : null}

              {syllabusNotice && (
                <Alert severity="info" sx={{ marginBottom: "12px" }}>
                  {syllabusNotice}
                </Alert>
              )}

              {currentSyllabus ? (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography sx={{ color: "#ecf0f1", fontWeight: "500" }}>
                      {currentSyllabus.original_filename}
                    </Typography>
                    <Typography sx={{ color: "#aaa", fontSize: "0.875rem" }}>
                      {formatFileSize(currentSyllabus.size_bytes)} • Uploaded{" "}
                      {new Date(currentSyllabus.uploaded_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: "8px" }}>
                    <Button
                      variant="outlined"
                      size="small"
                      href={getSyllabusDownloadUrl(activeCourse.id)}
                      download
                      sx={{ color: "#ecf0f1", borderColor: "#666" }}
                    >
                      Download
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleUploadClick}
                      disabled={uploadingSyllabus}
                      sx={{ color: "#ecf0f1", borderColor: "#666" }}
                    >
                      {uploadingSyllabus ? "Uploading..." : "Replace"}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleUploadClick}
                  disabled={uploadingSyllabus}
                  sx={{
                    backgroundColor: "#4CAF50",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#45a049" },
                  }}
                >
                  {uploadingSyllabus ? "Uploading..." : "Upload Syllabus"}
                </Button>
              )}
            </Box>
          )}

          {/* Grades Table - Only show for course pages */}
          {isCourse(activePage) && activeCourse && (
            <Box
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                border: "1px solid #444",
                padding: "16px",
              }}
            >
              <Typography variant="h6" sx={{ color: "#ecf0f1", marginBottom: "12px" }}>
                Grades
              </Typography>
              <Box sx={{ width: "100%" }}>
                <GradesTable courseId={activeCourse.id} />
              </Box>
            </Box>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            style={{ display: "none" }}
            accept=".pdf,application/pdf"
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Template;
