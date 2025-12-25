import React, { useEffect } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconLayoutDashboard,
  IconBriefcase2,
  IconRefresh,
} from "@tabler/icons-react";

import { useDb } from "../state/db.jsx";
import { Dashboard } from "./Dashboard.jsx";
import { Projects } from "./Projects.jsx";
import { ProjectEditor } from "./ProjectEditor.jsx";

function ShellNavLink({ to, icon: Icon, label, badge }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        textDecoration: "none",
        borderRadius: 12,
        padding: "10px 12px",
        display: "block",
        color: "var(--mantine-color-text)",
        background: isActive
          ? "rgba(99, 102, 241, 0.18)"
          : "rgba(255,255,255,0.04)",
        border: isActive
          ? "1px solid rgba(99, 102, 241, 0.35)"
          : "1px solid rgba(255,255,255,0.06)",
      })}
    >
      <Group justify="space-between" align="center" gap="xs">
        <Group gap="sm">
          <Icon size={18} style={{ opacity: 0.9 }} />
          <Text fw={600} size="sm">
            {label}
          </Text>
        </Group>
        {badge ? (
          <Badge variant="light" color="indigo" radius="sm">
            {badge}
          </Badge>
        ) : null}
      </Group>
    </NavLink>
  );
}

export function App() {
  const { state, refresh } = useDb();
  const location = useLocation();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 280, breakpoint: "sm" }}
      padding="lg"
    >
      <AppShell.Header
        style={{
          background: "rgba(7,11,20,0.72)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="sm">
            <Box
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(16, 185, 129, 0.7))",
                boxShadow:
                  "0 14px 40px rgba(99, 102, 241, 0.20), 0 12px 30px rgba(16, 185, 129, 0.12)",
              }}
            />
            <Stack gap={2}>
              <Title order={3} style={{ letterSpacing: -0.5 }}>
                MarginMaster
              </Title>
            </Stack>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="lg"
        style={{
          background: "rgba(7,11,20,0.52)",
          backdropFilter: "blur(16px)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Stack gap="md">
          <ShellNavLink
            to="/"
            icon={IconLayoutDashboard}
            label="Dashboard"
          />
          <ShellNavLink
            to="/projects"
            icon={IconBriefcase2}
            label="Projets"
            badge={String(state.projects?.length || 0)}
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <div style={{ position: "relative", height: "100%", width: "100%" }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{ height: "100%", width: "100%" }}
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects/*" element={<Projects />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </AppShell.Main>
    </AppShell>
  );
}


