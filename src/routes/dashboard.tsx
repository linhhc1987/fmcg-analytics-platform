import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Store, Package } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { compactCurrency, percent } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Tổng quan điều hành — FMCG Analytics" },
      {
        name: "description",
        content:
          "Bảng điều hành FMCG: doanh số theo kỳ, độ phủ điểm bán, đơn hàng và tăng trưởng theo vùng, thương hiệu.",
      },
      { property: "og:title", content: "Tổng quan điều hành — FMCG Analytics" },
      {
        property: "og:description",
        content: "Theo dõi doanh số, độ phủ và tăng trưởng toàn hệ thống phân phối theo thời gian thực.",
      },
    ],
  }),
  component: DashboardPage,
});

const CURRENT = "2026-07";
const PREVIOUS = "2026-06";

type Row = {
  period: string;
  revenue: number;
  active_outlets: number;
  orders: number;
  distributors: { name: string; region: string } | null;
  brands: { name: string } | null;
};

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_sales")
        .select("period, revenue, active_outlets, orders, distributors(name, region), brands(name)")
        .in("period", [CURRENT, PREVIOUS]);
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const rows = data ?? [];
  const cur = rows.filter((r) => r.period === CURRENT);
  const prev = rows.filter((r) => r.period === PREVIOUS);
  const sum = (list: Row[], key: "revenue" | "active_outlets" | "orders") =>
    list.reduce((acc, r) => acc + Number(r[key]), 0);

  const revNow = sum(cur, "revenue");
  const revPrev = sum(prev, "revenue");
  const growth = revPrev ? ((revNow - revPrev) / revPrev) * 100 : null;

  const byRegion = Object.entries(
    cur.reduce<Record<string, number>>((acc, r) => {
      const key = r.distributors?.region ?? "Khác";
      acc[key] = (acc[key] ?? 0) + Number(r.revenue);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const byBrand = Object.entries(
    cur.reduce<Record<string, number>>((acc, r) => {
      const key = r.brands?.name ?? "Khác";
      acc[key] = (acc[key] ?? 0) + Number(r.revenue);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const maxRegion = byRegion[0]?.[1] ?? 1;
  const maxBrand = byBrand[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Executive overview</p>
        <h1 className="mt-1 text-3xl font-semibold">Tổng quan kinh doanh</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kỳ {CURRENT} so với {PREVIOUS} · toàn hệ thống nhà phân phối
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Doanh số kỳ này"
            value={compactCurrency(revNow)}
            delta={growth}
            icon={<TrendingUp className="size-4" />}
          />
          <KpiCard label="Doanh số kỳ trước" value={compactCurrency(revPrev)} icon={<TrendingDown className="size-4" />} />
          <KpiCard
            label="Điểm bán hoạt động"
            value={sum(cur, "active_outlets").toLocaleString("vi-VN")}
            icon={<Store className="size-4" />}
          />
          <KpiCard
            label="Tổng đơn hàng"
            value={sum(cur, "orders").toLocaleString("vi-VN")}
            icon={<Package className="size-4" />}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <BarPanel title="Doanh số theo vùng" rows={byRegion} max={maxRegion} />
        <BarPanel title="Doanh số theo thương hiệu" rows={byBrand} max={maxBrand} />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta?: number | null;
  icon: React.ReactNode;
}) {
  return (
    <Card className="surface-panel border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
          <span className="text-primary">{icon}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl font-semibold">{value}</p>
        {delta !== undefined && delta !== null && (
          <p className={`mt-1 text-xs ${delta >= 0 ? "text-success" : "text-destructive"}`}>
            {percent(delta)} so với kỳ trước
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BarPanel({ title, rows, max }: { title: string; rows: [string, number][]; max: number }) {
  return (
    <Card className="surface-panel border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>}
        {rows.map(([name, value]) => (
          <div key={name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{name}</span>
              <span className="text-muted-foreground">{compactCurrency(value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, (value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
