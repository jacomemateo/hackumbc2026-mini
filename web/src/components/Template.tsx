import { useState } from "react";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Paper,
} from "@mui/material";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const Template = () => {
  const [activePage, setActivePage] = useState("home");

  const pages: NavItem[] = [
    {
      id: "home",
      label: "Home",
      icon: "🏠",
      path: "",
    },
    {
      id: "course-cs101",
      label: "CS 101",
      icon: "📚",
      path: "course-cs101",
    },
    {
      id: "course-math201",
      label: "Math 201",
      icon: "📊",
      path: "course-math201",
    },
    {
      id: "course-physics301",
      label: "Physics 301",
      icon: "⚗️",
      path: "course-physics301",
    },
    {
      id: "course-eng150",
      label: "English 150",
      icon: "📖",
      path: "course-eng150",
    },
    {
      id: "settings",
      label: "Settings",
      icon: "⚙️",
      path: "settings",
    },
  ];

  const DRAWER_WIDTH = 250;

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
              background: "linear-gradient(135deg, #3498db, #4E9A90)",
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
            Academic Pilot
          </Typography>
        </Box>

        {/* Navigation */}
        <List
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "20px 12px",
          }}
        >
          {pages.map((page) => (
            <ListItemButton
              key={page.id}
              selected={activePage === page.id}
              onClick={() => setActivePage(page.id)}
              sx={{
                borderRadius: "8px",
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
                  minWidth: "40px",
                },
              }}
            >
              <ListItemIcon sx={{ fontSize: "18px" }}>
                {page.icon}
              </ListItemIcon>
              <ListItemText
                primary={page.label}
                primaryTypographyProps={{
                  sx: { fontSize: "14px", fontWeight: 500 },
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
          background: "#ffffff",
          overflow: "hidden",
        }}
      >
        {/* Content Header */}
        <Paper
          elevation={0}
          sx={{
            padding: "24px",
            borderBottom: "1px solid #e0e0e0",
            backgroundColor: "#f9f9f9",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              margin: 0,
              color: "#2c3e50",
              fontSize: "24px",
              fontWeight: 600,
            }}
          >
            {pages.find((p) => p.id === activePage)?.label}
          </Typography>
        </Paper>

        {/* Content Body */}
        <Box
          sx={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
          }}
        />
      </Box>
    </Box>
  );
};

export default Template;
