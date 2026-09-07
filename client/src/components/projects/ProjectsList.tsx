import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban, Plus, ArrowLeft } from "lucide-react";
import type { Client } from "@shared/schema";

interface ProjectRow {
  id: string;
  name: string;
  clientName?: string;
  status: "active" | "on_hold" | "completed" | "cancelled";
  createdAt: string;
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  active: { label: "قيد التنفيذ", color: "bg-blue-500/10 text-blue-600" },
  on_hold: { label: "متوقف مؤقتاً", color: "bg-yellow-500/10 text-yellow-600" },
  completed: { label: "مكتمل", color: "bg-green-500/10 text-green-600" },
  cancelled: { label: "ملغي", color: "bg-red-500/10 text-red-600" },
};

function NewProjectDialog({ apiBase, clients }: { apiBase: string; clients: Client[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ clientId: "", name: "", description: "" });

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", `${apiBase}/projects`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/projects`] });
      toast({ title: "تم إنشاء المشروع بنجاح" });
      setForm({ clientId: "", name: "", description: "" });
      setOpen(false);
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5" data-testid="button-new-project">
          <Plus className="w-4 h-4" /> مشروع جديد
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>إنشاء مشروع جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>العميل</Label>
            <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
              <SelectTrigger data-testid="select-project-client"><SelectValue placeholder="اختر العميل" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.clientName} — {c.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>اسم المشروع</Label>
            <Input data-testid="input-project-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>الوصف</Label>
            <Textarea data-testid="textarea-project-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.clientId || !form.name.trim()} data-testid="button-submit-project">
            {mutation.isPending ? "جاري الإنشاء..." : "إنشاء المشروع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsList({ apiBase, basePath }: { apiBase: string; basePath: string }) {
  const { data: projects = [], isLoading } = useQuery<ProjectRow[]>({ queryKey: [`${apiBase}/projects`] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: [`${apiBase}/clients`] });
  const wonClients = clients.filter((c) => c.status === "Won");

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المشاريع</h1>
          <p className="text-muted-foreground mt-1">{projects.length === 0 ? "لا توجد مشاريع بعد" : `${projects.length} مشروع`}</p>
        </div>
        {wonClients.length > 0 && <NewProjectDialog apiBase={apiBase} clients={wonClients} />}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl">
          <FolderKanban className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">
            {wonClients.length === 0 ? "لا يوجد عملاء بحالة \"Won\" بعد لإنشاء مشروع" : "لم يتم إنشاء أي مشروع بعد"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const cfg = STATUS_CFG[p.status];
            return (
              <Link key={p.id} href={`${basePath}/${p.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-project-${p.id}`}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{p.clientName}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                      <ArrowLeft className="w-4 h-4 text-muted-foreground" />
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
