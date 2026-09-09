import { useState } from "react";
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
import { Plus, Download, Upload, Send, File as FileIcon, Trash2, FileText } from "lucide-react";

interface Stage {
  id: string;
  title: string;
  description: string | null;
  sequence: number;
  status: string;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  clientName?: string;
}

interface Deliverable {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  version: number;
}

interface Comment {
  id: string;
  authorType: "client" | "staff";
  body: string;
  createdAt: string;
}

interface ContractData {
  id: string;
  totalValue: string;
  fileName: string;
  fileSize: number;
}

interface PaymentData {
  id: string;
  amount: string;
  label: string;
  dueDate: string | null;
  status: "pending" | "received";
  receivedByStaffId: string | null;
}

interface StaffUser {
  id: string;
  name: string;
}

const STAGE_STATUS_OPTIONS = [
  { value: "not_started", label: "لم تبدأ" },
  { value: "in_progress", label: "جارية" },
  { value: "needs_review", label: "بانتظار مراجعة العميل" },
  { value: "changes_requested", label: "طلب العميل تعديلات" },
  { value: "approved", label: "معتمدة" },
  { value: "completed", label: "مكتملة" },
];

const STAGE_STATUS_COLOR: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-600",
  in_progress: "bg-blue-500/10 text-blue-600",
  needs_review: "bg-orange-500/10 text-orange-600",
  changes_requested: "bg-amber-500/10 text-amber-600",
  approved: "bg-green-500/10 text-green-600",
  completed: "bg-green-600/10 text-green-700",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStaffToken() {
  try { const s = localStorage.getItem("crm-auth"); return s ? JSON.parse(s)?.state?.token : null; } catch { return null; }
}

async function uploadDeliverable(apiBase: string, projectId: string, title: string, file: File) {
  const token = getStaffToken();
  const fd = new FormData();
  fd.append("file", file);
  fd.append("title", title || file.name);
  const res = await fetch(`${apiBase}/projects/${projectId}/deliverables`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "فشل رفع الملف");
  return res.json();
}

async function downloadDeliverable(apiBase: string, id: string, filename: string) {
  const token = getStaffToken();
  const res = await fetch(`${apiBase}/deliverables/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("فشل تنزيل الملف");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AddStageDialog({ apiBase, projectId, nextSequence }: { apiBase: string; projectId: string; nextSequence: number }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", `${apiBase}/projects/${projectId}/stages`, { ...form, sequence: nextSequence }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/projects/${projectId}/stages`] });
      toast({ title: "تمت إضافة المرحلة" });
      setForm({ title: "", description: "" });
      setOpen(false);
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-add-stage">
          <Plus className="w-3.5 h-3.5" /> مرحلة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>إضافة مرحلة</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>عنوان المرحلة</Label>
            <Input data-testid="input-stage-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>الوصف</Label>
            <Textarea data-testid="textarea-stage-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title.trim()} data-testid="button-submit-stage">
            {mutation.isPending ? "جاري الإضافة..." : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadDeliverableDialog({ apiBase, projectId }: { apiBase: string; projectId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadDeliverable(apiBase, projectId, title, file);
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/projects/${projectId}/deliverables`] });
      toast({ title: "تم رفع الملف بنجاح" });
      setTitle("");
      setFile(null);
      setOpen(false);
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-upload-deliverable">
          <Upload className="w-3.5 h-3.5" /> رفع تسليم
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>رفع ملف تسليم</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>عنوان الملف</Label>
            <Input data-testid="input-deliverable-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: تصميم الصفحة الرئيسية" />
          </div>
          <div className="space-y-1.5">
            <Label>الملف</Label>
            <Input data-testid="input-deliverable-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={uploading || !file} data-testid="button-submit-deliverable">
            {uploading ? "جاري الرفع..." : "رفع الملف"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function downloadFile(url: string, filename: string) {
  const token = getStaffToken();
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error("فشل تنزيل الملف");
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objUrl);
}

function UploadContractDialog({ apiBase, projectId, hasContract }: { apiBase: string; projectId: string; hasContract: boolean }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [totalValue, setTotalValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !totalValue) return;
    setUploading(true);
    try {
      const token = getStaffToken();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("totalValue", totalValue);
      const res = await fetch(`${apiBase}/projects/${projectId}/contract`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "فشل رفع العقد");
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/projects/${projectId}/contract`] });
      toast({ title: "تم رفع العقد بنجاح" });
      setTotalValue("");
      setFile(null);
      setOpen(false);
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-upload-contract">
          <Upload className="w-3.5 h-3.5" /> {hasContract ? "إعادة رفع العقد" : "رفع العقد"}
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>{hasContract ? "إعادة رفع العقد" : "رفع العقد"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>قيمة العقد الإجمالية (د.أ)</Label>
            <Input data-testid="input-contract-value" type="number" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>ملف العقد</Label>
            <Input data-testid="input-contract-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={uploading || !file || !totalValue} data-testid="button-submit-contract">
            {uploading ? "جاري الرفع..." : "رفع العقد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPaymentDialog({ apiBase, projectId }: { apiBase: string; projectId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: "", amount: "", dueDate: "" });

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", `${apiBase}/projects/${projectId}/payments`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/projects/${projectId}/payments`] });
      toast({ title: "تمت إضافة الدفعة" });
      setForm({ label: "", amount: "", dueDate: "" });
      setOpen(false);
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-add-payment">
          <Plus className="w-3.5 h-3.5" /> دفعة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>إضافة دفعة</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>تسمية الدفعة</Label>
            <Input data-testid="input-payment-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="مثال: الدفعة الأولى" />
          </div>
          <div className="space-y-1.5">
            <Label>المبلغ (د.أ)</Label>
            <Input data-testid="input-payment-amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>تاريخ الاستحقاق (اختياري)</Label>
            <Input data-testid="input-payment-due-date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.label.trim() || !form.amount} data-testid="button-submit-payment">
            {mutation.isPending ? "جاري الإضافة..." : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadReceiptDialog({ apiBase, projectId, paymentId, staff }: { apiBase: string; projectId: string; paymentId: string; staff: StaffUser[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [receivedByStaffId, setReceivedByStaffId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !receivedByStaffId) return;
    setUploading(true);
    try {
      const token = getStaffToken();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("receivedByStaffId", receivedByStaffId);
      const res = await fetch(`${apiBase}/payments/${paymentId}/receipt`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "فشل رفع الإيصال");
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/projects/${projectId}/payments`] });
      toast({ title: "تم تأكيد استلام الدفعة" });
      setFile(null);
      setReceivedByStaffId("");
      setOpen(false);
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" data-testid={`button-upload-receipt-${paymentId}`}>
          <Upload className="w-3.5 h-3.5" /> رفع إيصال
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>رفع إيصال استلام</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>الموظف المستلم</Label>
            <Select value={receivedByStaffId} onValueChange={setReceivedByStaffId}>
              <SelectTrigger data-testid="select-received-by"><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
              <SelectContent>
                {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ملف الإيصال</Label>
            <Input data-testid="input-receipt-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={uploading || !file || !receivedByStaffId} data-testid="button-submit-receipt">
            {uploading ? "جاري الرفع..." : "تأكيد الاستلام"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectDetailPanel({ apiBase, projectId, canManageContract = false }: { apiBase: string; projectId: string; canManageContract?: boolean }) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");

  const { data: project, isLoading } = useQuery<ProjectData>({ queryKey: [`${apiBase}/projects/${projectId}`] });
  const { data: stages = [] } = useQuery<Stage[]>({ queryKey: [`${apiBase}/projects/${projectId}/stages`] });
  const { data: deliverables = [] } = useQuery<Deliverable[]>({ queryKey: [`${apiBase}/projects/${projectId}/deliverables`] });
  const { data: comments = [] } = useQuery<Comment[]>({ queryKey: [`${apiBase}/projects/${projectId}/comments`] });
  const { data: contract = null } = useQuery<ContractData | null>({
    queryKey: [`${apiBase}/projects/${projectId}/contract`],
    enabled: canManageContract,
  });
  const { data: payments = [] } = useQuery<PaymentData[]>({
    queryKey: [`${apiBase}/projects/${projectId}/payments`],
    enabled: canManageContract,
  });
  const { data: staff = [] } = useQuery<StaffUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: canManageContract,
  });

  const stageStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `${apiBase}/stages/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`${apiBase}/projects/${projectId}/stages`] }),
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteStageMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `${apiBase}/stages/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`${apiBase}/projects/${projectId}/stages`] }),
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => apiRequest("POST", `${apiBase}/projects/${projectId}/comments`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/projects/${projectId}/comments`] });
      setCommentText("");
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  if (isLoading || !project) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const sortedStages = [...stages].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-muted-foreground mt-1">{project.clientName}</p>
        {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
      </div>

      {canManageContract && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">العقد والدفعات</h2>
              <UploadContractDialog apiBase={apiBase} projectId={projectId} hasContract={!!contract} />
            </div>
            {contract ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{contract.fileName}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(contract.fileSize)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">{Number(contract.totalValue).toLocaleString()} د.أ</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => downloadFile(`${apiBase}/projects/${projectId}/contract/download`, contract.fileName).catch((e) => toast({ title: e.message, variant: "destructive" }))}
                  >
                    <Download className="w-3.5 h-3.5" /> تنزيل
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-xl">
                لم يتم رفع العقد بعد
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <h3 className="font-medium text-sm">الدفعات</h3>
              <AddPaymentDialog apiBase={apiBase} projectId={projectId} />
            </div>
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} data-testid={`admin-payment-${p.id}`} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{p.label}</p>
                      <Badge className={p.status === "received" ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"}>
                        {p.status === "received" ? "تم الاستلام" : "قيد الانتظار"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Number(p.amount).toLocaleString()} د.أ
                      {p.dueDate && ` · تاريخ الاستحقاق: ${p.dueDate}`}
                      {p.status === "received" && p.receivedByStaffId && ` · استلمها: ${staff.find((s) => s.id === p.receivedByStaffId)?.name || ""}`}
                    </p>
                  </div>
                  {p.status === "pending" ? (
                    <UploadReceiptDialog apiBase={apiBase} projectId={projectId} paymentId={p.id} staff={staff} />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => downloadFile(`${apiBase}/payments/${p.id}/download-receipt`, `receipt-${p.label}`).catch((e) => toast({ title: e.message, variant: "destructive" }))}
                    >
                      <Download className="w-3.5 h-3.5" /> تنزيل الإيصال
                    </Button>
                  )}
                </div>
              ))}
              {payments.length === 0 && <p className="text-sm text-muted-foreground">لا توجد دفعات مضافة بعد</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">مراحل المشروع</h2>
            <AddStageDialog apiBase={apiBase} projectId={projectId} nextSequence={sortedStages.length + 1} />
          </div>
          <div className="space-y-2">
            {sortedStages.map((stage) => (
              <div key={stage.id} data-testid={`admin-stage-${stage.id}`} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{stage.title}</p>
                  {stage.description && <p className="text-xs text-muted-foreground">{stage.description}</p>}
                </div>
                <Select value={stage.status} onValueChange={(v) => stageStatusMutation.mutate({ id: stage.id, status: v })}>
                  <SelectTrigger className={`w-48 text-xs ${STAGE_STATUS_COLOR[stage.status]}`} data-testid={`select-stage-status-${stage.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive flex-shrink-0"
                  onClick={() => deleteStageMutation.mutate(stage.id)}
                  data-testid={`button-delete-stage-${stage.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {sortedStages.length === 0 && <p className="text-sm text-muted-foreground">لم تُضف مراحل بعد</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">التسليمات</h2>
            <UploadDeliverableDialog apiBase={apiBase} projectId={projectId} />
          </div>
          <div className="space-y-2">
            {deliverables.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(d.fileSize)} · v{d.version}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => downloadDeliverable(apiBase, d.id, d.fileName).catch((e) => toast({ title: e.message, variant: "destructive" }))}
                >
                  <Download className="w-3.5 h-3.5" /> تنزيل
                </Button>
              </div>
            ))}
            {deliverables.length === 0 && <p className="text-sm text-muted-foreground">لا توجد ملفات مرفوعة بعد</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold">الملاحظات والتواصل مع العميل</h2>
          <div className="space-y-3 max-h-80 overflow-auto">
            {comments.length === 0 && <p className="text-sm text-muted-foreground">لا توجد ملاحظات بعد</p>}
            {comments.map((c) => (
              <div
                key={c.id}
                className={`rounded-lg p-3 text-sm max-w-[85%] ${c.authorType === "staff" ? "bg-primary/10 mr-auto" : "bg-muted ml-auto"}`}
              >
                <p className="text-xs text-muted-foreground mb-1">{c.authorType === "staff" ? "أنت (الفريق)" : "العميل"}</p>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              data-testid="textarea-staff-comment"
              placeholder="اكتب ردك للعميل..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={() => commentText.trim() && commentMutation.mutate(commentText)}
              disabled={commentMutation.isPending || !commentText.trim()}
              data-testid="button-send-staff-comment"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
