import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Target, Phone, Mail, Building, UserCheck, ArrowRight, Search, Filter, ClipboardList, Plus, Circle, Clock, CheckCircle2 } from "lucide-react";
import type { Lead, User, Task } from "@shared/schema";

const taskStatusIcon: Record<string, typeof Circle> = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};
const taskStatusColor: Record<string, string> = {
  todo: "text-blue-500",
  in_progress: "text-orange-500",
  done: "text-green-600",
};
const taskStatusLabel: Record<string, string> = {
  todo: "انتظار",
  in_progress: "جارية",
  done: "مكتملة",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  New: { label: "جديد", color: "bg-blue-500/10 text-blue-600" },
  Contacted: { label: "تم التواصل", color: "bg-yellow-500/10 text-yellow-600" },
  Converted: { label: "محوّل", color: "bg-green-500/10 text-green-600" },
  Lost: { label: "مفقود", color: "bg-red-500/10 text-red-600" },
};

interface TaskWithNames extends Task { assignedToName?: string | null; }

export default function AdminLeads() {
  const { toast } = useToast();
  const [assignDialog, setAssignDialog] = useState<Lead | null>(null);
  const [selectedSales, setSelectedSales] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [taskDialog, setTaskDialog] = useState<Lead | null>(null);
  const [leadTasksPanel, setLeadTasksPanel] = useState<Lead | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedTo: "", dueDate: "", priority: "medium" });

  const { data: leads = [], isLoading } = useQuery<Lead[]>({ queryKey: ["/api/admin/leads"] });
  const { data: salesUsers = [] } = useQuery<User[]>({ queryKey: ["/api/admin/users"] });
  const { data: leadTasks = [] } = useQuery<TaskWithNames[]>({
    queryKey: [`/api/tasks/by-lead/${leadTasksPanel?.id}`],
    enabled: !!leadTasksPanel,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, salesId }: { id: string; salesId: string }) =>
      apiRequest("PATCH", `/api/admin/leads/${id}/assign`, { assignedTo: salesId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      setAssignDialog(null);
      toast({ title: "تم تعيين العميل المحتمل بنجاح" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/leads/${id}/convert`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: "تم تحويل العميل المحتمل إلى عميل بنجاح" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/admin/tasks", data),
    onSuccess: () => {
      if (leadTasksPanel) queryClient.invalidateQueries({ queryKey: [`/api/tasks/by-lead/${leadTasksPanel.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending-count"] });
      setTaskDialog(null);
      setTaskForm({ title: "", description: "", assignedTo: "", dueDate: "", priority: "medium" });
      toast({ title: "تم إنشاء المهمة بنجاح" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const salesList = salesUsers.filter((u) => u.role === "sales");
  const filtered = leads
    .filter((l) => filterStatus === "all" || l.status === filterStatus)
    .filter((l) =>
      !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search)
    );

  const salesMap = Object.fromEntries(salesUsers.map((u) => [u.id, u.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">العملاء المحتملون</h1>
        <p className="text-muted-foreground mt-1">إدارة وتعيين العملاء المحتملين</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            data-testid="input-leads-search"
            placeholder="بحث بالاسم أو الهاتف..."
            className="pr-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44" data-testid="select-leads-filter">
            <Filter className="w-4 h-4 ml-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="New">جديد</SelectItem>
            <SelectItem value="Contacted">تم التواصل</SelectItem>
            <SelectItem value="Converted">محوّل</SelectItem>
            <SelectItem value="Lost">مفقود</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Target className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">لا يوجد عملاء محتملون</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const sc = statusConfig[lead.status] || { label: lead.status, color: "" };
            return (
              <Card key={lead.id} data-testid={`card-lead-${lead.id}`} className="hover-elevate">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{lead.name}</h3>
                        <Badge className={sc.color}>{sc.label}</Badge>
                        {lead.assignedTo && (
                          <Badge variant="outline" className="text-xs">
                            {salesMap[lead.assignedTo] || "موظف"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {lead.companyName && (
                          <span className="flex items-center gap-1"><Building className="w-3 h-3" />{lead.companyName}</span>
                        )}
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>
                        <span className="text-xs">المصدر: {lead.source}</span>
                      </div>
                      {lead.message && <p className="text-sm text-muted-foreground line-clamp-1">{lead.message}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setLeadTasksPanel(lead); setTaskDialog(null); }}
                        data-testid={`button-lead-tasks-${lead.id}`}
                      >
                        <ClipboardList className="w-4 h-4 ml-1" />
                        المهام
                      </Button>
                      {lead.status !== "Converted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setAssignDialog(lead); setSelectedSales(lead.assignedTo || ""); }}
                          data-testid={`button-assign-lead-${lead.id}`}
                        >
                          <UserCheck className="w-4 h-4 ml-1" />
                          تعيين
                        </Button>
                      )}
                      {lead.status !== "Converted" && lead.status !== "Lost" && (
                        <Button
                          size="sm"
                          onClick={() => convertMutation.mutate(lead.id)}
                          disabled={convertMutation.isPending}
                          data-testid={`button-convert-lead-${lead.id}`}
                        >
                          <ArrowRight className="w-4 h-4 ml-1" />
                          تحويل
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lead Tasks Panel */}
      <Dialog open={!!leadTasksPanel} onOpenChange={(v) => { if (!v) setLeadTasksPanel(null); }}>
        <DialogContent dir="rtl" className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>مهام: {leadTasksPanel?.name}</span>
              <Button
                size="sm"
                onClick={() => { setTaskDialog(leadTasksPanel); }}
                data-testid="button-add-lead-task"
              >
                <Plus className="w-4 h-4 ml-1" />
                مهمة جديدة
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            {leadTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا توجد مهام مرتبطة بهذا العميل المحتمل</p>
            ) : (
              leadTasks.map((task) => {
                const Icon = taskStatusIcon[task.status] || Circle;
                return (
                  <div key={task.id} className="flex items-start gap-2 p-3 rounded-lg border border-border">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${taskStatusColor[task.status]}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                      {task.assignedToName && <p className="text-xs text-muted-foreground">{task.assignedToName}</p>}
                      <Badge className="text-xs mt-1">{taskStatusLabel[task.status]}</Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task for Lead Dialog */}
      <Dialog open={!!taskDialog} onOpenChange={(v) => { if (!v) setTaskDialog(null); }}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مهمة — {taskDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>عنوان المهمة *</Label>
              <Input
                data-testid="input-lead-task-title"
                placeholder="أدخل عنوان المهمة"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                rows={2}
                placeholder="وصف اختياري..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>تعيين إلى</Label>
                <Select value={taskForm.assignedTo || "_none"} onValueChange={(v) => setTaskForm({ ...taskForm, assignedTo: v === "_none" ? "" : v })}>
                  <SelectTrigger data-testid="select-lead-task-assignee">
                    <SelectValue placeholder="موظف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">بدون</SelectItem>
                    {salesUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الأولوية</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>تاريخ الاستحقاق</Label>
              <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={!taskForm.title.trim() || createTaskMutation.isPending}
                onClick={() => taskDialog && createTaskMutation.mutate({
                  title: taskForm.title,
                  description: taskForm.description || null,
                  assignedTo: taskForm.assignedTo || null,
                  dueDate: taskForm.dueDate || null,
                  priority: taskForm.priority,
                  status: "todo",
                  relatedLeadId: taskDialog.id,
                })}
                data-testid="button-submit-lead-task"
              >
                {createTaskMutation.isPending ? "جاري الإنشاء..." : "إنشاء"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setTaskDialog(null)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent dir="rtl" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>تعيين موظف للعميل المحتمل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">العميل: <span className="font-medium text-foreground">{assignDialog?.name}</span></p>
            <Select value={selectedSales} onValueChange={setSelectedSales}>
              <SelectTrigger data-testid="select-assign-sales">
                <SelectValue placeholder="اختر موظف مبيعات" />
              </SelectTrigger>
              <SelectContent>
                {salesList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={!selectedSales || assignMutation.isPending}
                onClick={() => assignDialog && assignMutation.mutate({ id: assignDialog.id, salesId: selectedSales })}
                data-testid="button-confirm-assign"
              >
                {assignMutation.isPending ? "جاري التعيين..." : "تعيين"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setAssignDialog(null)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
