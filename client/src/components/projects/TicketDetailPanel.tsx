import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Paperclip, Download } from "lucide-react";
import type { User } from "@shared/schema";

interface TicketMessage {
  id: string;
  senderType: "client" | "staff";
  body: string;
  attachmentFileName: string | null;
}

interface TicketDetailData {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  clientName?: string;
  messages: TicketMessage[];
}

const STATUS_OPTIONS = [
  { value: "open", label: "مفتوحة" },
  { value: "in_progress", label: "قيد المعالجة" },
  { value: "resolved", label: "تم الحل" },
  { value: "closed", label: "مغلقة" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "منخفضة" },
  { value: "medium", label: "متوسطة" },
  { value: "high", label: "عالية" },
  { value: "urgent", label: "عاجلة" },
];

function getStaffToken() {
  try { const s = localStorage.getItem("crm-auth"); return s ? JSON.parse(s)?.state?.token : null; } catch { return null; }
}

async function sendTicketMessage(apiBase: string, ticketId: string, body: string, file: File | null) {
  const token = getStaffToken();
  const fd = new FormData();
  fd.append("body", body);
  if (file) fd.append("file", file);
  const res = await fetch(`${apiBase}/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "فشل إرسال الرد");
  return res.json();
}

async function downloadAttachment(apiBase: string, messageId: string, filename: string) {
  const token = getStaffToken();
  const res = await fetch(`${apiBase}/ticket-messages/${messageId}/attachment`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("فشل تنزيل المرفق");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TicketDetailPanel({ apiBase, ticketId, canAssign }: { apiBase: string; ticketId: string; canAssign: boolean }) {
  const { toast } = useToast();
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: ticket, isLoading } = useQuery<TicketDetailData>({ queryKey: [`${apiBase}/tickets/${ticketId}`] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/admin/users"], enabled: canAssign });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("PATCH", `${apiBase}/tickets/${ticketId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`${apiBase}/tickets/${ticketId}`] }),
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: () => sendTicketMessage(apiBase, ticketId, reply, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/tickets/${ticketId}`] });
      setReply("");
      setFile(null);
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  if (isLoading || !ticket) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{ticket.subject}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{ticket.clientName} · {ticket.description}</p>
      </div>

      <Card>
        <CardContent className="p-5 flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">الحالة</label>
            <Select value={ticket.status} onValueChange={(v) => updateMutation.mutate({ status: v })}>
              <SelectTrigger className="w-44" data-testid="select-ticket-status"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">الأولوية</label>
            <Select value={ticket.priority} onValueChange={(v) => updateMutation.mutate({ priority: v })}>
              <SelectTrigger className="w-36" data-testid="select-ticket-priority"><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {canAssign && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">إسناد إلى</label>
              <Select value={ticket.assignedTo || "none"} onValueChange={(v) => updateMutation.mutate({ assignedTo: v === "none" ? null : v })}>
                <SelectTrigger className="w-44" data-testid="select-ticket-assignee"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">غير مُسندة</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-3 max-h-96 overflow-auto">
            {ticket.messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg p-3 text-sm max-w-[85%] ${m.senderType === "staff" ? "bg-primary/10 mr-auto" : "bg-muted ml-auto"}`}
              >
                <p className="text-xs text-muted-foreground mb-1">{m.senderType === "staff" ? "أنت (الفريق)" : "العميل"}</p>
                <p>{m.body}</p>
                {m.attachmentFileName && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 mt-1 gap-1 text-xs underline"
                    onClick={() => downloadAttachment(apiBase, m.id, m.attachmentFileName!).catch((e) => toast({ title: e.message, variant: "destructive" }))}
                  >
                    <Paperclip className="w-3 h-3" /> {m.attachmentFileName} <Download className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Textarea
              data-testid="textarea-staff-ticket-reply"
              placeholder="اكتب ردك للعميل..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
            />
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <Paperclip className="w-3.5 h-3.5" />
                {file ? file.name : "إرفاق ملف (اختياري)"}
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              <Button
                onClick={() => reply.trim() && replyMutation.mutate()}
                disabled={replyMutation.isPending || !reply.trim()}
                className="gap-1.5"
                data-testid="button-send-staff-ticket-reply"
              >
                <Send className="w-4 h-4" /> إرسال
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
