import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { compactCurrency, percent } from "@/lib/format";

export const Route = createFileRoute("/root-cause")({
  head: () => ({
    meta: [
      { title: "Chẩn đoán nguyên nhân biến động — FMCG Analytics" },
      {
        name: "description",
        content:
          "Phân tích nguyên nhân tăng/giảm doanh số theo nhà phân phối và thương hiệu giữa hai kỳ, kèm tóm tắt điều hành.",
      },
      { property: "og:title", content: "Chẩn đoán nguyên nhân biến động — FMCG Analytics" },
      {
        property: "og:description",
        content: "So sánh hai kỳ và xác định nguyên nhân biến động doanh số theo NPP và thương hiệu.",
      },
    ],
  }),
  component: RootCausePage,
});

const PERIODS = ["2026-07", "2026-06", "2026-05", "2026-04"];

type ExplorerRow = {
  distributor_code: string;
  distributor_name: string;
  region: string;
  brand_name: string;
  prev_revenue: number;
  curr_revenue: number;
  growth_pct: number | null;
  outlet_change_pct: number | null;
  order_change_pct: number | null;
  root_cause: string;
  severity: string;
};

const badgeClass = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-destructive/15 text-destructive border-destructive/40";
    case "warning":
      return "bg-warning/15 text-warning border-warning/40";
    case "success":
    case "positive":
      return "bg-success/15 text-success border-success/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

function RootCausePage() {
  const [current, setCurrent] = useState("2026-07");
  const [compare, setCompare] = useState("2026-06");

  const { data, isLoading, error } = useQuery({
    queryKey: ["root-cause", current, compare],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_root_cause_explorer", {
        p_current_period: current,
        p_compare_period: compare,
      });
      if (error) throw error;
      return (data ?? []) as unknown as ExplorerRow[];
    },
  });

  const rows = data ?? [];
  const declines = rows.filter((r) => (r.growth_pct ?? 0) < 0);
  const worst = declines[0];
  const best = [...rows].sort((a, b) => (b.growth_pct ?? 0) - (a.growth_pct ?? 0))[0];
  const totalCurr = rows.reduce((a, r) => a + Number(r.curr_revenue), 0);
  const totalPrev = rows.reduce((a, r) => a + Number(r.prev_revenue), 0);
  const totalGrowth = totalPrev ? ((totalCurr - totalPrev) / totalPrev) * 100 : null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Root cause explorer</p>
        <h1 className="mt-1 text-3xl font-semibold">Chẩn đoán nguyên nhân</h1>
      </header>

      <Card className="gradient-executive overflow-hidden rounded-3xl border-primary/30 shadow-[var(--shadow-glow)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            AI Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          {isLoading ? (
            <Skeleton className="h-16 w-full rounded-xl" />
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">Không có dữ liệu cho hai kỳ đã chọn.</p>
          ) : (
            <>
              <p>
                Tổng doanh số kỳ <strong>{current}</strong> đạt{" "}
                <strong>{compactCurrency(totalCurr)}</strong>, {totalGrowth !== null && totalGrowth >= 0 ? "tăng" : "giảm"}{" "}
                <strong>{percent(totalGrowth)}</strong> so với kỳ <strong>{compare}</strong>.
              </p>
              <p>
                Có <strong>{declines.length}/{rows.length}</strong> cặp NPP–thương hiệu sụt giảm.
                {worst && (
                  <>
                    {" "}Điểm nóng lớn nhất là <strong>{worst.distributor_name}</strong> với thương hiệu{" "}
                    <strong>{worst.brand_name}</strong> ({percent(worst.growth_pct)}) — nguyên nhân:{" "}
                    <strong>{worst.root_cause.toLowerCase()}</strong>.
                  </>
                )}
              </p>
              {best && (
                <p>
                  Điểm sáng: <strong>{best.distributor_name}</strong> – <strong>{best.brand_name}</strong> tăng{" "}
                  <strong>{percent(best.growth_pct)}</strong>; nên nhân rộng mô hình trưng bày và chính sách bán hàng
                  của NPP này sang các vùng đang suy giảm.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-4">
        <PeriodSelect label="Tháng hiện tại" value={current} onChange={setCurrent} />
        <PeriodSelect label="Tháng so sánh" value={compare} onChange={setCompare} />
      </div>

      <Card className="surface-panel border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Bảng chẩn đoán chi tiết</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive">Không tải được dữ liệu: {error.message}</p>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NPP</TableHead>
                  <TableHead>Thương hiệu</TableHead>
                  <TableHead className="text-right">Doanh số kỳ trước</TableHead>
                  <TableHead className="text-right">Doanh số kỳ này</TableHead>
                  <TableHead className="text-right">% Tăng trưởng</TableHead>
                  <TableHead>Chẩn đoán nguyên nhân</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Không có dữ liệu.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={`${r.distributor_code}-${r.brand_name}`}>
                    <TableCell>
                      <div className="font-medium">{r.distributor_name}</div>
                      <div className="text-xs text-muted-foreground">{r.region}</div>
                    </TableCell>
                    <TableCell>{r.brand_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{compactCurrency(Number(r.prev_revenue))}</TableCell>
                    <TableCell className="text-right tabular-nums">{compactCurrency(Number(r.curr_revenue))}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        (r.growth_pct ?? 0) >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {percent(r.growth_pct)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badgeClass(r.severity)}>
                        {r.root_cause}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PeriodSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
