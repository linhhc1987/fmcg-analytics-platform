import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/data-import")({
  head: () => ({
    meta: [
      { title: "Nạp dữ liệu bán hàng — FMCG Analytics" },
      {
        name: "description",
        content: "Kéo thả file Excel hoặc CSV để nạp dữ liệu bán hàng vào kho phân tích FMCG.",
      },
      { property: "og:title", content: "Nạp dữ liệu bán hàng — FMCG Analytics" },
      {
        property: "og:description",
        content: "Tải lên file Excel/CSV doanh số nhà phân phối và đưa vào quy trình phân tích tự động.",
      },
    ],
  }),
  component: DataImportPage,
});

type UploadItem = {
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  message?: string;
};

const ACCEPTED = [".csv", ".xls", ".xlsx"];

function DataImportPage() {
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const ok = ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext));
      if (!ok) {
        setItems((prev) => [
          { name: file.name, size: file.size, status: "error", message: "Chỉ hỗ trợ .csv, .xls, .xlsx" },
          ...prev,
        ]);
        continue;
      }

      setItems((prev) => [{ name: file.name, size: file.size, status: "uploading" }, ...prev]);
      const path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("sales_imports").upload(path, file, { upsert: false });

      setItems((prev) =>
        prev.map((it) =>
          it.name === file.name && it.status === "uploading"
            ? { ...it, status: error ? "error" : "done", message: error?.message ?? path }
            : it,
        ),
      );
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Data ingestion</p>
        <h1 className="mt-1 text-3xl font-semibold">Nạp dữ liệu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kéo thả file Excel/CSV doanh số. File được lưu an toàn vào kho dữ liệu nội bộ.
        </p>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-14 text-center transition-colors ${
          dragging ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/60"
        }`}
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <UploadCloud className="size-7" />
        </div>
        <p className="font-display text-lg font-semibold">Kéo & thả file vào đây</p>
        <p className="text-sm text-muted-foreground">Hỗ trợ .csv, .xls, .xlsx — tối đa 50MB mỗi file</p>
        <Button type="button" variant="secondary" className="mt-2">
          Chọn file từ máy
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <Card className="surface-panel border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Lịch sử tải lên phiên này</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Chưa có file nào được tải lên.</p>}
          {items.map((it, i) => (
            <div key={`${it.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
              <FileSpreadsheet className="size-5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {(it.size / 1024).toFixed(0)} KB {it.message ? `· ${it.message}` : ""}
                </p>
              </div>
              {it.status === "uploading" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              {it.status === "done" && <CheckCircle2 className="size-4 text-success" />}
              {it.status === "error" && <XCircle className="size-4 text-destructive" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
