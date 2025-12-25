import React, { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconArrowLeft,
  IconChevronRight,
  IconPlus,
  IconSearch,
  IconUsers,
  IconBriefcase2,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { nanoid } from "nanoid";

import { useDb } from "../state/db.jsx";
import { calcTotals } from "../lib/margin.js";
import { EUR, formatPct } from "../lib/format.js";
import { ProjectEditor } from "./ProjectEditor.jsx";
import { fileToDataUrl } from "../lib/image.js";

function statusColor(status) {
  if (status === "Active") return "indigo";
  if (status === "Completed") return "teal";
  if (status === "Cancelled") return "red";
  return "gray";
}

function sortByLastAdded(a, b) {
  const ak = String(a?.createdAt || a?.date || a?.updatedAt || "");
  const bk = String(b?.createdAt || b?.date || b?.updatedAt || "");
  return bk.localeCompare(ak);
}

function SquareAvatar({ src, label, size = 54 }) {
  return (
    <Avatar
      src={src || null}
      size={size}
      radius={14}
      color="indigo"
      styles={{
        root: {
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.06)",
        },
      }}
    >
      {String(label || "?").slice(0, 1).toUpperCase()}
    </Avatar>
  );
}

function ProjectsListView() {
  const { state, upsertProject } = useDb();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const clientsById = useMemo(() => {
    const m = new Map();
    for (const c of state.clients || []) {
      if (c && typeof c.id === "string" && c.id) m.set(c.id, c);
    }
    return m;
  }, [state.clients]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const projects = state.projects || [];

    const matches = (p) => {
      if (!query) return true;
      const clientName = (clientsById.get(p.clientId)?.name || "").toLowerCase();
      const title = (p.title || "").toLowerCase();
      const products = (p.products || [])
        .map((x) => (x?.title || "").toLowerCase())
        .join(" ");
      return (
        clientName.includes(query) || title.includes(query) || products.includes(query)
      );
    };

    return projects
      .filter(matches)
      .map((p) => {
        const t = calcTotals(p.products);
        return {
          ...p,
          clientName: clientsById.get(p.clientId)?.name || "No client",
          totals: t,
        };
      })
      .sort(sortByLastAdded);
  }, [state.projects, clientsById, q]);

  async function onNewProject() {
    const id = nanoid();
    const created = await upsertProject({
      id,
      title: "New Project",
      clientId:
        (state.clients || []).find((c) => c && typeof c.id === "string" && c.id)?.id || null,
      status: "Draft",
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      products: [],
    });
    navigate(`/projects/edit/${created.id}`);
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={2} style={{ letterSpacing: -0.7 }}>
            Projets
          </Title>
        </Stack>
        <Button leftSection={<IconPlus size={16} />} onClick={onNewProject}>
          Nouveau projet
        </Button>
      </Group>

      <TextInput
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        placeholder="Rechercher: client, projet ou produit"
        radius="md"
        size="md"
        styles={{
          input: {
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      />

      {!rows.length ? (
          <Card
            radius="lg"
            p="xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.14)",
            }}
          >
            <Stack gap={6} align="center">
              <Title order={4}>Aucun projet trouvé</Title>
              <Text c="dimmed" size="sm">
                Essayez de rechercher par nom de client ou par titre de projet ou par nom de produit.
              </Text>
            </Stack>
          </Card>
        ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          <AnimatePresence initial={false}>
            {rows.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, delay: Math.min(idx * 0.012, 0.12) }}
              >
                <Card
                  radius="lg"
                  p="lg"
                  onClick={() => navigate(`/projects/edit/${p.id}`)}
                  style={{
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    height: "100%",
                  }}
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                        <SquareAvatar src={p.image} label={p.title} />
                        <Stack gap={2} style={{ minWidth: 0 }}>
                          <Text fw={800} size="md" style={{ letterSpacing: -0.2 }} lineClamp={2}>
                            {p.title || "Untitled Project"}
                          </Text>
                          <Text c="dimmed" size="xs" lineClamp={1}>
                            {p.clientName} · {dayjs(p.date || p.createdAt).format("D MMM YYYY")}
                          </Text>
                        </Stack>
                      </Group>
                      <Badge color={statusColor(p.status)} variant="light" radius="sm">
                        {p.status || "Draft"}
                      </Badge>
                    </Group>

                    <Group gap="lg" justify="space-between">
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed" fw={700}>
                          Produits
                        </Text>
                        <Text fw={800}>{(p.products || []).length}</Text>
                      </Stack>
                      <Stack gap={0} style={{ textAlign: "right" }}>
                        <Text size="xs" c="dimmed" fw={700}>
                          Bénéfice
                        </Text>
                        <Text fw={800} c={p.totals.profit >= 0 ? "teal" : "red"}>
                          {EUR.format(p.totals.profit)}
                        </Text>
                      </Stack>
                      <Stack gap={0} style={{ textAlign: "right" }}>
                        <Text size="xs" c="dimmed" fw={700}>
                          Marge
                        </Text>
                        <Text fw={800}>{formatPct(p.totals.marginPct)}</Text>
                      </Stack>
                    </Group>
                  </Stack>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </SimpleGrid>
      )}
    </Stack>
  );
}

function ClientsListView() {
  const { state, upsertClient } = useDb();
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [image, setImage] = useState(null);

  const byClientId = useMemo(() => {
    const m = new Map();
    for (const p of state.projects || []) {
      if (!p?.clientId) continue;
      const prev = m.get(p.clientId) || { projectCount: 0, revenue: 0, profit: 0 };
      const t = calcTotals(p.products || []);
      prev.projectCount += 1;
      prev.revenue += t.revenue;
      prev.profit += t.profit;
      m.set(p.clientId, prev);
    }
    return m;
  }, [state.projects]);

  const clients = useMemo(() => {
    const query = q.trim().toLowerCase();
    return [...(state.clients || [])]
      .filter((c) => {
        if (!query) return true;
        return String(c?.name || "").toLowerCase().includes(query);
      })
      .map((c) => {
        const s = byClientId.get(c.id) || { projectCount: 0, revenue: 0, profit: 0 };
        const avgMarginPct = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;
        return { ...c, stats: { ...s, avgMarginPct } };
      })
      .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
  }, [state.clients, byClientId, q]);

  async function onCreateClient() {
    const n = name.trim();
    if (!n) return;
    await upsertClient({ name: n, image });
    setName("");
    setImage(null);
    setOpened(false);
  }

  async function onPickClientImage(file) {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file, { maxSize: 256 });
      setImage(dataUrl);
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Erreur lors du chargement de l'image",
        message: e?.message || "Impossible de charger l'image.",
      });
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={2} style={{ letterSpacing: -0.7 }}>
            Clients
          </Title>
          <Text c="dimmed" size="sm">
            Cliquez sur un client pour voir tous ses projets
          </Text>
        </Stack>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setOpened(true)}>
          Nouveau client
        </Button>
      </Group>

      <TextInput
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        placeholder="Rechercher un client…"
        radius="md"
        size="md"
        styles={{
          input: {
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      />

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={<Text fw={800}>Ajouter un client</Text>}
        centered
        radius="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Nom du client"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Exemple: GoreTex"
            autoFocus
          />

          <Group justify="space-between" align="center">
            <Group gap="sm">
              <SquareAvatar src={image} label={name || "C"} size={48} />
              <Stack gap={0}>
                <Text size="sm" fw={700}>
                  Image
                </Text>
                <Text size="xs" c="dimmed">
                  Carré
                </Text>
              </Stack>
            </Group>
            <Group gap="xs">
              <Button
                variant="light"
                component="label"
                style={{ position: "relative", overflow: "hidden" }}
              >
                Ajouter
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickClientImage(e.currentTarget.files?.[0] || null)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                  }}
                />
              </Button>
              {image ? (
                <Button variant="subtle" color="red" onClick={() => setImage(null)}>
                  Remove
                </Button>
              ) : null}
            </Group>
          </Group>

          <Button onClick={onCreateClient}>Create</Button>
        </Stack>
      </Modal>

      {!clients.length ? (
          <Card
            radius="lg"
            p="xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.14)",
            }}
          >
            <Stack gap={6} align="center">
              <Title order={4}>Pas encore de client</Title>
              <Text c="dimmed" size="sm">
                Créez votre premier client pour commencer.
              </Text>
            </Stack>
          </Card>
        ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          <AnimatePresence initial={false}>
            {clients.map((c, idx) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, delay: Math.min(idx * 0.010, 0.12) }}
              >
                <Card
                  radius="lg"
                  p="lg"
                  onClick={() => navigate(`/projects/clients/${c.id}`)}
                  style={{
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    height: "100%",
                  }}
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                        <SquareAvatar src={c.image} label={c.name} />
                        <Stack gap={2} style={{ minWidth: 0 }}>
                          <Text fw={800} size="md" style={{ letterSpacing: -0.2 }} lineClamp={2}>
                            {c.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Client
                          </Text>
                        </Stack>
                      </Group>
                      <IconChevronRight size={18} style={{ opacity: 0.55, marginTop: 6 }} />
                    </Group>

                    <Group gap="lg" justify="space-between">
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed" fw={700}>
                          Projets
                        </Text>
                        <Text fw={800}>{c.stats?.projectCount || 0}</Text>
                      </Stack>
                      <Stack gap={0} style={{ textAlign: "right" }}>
                        <Text size="xs" c="dimmed" fw={700}>
                          Marge moyenne
                        </Text>
                        <Text fw={800}>{formatPct(c.stats?.avgMarginPct || 0)}</Text>
                      </Stack>
                    </Group>
                  </Stack>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </SimpleGrid>
      )}
    </Stack>
  );
}

function ClientDetailView() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { state, upsertProject, upsertClient } = useDb();

  const client = useMemo(
    () => (state.clients || []).find((c) => c.id === clientId) || null,
    [state.clients, clientId]
  );

  const [clientDraft, setClientDraft] = useState(client);
  useEffect(() => {
    setClientDraft(client);
  }, [client?.id]);

  const saveClientDebounced = useDebouncedCallback(async (next) => {
    if (!next?.id) return;
    await upsertClient(next);
  }, 450);

  function patchClient(patch) {
    setClientDraft((prev) => {
      const base = prev || client || {};
      const next = { ...base, ...patch };
      saveClientDebounced(next);
      return next;
    });
  }

  async function onPickDetailClientImage(file) {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file, { maxSize: 256 });
      patchClient({ image: dataUrl });
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Erreur lors du chargement de l'image",
        message: e?.message || "Impossible de charger l'image.",
      });
    }
  }

  const projects = useMemo(() => {
    return (state.projects || [])
      .filter((p) => p.clientId === clientId)
      .map((p) => ({ ...p, totals: calcTotals(p.products) }))
      .sort(sortByLastAdded);
  }, [state.projects, clientId]);

  async function onNewProject() {
    const id = nanoid();
    const created = await upsertProject({
      id,
      title: `${client?.name ? client.name + " — " : ""}New Project`,
      clientId,
      status: "Draft",
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      products: [],
    });
    navigate(`/projects/edit/${created.id}`);
  }

  if (!client) {
    return (
      <Stack gap="lg">
        <Group gap="sm">
          <ActionIcon variant="subtle" onClick={() => navigate("/projects/clients")}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Title order={2} style={{ letterSpacing: -0.7 }}>
            Client non trouvé
          </Title>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Group gap="sm" align="flex-end">
          <ActionIcon variant="subtle" onClick={() => navigate("/projects/clients")}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Stack gap={4}>
            <Title order={2} style={{ letterSpacing: -0.7 }}>
              {clientDraft?.name || client.name}
            </Title>
            <Text c="dimmed" size="sm">
              {projects.length} projets
            </Text>
          </Stack>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={onNewProject}>
          Nouveau projet
        </Button>
      </Group>

      <Card
        radius="lg"
        p="lg"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Group gap="sm" align="center">
            <SquareAvatar src={clientDraft?.image} label={clientDraft?.name} size={56} />
            <Stack gap={6}>
              <TextInput
                label="Nom du client"
                value={clientDraft?.name || ""}
                onChange={(e) => patchClient({ name: e.currentTarget.value })}
                w={360}
              />
              <Text size="xs" c="dimmed">
                Mise à jour automatique
              </Text>
            </Stack>
          </Group>

          <Group gap="xs">
            <Button
              variant="light"
              component="label"
              style={{ position: "relative", overflow: "hidden" }}
            >
              Ajouter image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPickDetailClientImage(e.currentTarget.files?.[0] || null)}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                }}
              />
            </Button>
            {clientDraft?.image ? (
              <Button variant="subtle" color="red" onClick={() => patchClient({ image: null })}>
                Supprimer
              </Button>
            ) : null}
          </Group>
        </Group>
      </Card>

      {!projects.length ? (
          <Card
            radius="lg"
            p="xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.14)",
            }}
          >
            <Stack gap={6} align="center">
              <Title order={4}>Aucun projet pour ce client</Title>
              <Text c="dimmed" size="sm">
                Créez un projet et il sera automatiquement lié à {client.name}.
              </Text>
            </Stack>
          </Card>
        ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          <AnimatePresence initial={false}>
            {projects.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, delay: Math.min(idx * 0.012, 0.12) }}
              >
                <Card
                  radius="lg"
                  p="lg"
                  onClick={() => navigate(`/projects/edit/${p.id}`)}
                  style={{
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    height: "100%",
                  }}
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                        <SquareAvatar src={p.image} label={p.title} />
                        <Stack gap={2} style={{ minWidth: 0 }}>
                          <Text fw={800} size="md" style={{ letterSpacing: -0.2 }} lineClamp={2}>
                            {p.title || "Untitled Project"}
                          </Text>
                          <Text c="dimmed" size="xs" lineClamp={1}>
                            {dayjs(p.date || p.createdAt).format("D MMM YYYY")}
                          </Text>
                        </Stack>
                      </Group>
                      <Badge color={statusColor(p.status)} variant="light" radius="sm">
                        {p.status || "Draft"}
                      </Badge>
                    </Group>

                    <Group gap="lg" justify="space-between">
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed" fw={700}>
                          Items
                        </Text>
                        <Text fw={800}>{(p.products || []).length}</Text>
                      </Stack>
                      <Stack gap={0} style={{ textAlign: "right" }}>
                        <Text size="xs" c="dimmed" fw={700}>
                          Profit
                        </Text>
                        <Text fw={800} c={p.totals.profit >= 0 ? "teal" : "red"}>
                          {EUR.format(p.totals.profit)}
                        </Text>
                      </Stack>
                      <Stack gap={0} style={{ textAlign: "right" }}>
                        <Text size="xs" c="dimmed" fw={700}>
                          Margin
                        </Text>
                        <Text fw={800}>{formatPct(p.totals.marginPct)}</Text>
                      </Stack>
                    </Group>
                  </Stack>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </SimpleGrid>
      )}
    </Stack>
  );
}

export function Projects() {
  const location = useLocation();
  const navigate = useNavigate();

  const view = location.pathname.includes("/clients") ? "clients" : "projects";

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <SegmentedControl
          value={view}
          onChange={(v) => navigate(v === "clients" ? "/projects/clients" : "/projects")}
          data={[
            { value: "projects", label: "Projets" },
            { value: "clients", label: "Clients" },
          ]}
        />
        <Group gap="xs">
          {view === "projects" ? (
            <Group gap={6} c="dimmed">
              <IconBriefcase2 size={16} />
              <Text size="sm">Vue projets</Text>
            </Group>
          ) : (
            <Group gap={6} c="dimmed">
              <IconUsers size={16} />
              <Text size="sm">Vue clients</Text>
            </Group>
          )}
        </Group>
      </Group>

      <Routes>
        <Route path="/" element={<ProjectsListView />} />
        <Route path="/edit/:id" element={<ProjectEditor />} />
        <Route path="/clients" element={<ClientsListView />} />
        <Route path="/clients/:clientId" element={<ClientDetailView />} />
        <Route path="/:id" element={<LegacyProjectRedirect />} />
      </Routes>
    </Stack>
  );
}

function LegacyProjectRedirect() {
  const { id } = useParams();
  return <Navigate to={`/projects/edit/${id}`} replace />;
}


