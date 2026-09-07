import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { LifeBuoy, Plus, ArrowLeft } from "lucide-react";

interface Ticket {
  id: string;
  projectId: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
}

interface Project { id: string; name: string; }

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

function NewTicketDialog({ projects }: { projects: Project[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ projectId: "", subject: "", description: "", priority: "medium" });

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/portal/tickets", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/tickets"] });
      toast({ title: "تم إرسال التذكرة بنجاح" });
      setForm({ projectId: "", subject: "", description: "", priority: "medium" });
      setOpen(false);
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5" data-testid="button-new-ticket">
          <Plus className="w-4 h-4" /> تذكرة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>فتح تذكرة دعم فني</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>المشروع</Label>
            <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
              <SelectTrigger data-testid="select-ticket-project"><SelectValue placeholder="اختر المشروع" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>الموضوع</Label>
            <Input
              data-testid="input-ticket-subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="مثال: مشكلة في تسجيل الدخول"
            />
          </div>
          <div className="space-y-1.5">
            <Label>الأولوية</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger data-testid="select-ticket-priority"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">منخفضة</SelectItem>
                <SelectItem value="medium">متوسطة</SelectItem>
                <SelectItem value="high">عالية</SelectItem>
                <SelectItem value="urgent">عاجلة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>وصف المشكلة</Label>
            <Textarea
              data-testid="textarea-ticket-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="اشرح المشكلة بالتفصيل..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.projectId || !form.subject.trim() || !form.description.trim()}
            data-testid="button-submit-ticket"
          >
            {mutation.isPending ? "جاري الإرسال..." : "إرسال التذكرة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PortalTickets() {
  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({ queryKey: ["/api/portal/tickets"] });
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/portal/projects"] });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">تذاكر الدعم الفني</h1>
          <p className="text-muted-foreground mt-1">{tickets.length === 0 ? "لا توجد تذاكر" : `${tickets.length} تذكرة`}</p>
        </div>
        {projects.length > 0 && <NewTicketDialog projects={projects} />}
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl">
          <LifeBuoy className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">لا توجد تذاكر دعم مفتوحة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const sc = STATUS_CFG[t.status];
            const pc = PRIORITY_CFG[t.priority];
            return (
              <Link key={t.id} href={`/portal/tickets/${t.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-ticket-${t.id}`}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <p className="font-medium truncate">{t.subject}</p>
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
