import React, { useMemo, useState } from "react";
import {
  Card,
  Group,
  MultiSelect,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IconTrendingUp, IconCash, IconPercentage } from "@tabler/icons-react";
import dayjs from "dayjs";

import { useDb } from "../state/db.jsx";
import { calcTotals } from "../lib/margin.js";
import { EUR, formatPct } from "../lib/format.js";

function kpiCard({ title, value, subtitle, icon: Icon, accent }) {
  return (
    <Card
      radius="lg"
      p="lg"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap={6}>
          <Text size="sm" c="dimmed" fw={600}>
            {title}
          </Text>
          <Title order={2} style={{ letterSpacing: -0.6 }}>
            {value}
          </Title>
          <Text size="xs" c="dimmed">
            {subtitle}
          </Text>
        </Stack>
        <Icon size={22} style={{ opacity: 0.9, color: accent }} />
      </Group>
    </Card>
  );
}

function timeRange(timeMode, yearValue) {
  const now = dayjs();
  if (timeMode === "thisMonth") {
    return { from: now.startOf("month"), to: now.endOf("month"), granularity: "day" };
  }
  if (timeMode === "lastMonth") {
    const last = now.subtract(1, "month");
    return { from: last.startOf("month"), to: last.endOf("month"), granularity: "day" };
  }
  if (timeMode === "year") {
    const y = Number(yearValue || now.year());
    return { from: dayjs(`${y}-01-01`), to: dayjs(`${y}-12-31`), granularity: "month" };
  }
  return { from: null, to: null, granularity: "month" };
}

function groupKey(d, granularity) {
  if (granularity === "day") return d.format("YYYY-MM-DD");
  return d.format("YYYY-MM");
}

export function Dashboard() {
  const { state } = useDb();
  const [timeMode, setTimeMode] = useState("thisMonth");
  const [year, setYear] = useState(String(dayjs().year()));
  const [clientIds, setClientIds] = useState([]);
  const [marginMode, setMarginMode] = useState("value"); // value | percent

  const clientOptions = useMemo(() => {
    return (state.clients || [])
      .filter((c) => c && typeof c.id === "string" && c.id && c.name)
      .map((c) => ({ value: c.id, label: c.name }));
  }, [state.clients]);

  const clientsById = useMemo(() => {
    const m = new Map();
    for (const c of state.clients || []) {
      if (c && typeof c.id === "string" && c.id) m.set(c.id, c);
    }
    return m;
  }, [state.clients]);

  const { filteredProjects, totals, chartData, periodLabel } = useMemo(() => {
    const range = timeRange(timeMode, year);
    const from = range.from;
    const to = range.to;

    const inClients = (p) => {
      if (!clientIds?.length) return true;
      return clientIds.includes(p.clientId);
    };

    const inTime = (p) => {
      const d = dayjs(p?.date || p?.createdAt || null);
      if (!d.isValid()) return true;
      if (!from || !to) return true;
      return (d.isAfter(from) || d.isSame(from)) && (d.isBefore(to) || d.isSame(to));
    };

    const projects = (state.projects || []).filter((p) => inClients(p) && inTime(p));

    const t = projects.reduce(
      (acc, p) => {
        const tot = calcTotals(p.products);
        acc.revenue += tot.revenue;
        acc.profit += tot.profit;
        return acc;
      },
      { revenue: 0, profit: 0 }
    );
    const avgMarginPct = t.revenue > 0 ? (t.profit / t.revenue) * 100 : 0;

    const grouped = new Map();
    for (const p of projects) {
      const d = dayjs(p?.date || p?.createdAt || null);
      if (!d.isValid()) continue;
      const key = groupKey(d, range.granularity);
      const prev = grouped.get(key) || { key, revenue: 0, profit: 0 };
      const tot = calcTotals(p.products);
      prev.revenue += tot.revenue;
      prev.profit += tot.profit;
      grouped.set(key, prev);
    }

    const sorted = [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key));
    const chart = sorted.map((x) => ({
      name:
        range.granularity === "day"
          ? dayjs(x.key).format("D MMM")
          : dayjs(x.key + "-01").format("MMM YY"),
      revenue: Math.round(x.revenue * 100) / 100,
      profit: Math.round(x.profit * 100) / 100,
      marginPct: x.revenue > 0 ? (x.profit / x.revenue) * 100 : 0,
    }));

    const period =
      timeMode === "thisMonth"
        ? "Ce mois-ci"
        : timeMode === "lastMonth"
        ? "Le mois dernier"
        : timeMode === "year"
        ? year
        : "Tout le temps";

    return {
      filteredProjects: projects,
      totals: { ...t, avgMarginPct },
      chartData: chart,
      periodLabel: period,
    };
  }, [state.projects, state.clients, timeMode, year, clientIds]);

  const clientLabel = useMemo(() => {
    if (!clientIds?.length) return "Tous les clients";
    if (clientIds.length === 1) return clientsById.get(clientIds[0])?.name || "1 client";
    return `${clientIds.length} clients`;
  }, [clientIds, clientsById]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={2} style={{ letterSpacing: -0.7 }}>
            Dashboard
          </Title>
          <Text c="dimmed" size="sm">
            {periodLabel} · {clientLabel} · {filteredProjects.length} {filteredProjects.length === 1 ? "projet" : "projets"}
          </Text>
        </Stack>

        <Group gap="md" wrap="wrap">
          <SegmentedControl
            value={timeMode}
            onChange={setTimeMode}
            data={[
              { value: "lastMonth", label: "Le mois dernier" },
              { value: "thisMonth", label: "Ce mois-ci" },
              { value: "year", label: "Année spécifique" },
              { value: "all", label: "Tout le temps" },
            ]}
          />

          {timeMode === "year" ? (
            <Select
              value={year}
              onChange={setYear}
              w={140}
              data={Array.from({ length: 7 }).map((_, i) => {
                const y = String(dayjs().year() - i);
                return { value: y, label: y };
              })}
              allowDeselect={false}
            />
          ) : null}

          <MultiSelect
            searchable
            clearable
            value={clientIds}
            onChange={setClientIds}
            data={clientOptions}
            w={320}
            placeholder="Filtrer les clients…"
            nothingFoundMessage="Aucun client trouvé"
          />

          <Switch
            checked={marginMode === "percent"}
            onChange={(e) => setMarginMode(e.currentTarget.checked ? "percent" : "value")}
            label={marginMode === "percent" ? "Marge (%)" : "Bénéfice (€)"}
          />
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
        {kpiCard({
          title: "Facturé",
          value: EUR.format(totals.revenue || 0),
          subtitle: "Total facturé",
          icon: IconCash,
          accent: "rgba(99, 102, 241, 0.95)",
        })}
        {kpiCard({
          title: "Bénéfices",
          value: EUR.format(totals.profit || 0),
          subtitle: "Facturé - Coût",
          icon: IconTrendingUp,
          accent: "rgba(16, 185, 129, 0.95)",
        })}
        {kpiCard({
          title: "Marge moyenne",
          value: formatPct(totals.avgMarginPct || 0),
          subtitle: "Bénéfices / Facturé",
          icon: IconPercentage,
          accent: "rgba(56, 189, 248, 0.95)",
        })}
      </SimpleGrid>

      <Card
        radius="lg"
        p="lg"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          minHeight: 380,
        }}
      >
        <Group justify="space-between" mb="sm">
          <Stack gap={2}>
            <Text fw={700}>Revenue vs. {marginMode === "percent" ? "Marge %" : "Bénéfice"}</Text>
            <Text size="sm" c="dimmed">
              Évolution mensuelle des performances
            </Text>
          </Stack>
        </Group>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.45)" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                stroke="rgba(255,255,255,0.45)"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => (marginMode === "percent" ? EUR.format(v) : EUR.format(v))}
              />
              {marginMode === "percent" ? (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="rgba(255,255,255,0.45)"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${Math.round(v)}%`}
                />
              ) : null}
              <Tooltip
                contentStyle={{
                  background: "rgba(10,14,24,0.92)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                }}
                cursor={false}
                formatter={(value, name, item) => {
                  if (name === "revenue") return [EUR.format(value), "Revenue"];
                  if (name === "profit") return [EUR.format(value), "Profit"];
                  if (name === "marginPct") return [`${value.toFixed(1)}%`, "Margin %"];
                  return [value, name];
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="rgba(99, 102, 241, 0.78)"
                radius={[8, 8, 0, 0]}
                activeBar={false}
              />
              <Bar
                yAxisId={marginMode === "percent" ? "right" : "left"}
                dataKey={marginMode === "percent" ? "marginPct" : "profit"}
                fill="rgba(16, 185, 129, 0.76)"
                radius={[8, 8, 0, 0]}
                activeBar={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </Stack>
  );
}


