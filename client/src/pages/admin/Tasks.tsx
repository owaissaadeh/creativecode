import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, Search, Filter, Pencil, Trash2, User, Calendar, Flag } from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface TaskWithNames {
  id: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  createdBy: string;
  createdByName: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  relatedLeadId: string | null;
  relatedClientId: string | null;
  createdAt: string;
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "منخفضة", color: "bg-gray-500/10 text-gray-600" },
  medium: { label: "متوسطة", color: "bg-yellow-500/10 text-yellow-600" },
  high: { label: "عالية", color: "bg-red-500/10 text-red-600" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: "قيد الانتظار", color: "bg-blue-500/10 text-blue-600" },
  in_progress: { label: "جارية", color: "bg-orange-500/10 text-orange-600" },
  done: { label: "مكتملة", color: "bg-green-500/10 text-green-600" },
};

const emptyForm = {
  title: "",
  description: "",
  assignedTo: "",
  dueDate: "",
  priority: "medium",
  status: "todo",
};

export default function AdminTasks() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskWithNames | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: tasks = [], isLoading } = useQuery<TaskWithNames[]>({
    queryKey: ["/api/admin/tasks"],
  });

  const { data: allUsers = [] } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
  });

  const salesAndAdminUsers = allUsers.filter((u) => u.role === "sales" || u.role === "admin");

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/admin/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending-count"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ title: "تم إنشاء المهمة بنجاح" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) =>
      apiRequest("PATCH", `/api/admin/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending-count"] });
      setEditTask(null);
      setDialogOpen(false);
      toast({ title: "تم تحديث المهمة" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending-count"] });
      toast({ title: "تم حذف المهمة" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditTask(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (task: TaskWithNames) => {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      assignedTo: task.assignedTo || "",
      dueDate: task.dueDate || "",
      priority: task.priority,
      status: task.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    if (editTask) {
      updateMutation.mutate({ id: editTask.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = tasks
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .filter((t) => filterPriority === "all" || t.priority === filterPriority)
    .filter((t) => filterUser === "all" || t.assignedTo === filterUser)
    .filter((t) =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.assignedToName || "").toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المهام</h1>
          <p className="text-muted-foreground mt-1">إدارة وتعيين المهام للموظفين</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-task">
          <Plus className="w-4 h-4 ml-2" />
          مهمة جديدة
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            data-testid="input-tasks-search"
            placeholder="بحث بالعنوان أو المسؤول..."
            className="pr-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44" data-testid="select-tasks-status-filter">
            <Filter className="w-4 h-4 ml-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="todo">قيد الانتظار</SelectItem>
            <SelectItem value="in_progress">جارية</SelectItem>
            <SelectItem value="done">مكتملة</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-44" data-testid="select-tasks-priority-filter">
            <Flag className="w-4 h-4 ml-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأولويات</SelectItem>
            <SelectItem value="high">عالية</SelectItem>
            <SelectItem value="medium">متوسطة</SelectItem>
            <SelectItem value="low">منخفضة</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-48" data-testid="select-tasks-user-filter">
            <User className="w-4 h-4 ml-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الموظفين</SelectItem>
            {salesAndAdminUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">لا توجد مهام</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="w-4 h-4 ml-2" />
            إنشاء أول مهمة
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const pc = priorityConfig[task.priority];
            const sc = statusConfig[task.status];
            const isOverdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();
            return (
              <Card key={task.id} data-testid={`card-task-${task.id}`} className="hover-elevate">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{task.title}</h3>
                        <Badge className={sc.color}>{sc.label}</Badge>
                        <Badge className={pc.color}>{pc.label}</Badge>
                        {isOverdue && (
                          <Badge className="bg-red-500/10 text-red-600">متأخرة</Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {task.assignedToName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.assignedToName}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString("ar-SA")}
                          </span>
                        )}
                        {task.createdByName && (
                          <span className="text-muted-foreground/70">بواسطة: {task.createdByName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(task)}
                        data-testid={`button-edit-task-${task.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(task.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-task-${task.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditTask(null); }}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTask ? "تعديل المهمة" : "مهمة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>عنوان المهمة *</Label>
              <Input
                data-testid="input-task-title"
                placeholder="أدخل عنوان المهمة"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                data-testid="textarea-task-description"
                placeholder="وصف اختياري..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>تعيين إلى</Label>
              <Select value={form.assignedTo || "_none"} onValueChange={(v) => setForm({ ...form, assignedTo: v === "_none" ? "" : v })}>
                <SelectTrigger data-testid="select-task-assignee">
                  <SelectValue placeholder="اختر موظفاً" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">بدون تعيين</SelectItem>
                  {salesAndAdminUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>الأولوية</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="select-task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">قيد الانتظار</SelectItem>
                    <SelectItem value="in_progress">جارية</SelectItem>
                    <SelectItem value="done">مكتملة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>تاريخ الاستحقاق</Label>
              <Input
                data-testid="input-task-due-date"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={!form.title.trim() || createMutation.isPending || updateMutation.isPending}
                onClick={handleSubmit}
                data-testid="button-submit-task"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "جاري الحفظ..."
                  : editTask ? "تحديث" : "إنشاء"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { setDialogOpen(false); setEditTask(null); }}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
