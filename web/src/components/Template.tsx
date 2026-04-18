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
} from "@mui/material";
import { fetchCourses, type Course } from "@/services/api";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const STATIC_PAGES: NavItem[] = [
  {
    id: "settings",
    label: "Settings",
    icon: "⚙️",
    path: "settings",
  },
];

const courseToNavItem = (course: Course): NavItem => ({
  id: course.id,
  label: course.course_name,
  icon: "📚",
  path: `course-${course.course_id}`,
});

const Template = () => {
  const [activePage, setActivePage] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        setCourseError(null);
        const data = await fetchCourses();
        const safe = data ?? [];
        setCourses(safe);
        if (safe.length > 0) {
          setActivePage(safe[0].id);
        }
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
  const allPages = [...coursePages, ...STATIC_PAGES];

  const isCourse = (pageId: string | null) =>
    pageId !== null && courses.some((c) => c.id === pageId);

  const DRAWER_WIDTH = 250;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files && activePage) {
      Array.from(files).forEach(async (file) => {
        try {
          // const analysis = await handleUpload(activePage, file);
          // console.log("Syllabus analyzed:", analysis);
        } catch (err) {
          console.error("Upload failed:", err);
        }
      });
    }
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
        {/* Logo Section */}
        <Box
          sx={{
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Box
            sx={{
              fontSize: "32px",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg, rgb(52, 152, 219), rgb(78, 154, 144))",
              borderRadius: "8px",
            }}
          >
            📌
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              letterSpacing: "0.5px",
              margin: 0,
              color: "#ecf0f1",
            }}
          >
            Grade Harvester
          </Typography>
        </Box>

        {/* Navigation */}
        <List
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "16px 12px",
            flex: 1,
          }}
        >
          {/* Course loading state */}
          {loadingCourses && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={20} sx={{ color: "#bdc3c7" }} />
            </Box>
          )}

          {/* Course error state */}
          {courseError && !loadingCourses && (
            <Typography
              sx={{ fontSize: "12px", color: "#e74c3c", px: 1, py: 1 }}
            >
              {courseError}
            </Typography>
          )}

          {/* Empty state */}
          {!loadingCourses && !courseError && courses.length === 0 && (
            <Typography
              sx={{ fontSize: "12px", color: "#7f8c8d", px: 1, py: 1 }}
            >
              No courses yet
            </Typography>
          )}

          {/* Course + static nav items */}
          {!loadingCourses &&
            allPages.map((page) => (
              <ListItemButton
                key={page.id}
                selected={activePage === page.id}
                onClick={() => setActivePage(page.id)}
                sx={{
                  borderRadius: "6px",
                  padding: "6px 10px",
                  minHeight: "unset",
                  color: activePage === page.id ? "#ffffff" : "#bdc3c7",
                  background:
                    activePage === page.id
                      ? "linear-gradient( #3498db)"
                      : "transparent",
                  boxShadow:
                    activePage === page.id
                      ? "0 4px 12px rgba(52, 152, 219, 0.3)"
                      : "none",
                  "&:hover": {
                    backgroundColor: "rgba(78, 154, 144, 0.2)",
                  },
                  "& .MuiListItemIcon-root": {
                    color: "inherit",
                    minWidth: "32px",
                  },
                }}
              >
                <ListItemIcon sx={{ fontSize: "15px" }}>
                  {page.icon}
                </ListItemIcon>
                <ListItemText
                  primary={page.label}
                  primaryTypographyProps={{
                    sx: { fontSize: "13px", fontWeight: 500, lineHeight: 1.2 },
                  }}
                />
              </ListItemButton>
            ))}
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
          {/* Upload Syllabus Button - Only show for course pages */}
          {isCourse(activePage) && (
            <Button
              variant="contained"
              onClick={handleUploadClick}
              sx={{
                alignSelf: "flex-start",
                backgroundColor: "#3498db",
                "&:hover": {
                  backgroundColor: "#2980b9",
                },
              }}
            >
              ⬆ Upload Syllabus
            </Button>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            multiple
            style={{ display: "none" }}
            accept=".pdf,.doc,.docx,.txt"
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Template;