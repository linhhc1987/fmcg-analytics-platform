import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Store, Package } from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

type Perf = {
  period: string;
  total_revenue: number;
  active_outlets: number;
  total_orders: number;
  mom_growth_pct: number | null;
};

type Contribution = {
  period: string;
  brand_name: string;
  revenue: number;
  contribution_pct: number;
  brand_rank: number;
};

const PIE_COLORS = [
  "hsl(var(--chart-1, 210 90% 60%))",
  "hsl(var(--chart-2, 190 80% 50%))",
  "hsl(var(--chart-3, 260 70% 65%))",
  "hsl(var(--chart-4, 150 60% 50%))",
  "hsl(var(--chart-5, 35 90% 60%))",
];

function DashboardPage() {
  const perfQuery = useQuery({
    queryKey: ["kpi-sales-performance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_sales_performance")
        .select("period, total_revenue, active_outlets, total_orders, mom_growth_pct")
        .order("period", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Perf[];
    },
  });

  const brandQuery = useQuery({
    queryKey: ["brand-contribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_brand_contribution_ranking")
        .select("period, brand_name, revenue, contribution_pct, brand_rank")
        .order("brand_rank", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Contribution[];
    },
  });

  const perf = perfQuery.data ?? [];
  const latest = perf[perf.length - 1];
  const latestPeriod = latest?.period;
  const brands = (brandQuery.data ?? []).filter((b) => b.period === latestPeriod);

  const trend = perf.map((p) => ({
    period: p.period,
    revenue: Number(p.total_revenue) / 1_000_000_000,
  }));

  const isLoading = perfQuery.isLoading || brandQuery.isLoading;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Executive overview</p>
        <h1 className="mt-1 text-3xl font-semibold">Tổng quan kinh doanh</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kỳ {latestPeriod ?? "—"} · toàn hệ thống nhà phân phối
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
            label="Tổng doanh số"
            value={compactCurrency(Number(latest?.total_revenue ?? 0))}
            delta={latest?.mom_growth_pct == null ? null : Number(latest.mom_growth_pct)}
            icon={<TrendingUp className="size-4" />}
          />
          <KpiCard
            label="Tăng trưởng MoM"
            value={percent(latest?.mom_growth_pct == null ? null : Number(latest.mom_growth_pct))}
            icon={
              Number(latest?.mom_growth_pct ?? 0) >= 0 ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )
            }
          />
          <KpiCard
            label="Active outlets"
            value={Number(latest?.active_outlets ?? 0).toLocaleString("vi-VN")}
            icon={<Store className="size-4" />}
          />
          <KpiCard
            label="Tổng đơn hàng"
            value={Number(latest?.total_orders ?? 0).toLocaleString("vi-VN")}
            icon={<Package className="size-4" />}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="surface-panel border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Xu hướng doanh thu theo tháng</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: -12, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(1)} tỷ`, "Doanh thu"]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="surface-panel border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Tỷ trọng đóng góp theo thương hiệu</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {brands.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brands}
                    dataKey="contribution_pct"
                    nameKey="brand_name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {brands.map((b, i) => (
                      <Cell key={b.brand_name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v: number, n: string) => [`${Number(v).toFixed(1)}%`, n]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
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
