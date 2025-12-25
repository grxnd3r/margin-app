import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../../assets/logo.jpg";
import {
  IconLayoutDashboard,
  IconBriefcase2,
  IconDownload,
  IconRefresh,
  IconUpload,
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
  const { state, refresh, exportState, replaceState, mergeState } = useDb();
  const location = useLocation();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState("replace"); // replace | merge
  const [pendingImport, setPendingImport] = useState(null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingStats = useMemo(() => {
    if (!pendingImport) return null;
    const c = Array.isArray(pendingImport.clients) ? pendingImport.clients.length : 0;
    const p = Array.isArray(pendingImport.projects) ? pendingImport.projects.length : 0;
    return { clients: c, projects: p };
  }, [pendingImport]);

  async function onExport() {
    try {
      const data = exportState();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `marginmaster-config-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notifications.show({ color: "teal", title: "Export prêt", message: "Fichier JSON téléchargé." });
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Export échoué",
        message: e?.message || "Impossible d'exporter les données.",
      });
    }
  }

  async function onPickImportFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setPendingImport(parsed);
      setImportModalOpen(true);
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Fichier invalide",
        message: "Ce fichier n'est pas un JSON valide.",
      });
    }
  }

  async function onConfirmImport() {
    if (!pendingImport) return;
    if (importMode === "merge") await mergeState(pendingImport);
    else await replaceState(pendingImport);
    setImportModalOpen(false);
    setPendingImport(null);
  }

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
                backgroundImage: `url(${logo})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                boxShadow:
                  "0 14px 40px rgba(99, 102, 241, 0.20), 0 12px 30px rgba(16, 185, 129, 0.12)",
              }}
            />
            <Stack gap={2}>
              <Title order={3} style={{ letterSpacing: -0.5 }}>
                Marginino
              </Title>
            </Stack>
          </Group>

          <Group gap="xs">
            <Tooltip label="Rafraîchir">
              <ActionIcon
                variant="subtle"
                onClick={async () => {
                  await refresh();
                  notifications.show({ color: "teal", title: "OK", message: "Données rafraîchies." });
                }}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Exporter JSON">
              <ActionIcon variant="subtle" onClick={onExport}>
                <IconDownload size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Importer JSON">
              <ActionIcon
                variant="subtle"
                component="label"
                style={{ position: "relative", overflow: "hidden" }}
              >
                <IconUpload size={18} />
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => onPickImportFile(e.currentTarget.files?.[0] || null)}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                />
              </ActionIcon>
            </Tooltip>
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

        <Modal
          opened={importModalOpen}
          onClose={() => {
            setImportModalOpen(false);
            setPendingImport(null);
          }}
          title={<Text fw={800}>Importer une configuration</Text>}
          centered
          radius="lg"
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {pendingStats
                ? `${pendingStats.clients} clients · ${pendingStats.projects} projets`
                : "Sélection de fichier…"}
            </Text>

            <SegmentedControl
              value={importMode}
              onChange={setImportMode}
              data={[
                { value: "replace", label: "Remplacer" },
                { value: "merge", label: "Fusionner" },
              ]}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setImportModalOpen(false)}>
                Annuler
              </Button>
              <Button color={importMode === "replace" ? "red" : "indigo"} onClick={onConfirmImport}>
                Importer
              </Button>
            </Group>
          </Stack>
        </Modal>
      </AppShell.Main>
    </AppShell>
  );
}


