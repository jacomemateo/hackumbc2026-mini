import { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  Stack,
  Divider,
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
  APIError,
  type Course,
  type UploadedSyllabus,
} from "@/services/api";
import { CourseGradeBadge } from "./CourseGradeBadge";
import { GradesGrid } from "./DisplayGrades";
import { useCourseGrades } from "./useCourseGrades";

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

const HOME_PAGE_ID = "home";

const Template = () => {
  const [activePage, setActivePage] = useState<string | null>(HOME_PAGE_ID);
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

  const isCourse = (pageId: string | null) =>
    pageId !== null && courses.some((c) => c.id === pageId);

  const activeCourse = courses.find((course) => course.id === activePage) ?? null;
  const activeCourseGrades = useCourseGrades(activeCourse?.id);

  useEffect(() => {
    if (!activeCourse) return;

    let cancelled = false;

    const loadSyllabus = async () => {
      try {
        setLoadingSyllabus(true);
        setSyllabusError(null);
        setSyllabusNotice(null);
        setCurrentSyllabus(null);
        
        const syllabus = await getSyllabusMetadata(activeCourse.id);
        
        if (!cancelled) {
          setCurrentSyllabus(syllabus);
        }
      } catch (err) {
        if (cancelled) return;

        // 2. Use status code checking instead of string matching
        if (err instanceof APIError && err.status === 404) {
          // If 404, we don't set an error or a notice.
          // The UI will naturally show the "Upload Syllabus" button 
          // because currentSyllabus remains null.
          setCurrentSyllabus(null);
        } else {
          console.error("Failed to fetch syllabus metadata:", err);
          setSyllabusError("Failed to load syllabus details.");
        }
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
  const visibleSyllabus = activeCourse ? currentSyllabus : null;
  const visibleSyllabusError = activeCourse ? syllabusError : null;
  const visibleSyllabusNotice = activeCourse ? syllabusNotice : null;
  const visibleLoadingSyllabus = activeCourse ? loadingSyllabus : false;

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
      if (uploaded.parse_status === "PARSED") {
        setSyllabusNotice(`Uploaded ${uploaded.original_filename} successfully.`);
      } else {
        setSyllabusNotice(uploaded.parse_message ?? `Uploaded ${uploaded.original_filename}, but category extraction did not complete.`);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      const message = err instanceof Error ? err.message : "Upload failed.";
      if (message.includes("10MB")) {
        setSyllabusError("The PDF is too large. Maximum size is 10MB.");
      } else if (message.includes("Only PDF")) {
        setSyllabusError("Upload rejected. Only PDF files are supported.");
      } else if (message.includes("Course not found")) {
        setSyllabusError("The selected course could not be found.");
      } else {
        setSyllabusError(message);
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
    <Box style={{ display: "flex", height: "100vh", width: "100%" }}>
      <Box component="nav" style={{ width: DRAWER_WIDTH, flexShrink: 0 }}>
        <Drawer
          variant="permanent"
          open
          slotProps={{
            paper: {
              style: {
                width: DRAWER_WIDTH,
                boxSizing: "border-box",
              },
            },
          }}
        >
          <Box style={{ padding: "20px" }}>
            <Typography variant="h6">Grade Harvester</Typography>
          </Box>
          <Divider />

          <Box style={{ flex: 1, overflow: "auto" }}>
            <List>
              <ListItemButton
                selected={activePage === HOME_PAGE_ID}
                onClick={() => setActivePage(HOME_PAGE_ID)}
              >
                <ListItemIcon>🏠</ListItemIcon>
                <ListItemText primary="Home" />
              </ListItemButton>
            </List>

            <Box style={{ padding: "4px 20px 0" }}>
              <Typography variant="overline" color="text.secondary">
                Grades
              </Typography>
            </Box>

            <List>
              {loadingCourses ? (
                <Box style={{ display: "flex", justifyContent: "center", padding: 20 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : courseError ? (
                <Box style={{ padding: "20px" }}>
                  <Typography variant="body2" color="error.main">
                    {courseError}
                  </Typography>
                </Box>
              ) : coursePages.length === 0 ? (
                <Box style={{ padding: "20px" }}>
                  <Typography variant="body2" color="text.secondary">
                    No courses available
                  </Typography>
                </Box>
              ) : (
                coursePages.map((page) => (
                  <ListItemButton
                    key={page.id}
                    selected={activePage === page.id}
                    onClick={() => setActivePage(page.id)}
                  >
                    <ListItemIcon>{page.icon}</ListItemIcon>
                    <ListItemText primary={page.label} />
                  </ListItemButton>
                ))
              )}
            </List>
          </Box>
        </Drawer>
      </Box>

      <Box style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Box component="header" style={{ padding: "20px 24px" }}>
          <Typography variant="h5">
            {isCourse(activePage) && activeCourse
              ? activeCourse.course_name
              : activePage === HOME_PAGE_ID
                ? "Home"
                : "Grade Tracker"}
          </Typography>
          {isCourse(activePage) && activeCourse && (
            <Typography variant="body2" color="text.secondary">
              {activeCourse.course_id} • {activeCourse.professor_name}
            </Typography>
          )}
          {activePage === HOME_PAGE_ID && (
            <Typography variant="body2" color="text.secondary">
              Start on the homepage, then open a course from the Grades list.
            </Typography>
          )}
        </Box>
        <Divider />

        <Box style={{ flex: 1, padding: 24, overflow: "auto" }}>
          <Stack spacing={2}>
          {activePage === HOME_PAGE_ID && (
            <Box
              style={{
                minHeight: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Paper variant="outlined" style={{ width: "min(100%, 560px)" }}>
                <Stack spacing={1.5} style={{ padding: 32, textAlign: "center" }}>
                  <Typography variant="h5">Click on Grades</Typography>
                  <Typography color="text.secondary">
                    Choose a course from the left sidebar to view its syllabus and grade breakdown.
                  </Typography>
                </Stack>
              </Paper>
            </Box>
          )}

          {isCourse(activePage) && activeCourse && (
            <Paper variant="outlined">
              <Stack spacing={2} style={{ padding: 24 }}>
                <Typography variant="h6">Syllabus</Typography>

                {visibleLoadingSyllabus ? (
                  <Box style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CircularProgress size={20} />
                    <Typography color="text.secondary">Loading syllabus...</Typography>
                  </Box>
                ) : visibleSyllabusError ? (
                  <Alert severity="error">{visibleSyllabusError}</Alert>
                ) : null}

                {visibleSyllabusNotice && (
                  <Alert severity="info">{visibleSyllabusNotice}</Alert>
                )}

                {visibleSyllabus ? (
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    style={{ alignItems: "center", justifyContent: "space-between" }}
                  >
                    <Box>
                      <Typography>{visibleSyllabus.original_filename}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(visibleSyllabus.size_bytes)} • Uploaded{" "}
                        {new Date(visibleSyllabus.uploaded_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        href={getSyllabusDownloadUrl(activeCourse.id)}
                        download
                      >
                        Download
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleUploadClick}
                        disabled={uploadingSyllabus}
                      >
                        {uploadingSyllabus ? "Uploading..." : "Replace"}
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleUploadClick}
                    disabled={uploadingSyllabus}
                  >
                    {uploadingSyllabus ? "Uploading..." : "Upload Syllabus"}
                  </Button>
                )}
              </Stack>
            </Paper>
          )}

          {isCourse(activePage) && activeCourse && (
            <Paper variant="outlined">
              <Stack spacing={2} style={{ padding: 24 }}>
                <Stack
                  direction={{ xs: "column", lg: "row" }}
                  spacing={2}
                  style={{ alignItems: "flex-start", justifyContent: "space-between" }}
                >
                  <Typography variant="h6">Grades</Typography>
                  <CourseGradeBadge
                    summary={activeCourseGrades.gradeSummary}
                    loading={activeCourseGrades.loading}
                  />
                </Stack>
                <GradesGrid courseId={activeCourse.id} {...activeCourseGrades} />
              </Stack>
            </Paper>
          )}

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            style={{ display: "none" }}
            accept=".pdf,application/pdf"
          />
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default Template;
