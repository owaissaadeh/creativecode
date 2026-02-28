import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck, Phone, Mail, Clock, Calendar, MessageSquare, Filter } from "lucide-react";
import type { Consultation } from "@shared/schema";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "قيد الانتظار", variant: "outline", color: "border-yellow-400 text-yellow-600 bg-yellow-50 dark:bg-yellow-950" },
  confirmed: { label: "مؤكد", variant: "default", color: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950" },
  done: { label: "منتهي", variant: "secondary", color: "border-green-400 text-green-600 bg-green-50 dark:bg-green-950" },
  cancelled: { label: "ملغي", variant: "destructive", color: "border-red-400 text-red-600 bg-red-50 dark:bg-red-950" },
};

const SERVICE_LABELS: Record<string, string> = {
  website: "موقع ويب",
  mobile: "تطبيق موبايل",
  ai: "ذكاء اصطناعي",
  system: "نظام إدارة",
  automation: "أتمتة العمليات",
  consulting: "استشارة تقنية",
};

function NotesDialog({ consultation, open, onClose }: { consultation: Consultation; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(consultation.adminNotes || "");
  const [status, setStatus] = useState(consultation.status);

  const mutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/admin/consultations/${consultation.id}`, { status, adminNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/consultations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "تم التحديث بنجاح" });
      onClose();
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>تفاصيل الاستشارة — {consultation.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{consultation.phone}</div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />{consultation.email}</div>
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" />{consultation.consultationDate}</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" />{consultation.consultationTime}</div>
            {consultation.message && (
              <div className="pt-2 border-t border-border">
                <p className="text-muted-foreground text-xs mb-1">رسالة العميل:</p>
                <p>{consultation.message}</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Consultation["status"])}>
              <SelectTrigger data-testid="select-consultation-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="confirmed">مؤكد</SelectItem>
                <SelectItem value="done">منتهي</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ملاحظات الأدمن</Label>
            <Textarea
              data-testid="textarea-admin-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظاتك هنا..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-save-consultation">
            {mutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Consultations() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  const { data: consultations = [], isLoading } = useQuery<Consultation[]>({
    queryKey: ["/api/admin/consultations"],
  });

  const filtered = filterStatus === "all"
    ? consultations
    : consultations.filter((c) => c.status === filterStatus);

  const statusCounts = {
    all: consultations.length,
    pending: consultations.filter((c) => c.status === "pending").length,
    confirmed: consultations.filter((c) => c.status === "confirmed").length,
    done: consultations.filter((c) => c.status === "done").length,
    cancelled: consultations.filter((c) => c.status === "cancelled").length,
  };

  const quickUpdate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/consultations/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/consultations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-primary" />
          الاستشارات المحجوزة
        </h1>
        <p className="text-muted-foreground mt-1">إدارة طلبات الاستشارة القادمة من الموقع</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "الكل" },
          { key: "pending", label: "قيد الانتظار" },
          { key: "confirmed", label: "مؤكدة" },
          { key: "done", label: "منتهية" },
          { key: "cancelled", label: "ملغية" },
        ].map((f) => (
          <button
            key={f.key}
            data-testid={`filter-${f.key}`}
            onClick={() => setFilterStatus(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all flex items-center gap-2 ${
              filterStatus === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterStatus === f.key ? "bg-primary-foreground/20" : "bg-muted"}`}>
              {statusCounts[f.key as keyof typeof statusCounts]}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد استشارات {filterStatus !== "all" ? "بهذه الحالة" : "بعد"}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((c) => {
            const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
            return (
              <div
                key={c.id}
                data-testid={`row-consultation-${c.id}`}
                className="rounded-xl border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{c.name}</span>
                    {c.companyName && <span className="text-sm text-muted-foreground">— {c.companyName}</span>}
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.phone}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{c.email}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{c.consultationDate}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{c.consultationTime}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {SERVICE_LABELS[c.serviceType] || c.serviceType}
                    </span>
                    {c.adminNotes && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> ملاحظة موجودة
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {c.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-confirm-${c.id}`}
                      onClick={() => quickUpdate.mutate({ id: c.id, status: "confirmed" })}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      تأكيد
                    </Button>
                  )}
                  {c.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-done-${c.id}`}
                      onClick={() => quickUpdate.mutate({ id: c.id, status: "done" })}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      إنهاء
                    </Button>
                  )}
                  {(c.status === "pending" || c.status === "confirmed") && (
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-cancel-${c.id}`}
                      onClick={() => quickUpdate.mutate({ id: c.id, status: "cancelled" })}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      إلغاء
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid={`button-notes-${c.id}`}
                    onClick={() => setSelectedConsultation(c)}
                    className="gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    تفاصيل
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedConsultation && (
        <NotesDialog
          consultation={selectedConsultation}
          open={!!selectedConsultation}
          onClose={() => setSelectedConsultation(null)}
        />
      )}
    </div>
  );
}
