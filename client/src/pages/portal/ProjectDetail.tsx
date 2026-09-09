import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { usePortalAuthStore } from "@/lib/portalAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  CheckCircle2, Circle, Clock, FileEdit, Download, MessageSquare, Send, File as FileIcon, Bell, ArrowLeft, XCircle, FileText,
} from "lucide-react";

interface Approval {
  id: string;
  decision: "approved" | "changes_requested";
  clientComment: string | null;
  createdAt: string;
}

interface Stage {
  id: string;
  title: string;
  description: string | null;
  sequence: number;
  status: "not_started" | "in_progress" | "needs_review" | "changes_requested" | "approved" | "completed";
  plannedDate: string | null;
  approvals: Approval[];
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  stages: Stage[];
  progress: number;
}

interface Deliverable {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  version: number;
  createdAt: string;
  stageId: string | null;
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
}

interface PaymentData {
  id: string;
  amount: string;
  label: string;
  dueDate: string | null;
  status: "pending" | "received";
  receivedByName: string | null;
}

const STAGE_STATUS: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  not_started: { label: "لم تبدأ", color: "text-muted-foreground", icon: Circle },
  in_progress: { label: "جارية", color: "text-blue-600", icon: Clock },
  needs_review: { label: "بانتظار مراجعتك", color: "text-orange-600", icon: FileEdit },
  changes_requested: { label: "طلبت تعديلات", color: "text-amber-600", icon: FileEdit },
  approved: { label: "معتمدة", color: "text-green-600", icon: CheckCircle2 },
  completed: { label: "مكتملة", color: "text-green-600", icon: CheckCircle2 },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function downloadFile(url: string, filename: string) {
  const token = (() => {
    try { const s = localStorage.getItem("portal-auth"); return s ? JSON.parse(s)?.state?.token : null; } catch { return null; }
  })();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("فشل تنزيل الملف");
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objUrl);
}

async function downloadDeliverable(id: string, filename: string) {
  return downloadFile(`/api/portal/deliverables/${id}/download`, filename);
}

function ApproveDialog({ stage, projectId, open, onClose }: { stage: Stage; projectId: string; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [decision, setDecision] = useState<"approved" | "changes_requested">("approved");
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/portal/stages/${stage.id}/approve`, { decision, comment: comment || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/portal/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/portal/projects`] });
      toast({ title: decision === "approved" ? "تم اعتماد المرحلة" : "تم إرسال طلب التعديلات" });
      onClose();
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>مراجعة مرحلة — {stage.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              variant={decision === "approved" ? "default" : "outline"}
              className="flex-1 gap-1.5"
              onClick={() => setDecision("approved")}
              data-testid="button-decision-approve"
            >
              <CheckCircle2 className="w-4 h-4" /> اعتماد
            </Button>
            <Button
              variant={decision === "changes_requested" ? "default" : "outline"}
              className="flex-1 gap-1.5"
              onClick={() => setDecision("changes_requested")}
              data-testid="button-decision-changes"
            >
              <FileEdit className="w-4 h-4" /> طلب تعديلات
            </Button>
          </div>
          <Textarea
            data-testid="textarea-approval-comment"
            placeholder={decision === "approved" ? "ملاحظة اختيارية..." : "اشرح التعديلات المطلوبة..."}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-submit-approval">
            {mutation.isPending ? "جاري الإرسال..." : "إرسال"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PortalProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;
  const { clientUser } = usePortalAuthStore();
  const { toast } = useToast();
  const [approvingStage, setApprovingStage] = useState<Stage | null>(null);
  const [commentText, setCommentText] = useState("");

  const { data: project, isLoading } = useQuery<ProjectData>({
    queryKey: [`/api/portal/projects/${projectId}`],
  });

  const { data: deliverables = [] } = useQuery<Deliverable[]>({
    queryKey: [`/api/portal/projects/${projectId}/deliverables`],
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/portal/projects/${projectId}/comments`],
  });

  const { data: contract = null } = useQuery<ContractData | null>({
    queryKey: [`/api/portal/projects/${projectId}/contract`],
  });

  const { data: payments = [] } = useQuery<PaymentData[]>({
    queryKey: [`/api/portal/projects/${projectId}/payments`],
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => apiRequest("POST", `/api/portal/projects/${projectId}/comments`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/portal/projects/${projectId}/comments`] });
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

  const sortedStages = [...project.stages].sort((a, b) => a.sequence - b.sequence);
  const stagesNeedingReview = sortedStages.filter((s) => s.status === "needs_review");
  const today = new Date();
  const overduePayments = payments.filter((p) => p.status === "pending" && p.dueDate && new Date(p.dueDate) < today);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
        <div className="mt-3 space-y-1.5 max-w-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>نسبة الإنجاز</span>
            <span>{project.progress}%</span>
          </div>
          <Progress value={project.progress} />
        </div>
      </div>

      {/* Action-needed banner */}
      {stagesNeedingReview.map((stage) => (
        <div
          key={stage.id}
          data-testid={`banner-needs-review-${stage.id}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 p-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Bell className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">بانتظار مراجعتك</p>
              <p className="text-sm text-orange-700 dark:text-orange-400 truncate">
                مرحلة "{stage.title}" جاهزة — راجعها واعتمدها أو اطلب تعديلات
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 flex-shrink-0 bg-orange-600 hover:bg-orange-700"
            onClick={() => setApprovingStage(stage)}
            data-testid={`button-banner-review-${stage.id}`}
          >
            راجع الآن <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}

      {/* Overdue payment banner */}
      {overduePayments.map((p) => (
        <div
          key={p.id}
          data-testid={`banner-overdue-payment-${p.id}`}
          className="flex items-center gap-3 rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 p-4"
        >
          <Bell className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-700 dark:text-orange-400">
            دفعة متأخرة: <span className="font-semibold">{p.label}</span> — {Number(p.amount).toLocaleString()} د.أ كانت مستحقة بتاريخ {p.dueDate}
          </p>
        </div>
      ))}

      {/* Contract & Payments */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-1.5"><FileText className="w-4 h-4" /> العقد والدفعات</h2>
          {contract ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <p className="text-sm font-medium truncate">{contract.fileName}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">{Number(contract.totalValue).toLocaleString()} د.أ</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => downloadFile(`/api/portal/projects/${projectId}/contract/download`, contract.fileName).catch((e) => toast({ title: e.message, variant: "destructive" }))}
                  data-testid="button-download-contract"
                >
                  <Download className="w-3.5 h-3.5" /> تنزيل العقد
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لم يتم رفع العقد بعد</p>
          )}

          {payments.length > 0 && (
            <div className="space-y-2 pt-1">
              {payments.map((p) => (
                <div key={p.id} data-testid={`payment-${p.id}`} className="flex items-center gap-3 rounded-lg border p-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{p.label}</span>
                      <Badge className={p.status === "received" ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"}>
                        {p.status === "received" ? "تم الاستلام" : "قيد الانتظار"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Number(p.amount).toLocaleString()} د.أ
                      {p.dueDate && ` · تاريخ الاستحقاق: ${p.dueDate}`}
                      {p.status === "received" && p.receivedByName && ` · استلمها: ${p.receivedByName}`}
                    </p>
                  </div>
                  {p.status === "received" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => downloadFile(`/api/portal/payments/${p.id}/download-receipt`, `receipt-${p.label}`).catch((e) => toast({ title: e.message, variant: "destructive" }))}
                      data-testid={`button-download-receipt-${p.id}`}
                    >
                      <Download className="w-3.5 h-3.5" /> تنزيل الإيصال
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stages timeline */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold">مراحل المشروع</h2>
          <div className="space-y-3">
            {sortedStages.map((stage) => {
              const cfg = STAGE_STATUS[stage.status];
              const Icon = cfg.icon;
              return (
                <div key={stage.id} data-testid={`stage-${stage.id}`} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{stage.title}</span>
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                      </div>
                      {stage.description && <p className="text-xs text-muted-foreground">{stage.description}</p>}
                    </div>
                    {stage.status === "needs_review" && (
                      <Button size="sm" onClick={() => setApprovingStage(stage)} data-testid={`button-review-stage-${stage.id}`}>
                        مراجعة الآن
                      </Button>
                    )}
                  </div>
                  {stage.approvals.length > 0 && (
                    <div className="mr-8 space-y-1.5 border-r-2 border-border pr-3">
                      {stage.approvals.map((a) => (
                        <div key={a.id} data-testid={`approval-${a.id}`} className="text-xs flex items-start gap-1.5">
                          {a.decision === "approved" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className={a.decision === "approved" ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}>
                              {a.decision === "approved" ? "اعتمدتها" : "طلبت تعديلات"}
                            </span>
                            <span className="text-muted-foreground"> — {new Date(a.createdAt).toLocaleDateString("ar-SA")}</span>
                            {a.clientComment && <p className="text-muted-foreground mt-0.5">{a.clientComment}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {sortedStages.length === 0 && <p className="text-sm text-muted-foreground">لم يتم تحديد مراحل بعد</p>}
          </div>
        </CardContent>
      </Card>

      {/* Deliverables */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold">التسليمات</h2>
          {deliverables.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد ملفات مسلّمة بعد</p>
          ) : (
            <div className="space-y-2">
              {deliverables.map((d) => (
                <div key={d.id} data-testid={`deliverable-${d.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
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
                    className="gap-1.5 flex-shrink-0"
                    onClick={() => downloadDeliverable(d.id, d.fileName).catch((e) => toast({ title: e.message, variant: "destructive" }))}
                    data-testid={`button-download-${d.id}`}
                  >
                    <Download className="w-3.5 h-3.5" /> تنزيل
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> الملاحظات والتواصل</h2>
          <div className="space-y-3 max-h-80 overflow-auto">
            {comments.length === 0 && <p className="text-sm text-muted-foreground">لا توجد ملاحظات بعد</p>}
            {comments.map((c) => (
              <div
                key={c.id}
                data-testid={`comment-${c.id}`}
                className={`rounded-lg p-3 text-sm max-w-[85%] ${
                  c.authorType === "client" ? "bg-primary/10 mr-auto" : "bg-muted ml-auto"
                }`}
              >
                <p className="text-xs text-muted-foreground mb-1">{c.authorType === "client" ? clientUser?.name : "فريق Creative Code"}</p>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              data-testid="textarea-new-comment"
              placeholder="اكتب ملاحظتك هنا..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={() => commentText.trim() && commentMutation.mutate(commentText)}
              disabled={commentMutation.isPending || !commentText.trim()}
              data-testid="button-send-comment"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {approvingStage && (
        <ApproveDialog stage={approvingStage} projectId={projectId} open={!!approvingStage} onClose={() => setApprovingStage(null)} />
      )}
    </div>
  );
}
