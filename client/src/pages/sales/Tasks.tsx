import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Calendar, Flag, CheckCircle2, Circle, Clock } from "lucide-react";
import type { Task } from "@shared/schema";

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "منخفضة", color: "bg-gray-500/10 text-gray-600" },
  medium: { label: "متوسطة", color: "bg-yellow-500/10 text-yellow-600" },
  high: { label: "عالية", color: "bg-red-500/10 text-red-600" },
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  todo: { label: "قيد الانتظار", color: "bg-blue-500/10 text-blue-600", icon: Circle },
  in_progress: { label: "جارية", color: "bg-orange-500/10 text-orange-600", icon: Clock },
  done: { label: "مكتملة", color: "bg-green-500/10 text-green-600", icon: CheckCircle2 },
};

const nextStatus: Record<string, "todo" | "in_progress" | "done"> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const nextStatusLabel: Record<string, string> = {
  todo: "ابدأ",
  in_progress: "أكمل",
  done: "أعد",
};

export default function SalesTasks() {
  const { toast } = useToast();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/sales/tasks"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/sales/tasks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending-count"] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const todo = tasks.filter((t) => t.status === "todo");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");

  const renderTask = (task: Task) => {
    const pc = priorityConfig[task.priority];
    const sc = statusConfig[task.status];
    const StatusIcon = sc.icon;
    const isOverdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();
    return (
      <Card key={task.id} data-testid={`card-task-${task.id}`} className={`hover-elevate ${task.status === "done" ? "opacity-70" : ""}`}>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <StatusIcon className={`w-4 h-4 flex-shrink-0 ${task.status === "done" ? "text-green-600" : task.status === "in_progress" ? "text-orange-500" : "text-muted-foreground"}`} />
                <h3 className={`font-medium text-sm ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </h3>
              </div>
              <Button
                size="sm"
                variant={task.status === "done" ? "outline" : "default"}
                className="flex-shrink-0 text-xs h-7 px-2"
                onClick={() => updateMutation.mutate({ id: task.id, status: nextStatus[task.status] })}
                disabled={updateMutation.isPending}
                data-testid={`button-task-advance-${task.id}`}
              >
                {nextStatusLabel[task.status]}
              </Button>
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mr-6">{task.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mr-6">
              <Badge className={`text-xs ${pc.color}`}>{pc.label}</Badge>
              {task.dueDate && (
                <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                  <Calendar className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString("ar-SA")}
                  {isOverdue && " (متأخرة)"}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">مهامي</h1>
          <p className="text-muted-foreground mt-1">المهام المعيّنة لك</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">مهامي</h1>
          <p className="text-muted-foreground mt-1">
            {tasks.length === 0
              ? "لا توجد مهام معيّنة لك حالياً"
              : `${tasks.length} مهمة — ${inProgress.length} جارية، ${todo.length} في الانتظار`}
          </p>
        </div>
        {tasks.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            {done.length} مكتملة
          </div>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">لا توجد مهام معيّنة لك حالياً</p>
          <p className="text-xs text-muted-foreground mt-1">سيقوم المدير بتعيين المهام لك</p>
        </div>
      ) : (
        <div className="space-y-6">
          {inProgress.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <h2 className="font-semibold text-sm">جارية ({inProgress.length})</h2>
              </div>
              {inProgress.map(renderTask)}
            </div>
          )}
          {todo.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 text-blue-500" />
                <h2 className="font-semibold text-sm">قيد الانتظار ({todo.length})</h2>
              </div>
              {todo.map(renderTask)}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <h2 className="font-semibold text-sm">مكتملة ({done.length})</h2>
              </div>
              {done.map(renderTask)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
