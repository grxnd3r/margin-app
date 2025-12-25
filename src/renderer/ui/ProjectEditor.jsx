import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  FileButton,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDebouncedCallback } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft, IconPlus, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { nanoid } from "nanoid";

import { useDb } from "../state/db.jsx";
import { calcMarginPct, calcProfit, calcTotals } from "../lib/margin.js";
import { EUR, formatPct } from "../lib/format.js";
import { fileToDataUrl } from "../lib/image.js";

function statusColor(status) {
  if (status === "Active") return "indigo";
  if (status === "Completed") return "teal";
  if (status === "Cancelled") return "red";
  return "gray";
}

export function ProjectEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, upsertProject, deleteProject } = useDb();

  const projectFromStore = useMemo(() => {
    return (state.projects || []).find((p) => p.id === id) || null;
  }, [state.projects, id]);

  const clients = state.clients || [];
  const clientOptions = useMemo(
    () =>
      clients
        .filter((c) => c && typeof c.id === "string" && c.id && c.name)
        .map((c) => ({ value: c.id, label: c.name })),
    [clients]
  );

  const [project, setProject] = useState(projectFromStore);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setProject(projectFromStore);
    setDirty(false);
  }, [projectFromStore?.id]);

  const saveDebounced = useDebouncedCallback(async (next) => {
    await upsertProject(next);
    setDirty(false);
  }, 500);

  function patchProject(patch) {
    setProject((prev) => {
      const next = { ...(prev || {}), ...patch };
      setDirty(true);
      saveDebounced(next);
      return next;
    });
  }

  function patchProduct(productId, patch) {
    setProject((prev) => {
      const base = prev || {};
      const products = Array.isArray(base.products) ? [...base.products] : [];
      const idx = products.findIndex((x) => x.id === productId);
      if (idx === -1) return prev;
      products[idx] = { ...products[idx], ...patch };
      const next = { ...base, products };
      setDirty(true);
      saveDebounced(next);
      return next;
    });
  }

  function addProduct() {
    setProject((prev) => {
      const base = prev || {};
      const products = Array.isArray(base.products) ? [...base.products] : [];
      products.push({
        id: nanoid(),
        title: "Nouveau produit",
        costPrice: 0,
        sellingPrice: 0,
        date: new Date().toISOString(),
      });
      const next = { ...base, products };
      setDirty(true);
      saveDebounced(next);
      return next;
    });
  }

  function removeProduct(productId) {
    setProject((prev) => {
      const base = prev || {};
      const products = (base.products || []).filter((x) => x.id !== productId);
      const next = { ...base, products };
      setDirty(true);
      saveDebounced(next);
      return next;
    });
  }

  async function onDeleteProject() {
    await deleteProject(id);
    notifications.show({ color: "teal", title: "Supprimé", message: "Projet supprimé." });
    navigate("/projects");
  }

  const totals = useMemo(() => calcTotals(project?.products || []), [project?.products]);

  if (!project) {
    return (
      <Card
        radius="lg"
        p="xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px dashed rgba(255,255,255,0.14)",
        }}
      >
        <Stack gap={8} align="center">
          <Title order={4}>Projet non trouvé</Title>
          <Button variant="light" onClick={() => navigate("/projects")}>
            Retour aux projets
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Group gap="sm">
          <ActionIcon variant="subtle" onClick={() => navigate(-1)}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Stack gap={3}>
            <Group gap="sm" align="center">
              <Title order={2} style={{ letterSpacing: -0.7 }}>
                {project.title || "Projet sans titre"}
              </Title>
              <Badge color={statusColor(project.status)} variant="light" radius="sm">
                {project.status || "Brouillon"}
              </Badge>
              {dirty ? (
                <Badge color="yellow" variant="light" radius="sm">
                  Sauvegarde en cours...
                </Badge>
              ) : (
                <Badge color="teal" variant="light" radius="sm">
                  Sauvegardé
                </Badge>
              )}
            </Group>
          </Stack>
        </Group>

        <Button color="red" variant="light" onClick={onDeleteProject}>
          Supprimer
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
        <Group align="flex-end" wrap="wrap">
          <Stack gap={6}>
            <Text size="sm" fw={700} c="dimmed">
              Image du projet
            </Text>
            <Group gap="sm" align="center">
              <Avatar
                src={project.image || null}
                size={54}
                radius={14}
                color="indigo"
                styles={{
                  root: {
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.06)",
                  },
                }}
              >
                {String(project.title || "?").slice(0, 1).toUpperCase()}
              </Avatar>
              <Group gap="xs">
                <FileButton
                  accept="image/*"
                  onChange={async (file) => {
                    if (!file) return;
                    try {
                      const dataUrl = await fileToDataUrl(file, { maxSize: 256 });
                      patchProject({ image: dataUrl });
                    } catch (e) {
                      notifications.show({
                        color: "red",
                        title: "Image failed",
                        message: e?.message || "Could not load that image.",
                      });
                    }
                  }}
                >
                  {(props) => (
                    <Button variant="light" {...props}>
                      Ajouter
                    </Button>
                  )}
                </FileButton>
                {project.image ? (
                  <Button variant="subtle" color="red" onClick={() => patchProject({ image: null })}>
                    Supprimer
                  </Button>
                ) : null}
              </Group>
            </Group>
          </Stack>

          <TextInput
            label="Titre du projet"
            value={project.title || ""}
            onChange={(e) => patchProject({ title: e.currentTarget.value })}
            w={360}
          />
          <Select
            label="Client"
            placeholder="Sélectionner un client"
            data={clientOptions}
            value={project.clientId}
            onChange={(v) => patchProject({ clientId: v })}
            w={320}
            searchable
            nothingFoundMessage="Aucun client trouvé"
            clearable
          />
          <DateInput
            label="Date du projet"
            value={project.date ? new Date(project.date) : null}
            onChange={(d) => patchProject({ date: d ? d.toISOString() : null })}
            w={220}
            valueFormat="D MMM YYYY"
            clearable
          />
          <Select
            label="Statut"
            data={[
              { value: "Draft", label: "Brouillon" },
              { value: "Active", label: "En cours" },
              { value: "Completed", label: "Complété" },
              { value: "Cancelled", label: "Annulé" },
            ]}
            value={project.status || "Draft"}
            onChange={(v) => patchProject({ status: v })}
            w={180}
          />
        </Group>
      </Card>

      <Card
        radius="lg"
        p="lg"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Group justify="space-between" mb="sm">
          <Stack gap={2}>
            <Text fw={800}>Produits</Text>
          </Stack>
          <Button leftSection={<IconPlus size={16} />} variant="light" onClick={addProduct}>
            Ajouter un produit
          </Button>
        </Group>

        <Divider mb="md" opacity={0.25} />

        <Table
          verticalSpacing="sm"
          horizontalSpacing="sm"
          withRowBorders
          styles={{
            table: {
              background: "transparent",
            },
            th: {
              color: "rgba(255,255,255,0.65)",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            },
            td: {
              borderColor: "rgba(255,255,255,0.06)",
            },
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: "34%" }}>Produit</Table.Th>
              <Table.Th style={{ width: 160 }}>Coût</Table.Th>
              <Table.Th style={{ width: 170 }}>Facturé</Table.Th>
              <Table.Th style={{ width: 210 }}>Marge</Table.Th>
              <Table.Th style={{ width: 180 }}>Date</Table.Th>
              <Table.Th style={{ width: 50 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(project.products || []).map((row) => {
              const profit = calcProfit(row.costPrice, row.sellingPrice);
              const marginPct = calcMarginPct(row.costPrice, row.sellingPrice);

              return (
                <Table.Tr key={row.id}>
                  <Table.Td>
                    <TextInput
                      variant="filled"
                      value={row.title || ""}
                      onChange={(e) =>
                        patchProduct(row.id, { title: e.currentTarget.value })
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      variant="filled"
                      min={0}
                      step={1}
                      value={Number(row.costPrice || 0)}
                      onChange={(v) => patchProduct(row.id, { costPrice: Number(v || 0) })}
                      decimalScale={2}
                      hideControls
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      variant="filled"
                      min={0}
                      step={1}
                      value={Number(row.sellingPrice || 0)}
                      onChange={(v) =>
                        patchProduct(row.id, { sellingPrice: Number(v || 0) })
                      }
                      decimalScale={2}
                      hideControls
                    />
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text fw={800} c={profit >= 0 ? "teal" : "red"}>
                        {EUR.format(profit)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatPct(marginPct)}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <DateInput
                      variant="filled"
                      value={row.date ? new Date(row.date) : null}
                      onChange={(d) =>
                        patchProduct(row.id, { date: d ? d.toISOString() : null })
                      }
                      valueFormat="D MMM YYYY"
                      clearable
                    />
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => removeProduct(row.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>

        <Divider my="md" opacity={0.25} />

        <Group justify="space-between" align="flex-end">
          <Stack gap={2}>
            <Text size="sm" c="dimmed">
              Dernière modification
            </Text>
            <Text fw={700}>
              {project.updatedAt ? dayjs(project.updatedAt).format("D MMM YYYY · HH:mm") : "—"}
            </Text>
          </Stack>

          <Group gap="xl">
            <Stack gap={2} align="flex-end">
              <Text size="sm" c="dimmed">
                Facturé
              </Text>
              <Text fw={900} size="lg">
                {EUR.format(totals.revenue)}
              </Text>
            </Stack>
            <Stack gap={2} align="flex-end">
              <Text size="sm" c="dimmed">
                Bénéfice
              </Text>
              <Text fw={900} size="lg" c={totals.profit >= 0 ? "teal" : "red"}>
                {EUR.format(totals.profit)}
              </Text>
            </Stack>
            <Stack gap={2} align="flex-end">
              <Text size="sm" c="dimmed">
                Marge
              </Text>
              <Text fw={900} size="lg">
                {formatPct(totals.marginPct)}
              </Text>
            </Stack>
          </Group>
        </Group>
      </Card>
    </Stack>
  );
}


