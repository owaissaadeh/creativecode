import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Trash2 } from "lucide-react";
import type { Client } from "@shared/schema";

interface RecurringChargeRow {
  id: string;
  title: string;
  description: string | null;
  amount: string;
  frequency: "once" | "monthly";
  status: "active" | "paused" | "completed";
  nextSendDate: string;
  lastSentAt: string | null;
}

const EMPTY_FORM = { title: "", description: "", amount: "", frequency: "monthly" as "once" | "monthly", startDate: "" };

export default function ClientRecurringChargesDialog({ client, open, onClose }: { client: Client; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: charges = [] } = useQuery<RecurringChargeRow[]>({
    queryKey: [`/api/admin/clients/${client.id}/recurring-charges`],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/clients/${client.id}/recurring-charges`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/clients/${client.id}/recurring-charges`] });
      toast({ title: "تمت إضافة البند" });
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest("PATCH", `/api/admin/recurring-charges/${id}`, { status: active ? "active" : "paused" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/admin/clients/${client.id}/recurring-charges`] }),
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/recurring-charges/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/clients/${client.id}/recurring-charges`] });
      toast({ title: "تم حذف البند" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const statusLabel: Record<RecurringChargeRow["status"], string> = { active: "نشط", paused: "متوقف", completed: "منتهي" };
  const statusVariant: Record<RecurringChargeRow["status"], "default" | "secondary" | "outline"> = {
    active: "default", paused: "secondary", completed: "outline",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>الدفعات المتكررة — {client.clientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {charges.length > 0 && (
            <div className="space-y-2">
              <Label>البنود الحالية</Label>
              {charges.map((c) => (
                <div key={c.id} className="rounded-lg border p-2.5 text-sm space-y-1.5" data-testid={`row-recurring-charge-${c.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{c.title}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
                      <Badge variant="outline">{c.frequency === "monthly" ? "شهري" : "لمرة واحدة"}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Number(c.amount).toLocaleString()} د.أ ·{" "}
                    {c.status === "completed" && c.lastSentAt
                      ? `آخر إرسال: ${new Date(c.lastSentAt).toLocaleDateString("ar-SA")}`
                      : `الموعد القادم: ${c.nextSendDate}`}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{c.description}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.frequency === "monthly" && c.status !== "completed" && (
                        <Switch
                          checked={c.status === "active"}
                          onCheckedChange={(v) => toggleActiveMutation.mutate({ id: c.id, active: v })}
                          data-testid={`switch-recurring-charge-${c.id}`}
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(c.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-recurring-charge-${c.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-border">
            <Label className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> إضافة بند جديد</Label>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">العنوان</Label>
              <Input
                data-testid="input-recurring-charge-title"
                placeholder="مثال: اشتراك الاستضافة الشهري"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ملاحظة (اختياري)</Label>
              <Textarea
                data-testid="input-recurring-charge-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">المبلغ (د.أ)</Label>
                <Input
                  data-testid="input-recurring-charge-amount"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">التكرار</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as "once" | "monthly" })}>
                  <SelectTrigger data-testid="select-recurring-charge-frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">شهرياً</SelectItem>
                    <SelectItem value="once">لمرة واحدة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">تاريخ البدء</Label>
              <Input
                data-testid="input-recurring-charge-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.title.trim() || !form.amount || !form.startDate}
              data-testid="button-create-recurring-charge"
            >
              {createMutation.isPending ? "جاري الإضافة..." : "إضافة البند"}
            </Button>
            <p className="text-xs text-muted-foreground">
              سيتم إرسال إيميل تلقائي للعميل بالتاريخ المحدد، ويتكرر شهرياً إذا اخترت ذلك.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
