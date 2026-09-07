import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban, ArrowLeft } from "lucide-react";

interface PortalProject {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "on_hold" | "completed" | "cancelled";
  progress: number;
  stagesCount: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "قيد التنفيذ", color: "bg-blue-500/10 text-blue-600" },
  on_hold: { label: "متوقف مؤقتاً", color: "bg-yellow-500/10 text-yellow-600" },
  completed: { label: "مكتمل", color: "bg-green-500/10 text-green-600" },
  cancelled: { label: "ملغي", color: "bg-red-500/10 text-red-600" },
};

export default function PortalDashboard() {
  const { data: projects = [], isLoading } = useQuery<PortalProject[]>({
    queryKey: ["/api/portal/projects"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مشاريعي</h1>
        <p className="text-muted-foreground mt-1">
          {projects.length === 0 ? "لا توجد مشاريع بعد" : `${projects.length} مشروع`}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl">
          <FolderKanban className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">لا توجد مشاريع مرتبطة بحسابك حالياً</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => {
            const statusCfg = STATUS_LABELS[p.status] || STATUS_LABELS.active;
            return (
              <Link key={p.id} href={`/portal/projects/${p.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-project-${p.id}`}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{p.name}</h3>
                      <Badge className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>نسبة الإنجاز</span>
                        <span>{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{p.stagesCount} مرحلة</span>
                      <span className="flex items-center gap-1 text-primary font-medium">
                        عرض التفاصيل <ArrowLeft className="w-3.5 h-3.5" />
                      </span>
                    </div>
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
