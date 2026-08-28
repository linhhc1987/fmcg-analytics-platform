import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, User } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Cấu trúc tổ chức phân phối — FMCG Analytics" },
      {
        name: "description",
        content: "Sơ đồ vùng miền, nhà phân phối và người phụ trách trong hệ thống phân phối FMCG.",
      },
      { property: "og:title", content: "Cấu trúc tổ chức phân phối — FMCG Analytics" },
      {
        property: "og:description",
        content: "Xem toàn bộ vùng, nhà phân phối và quản lý phụ trách trong một sơ đồ duy nhất.",
      },
    ],
  }),
  component: OrganizationPage,
});

type Distributor = { id: string; code: string; name: string; region: string; manager: string | null };

function OrganizationPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["distributors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distributors")
        .select("id, code, name, region, manager")
        .order("region");
      if (error) throw error;
      return data as Distributor[];
    },
  });

  const grouped = (data ?? []).reduce<Record<string, Distributor[]>>((acc, d) => {
    (acc[d.region] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Organization</p>
        <h1 className="mt-1 text-3xl font-semibold">Cấu trúc tổ chức</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vùng miền · Nhà phân phối · Người phụ trách</p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(grouped).map(([region, list]) => (
            <Card key={region} className="surface-panel border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    {region}
                  </span>
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    {list.length} NPP
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-elevated px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.code}</p>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="size-3.5" />
                      {d.manager ?? "—"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
