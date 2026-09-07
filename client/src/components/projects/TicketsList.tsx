import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LifeBuoy, ArrowLeft } from "lucide-react";

interface TicketRow {
  id: string;
  subject: string;
  clientName?: string;
  assignedToName?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوحة", color: "bg-blue-500/10 text-blue-600" },
  in_progress: { label: "قيد المعالجة", color: "bg-orange-500/10 text-orange-600" },
  resolved: { label: "تم الحل", color: "bg-green-500/10 text-green-600" },
  closed: { label: "مغلقة", color: "bg-gray-500/10 text-gray-600" },
};

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  low: { label: "منخفضة", color: "bg-gray-500/10 text-gray-600" },
  medium: { label: "متوسطة", color: "bg-yellow-500/10 text-yellow-600" },
  high: { label: "عالية", color: "bg-orange-500/10 text-orange-600" },
  urgent: { label: "عاجلة", color: "bg-red-500/10 text-red-600" },
};

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "open", label: "مفتوحة" },
  { key: "in_progress", label: "قيد المعالجة" },
  { key: "resolved", label: "تم الحل" },
  { key: "closed", label: "مغلقة" },
];

export default function TicketsList({ apiBase, basePath }: { apiBase: string; basePath: string }) {
  const [filter, setFilter] = useState("all");
  const { data: tickets = [], isLoading } = useQuery<TicketRow[]>({ queryKey: [`${apiBase}/tickets`] });

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const counts: Record<string, number> = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><LifeBuoy className="w-6 h-6 text-primary" /> تذاكر الدعم الفني</h1>
        <p className="text-muted-foreground mt-1">{tickets.length === 0 ? "لا توجد تذاكر" : `${tickets.length} تذكرة`}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            data-testid={`filter-ticket-${f.key}`}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all flex items-center gap-2 ${
              filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
            }`}
          >
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f.key ? "bg-primary-foreground/20" : "bg-muted"}`}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl">
          <LifeBuoy className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">لا توجد تذاكر بهذه الحالة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const sc = STATUS_CFG[t.status];
            const pc = PRIORITY_CFG[t.priority];
            return (
              <Link key={t.id} href={`${basePath}/${t.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-ticket-${t.id}`}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <p className="font-medium truncate">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">{t.clientName} {t.assignedToName ? `— مُسندة إلى ${t.assignedToName}` : "— غير مُسندة"}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
                        <Badge className={`text-xs ${pc.color}`}>{pc.label}</Badge>
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
