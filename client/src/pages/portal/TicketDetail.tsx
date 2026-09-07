import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { usePortalAuthStore } from "@/lib/portalAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Paperclip, Download } from "lucide-react";

interface TicketMessage {
  id: string;
  senderType: "client" | "staff";
  body: string;
  createdAt: string;
  attachmentFileName: string | null;
}

interface TicketDetailData {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  messages: TicketMessage[];
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوحة", color: "bg-blue-500/10 text-blue-600" },
  in_progress: { label: "قيد المعالجة", color: "bg-orange-500/10 text-orange-600" },
  resolved: { label: "تم الحل", color: "bg-green-500/10 text-green-600" },
  closed: { label: "مغلقة", color: "bg-gray-500/10 text-gray-600" },
};

function getPortalToken() {
  try { const s = localStorage.getItem("portal-auth"); return s ? JSON.parse(s)?.state?.token : null; } catch { return null; }
}

async function sendTicketMessage(ticketId: string, body: string, file: File | null) {
  const token = getPortalToken();
  const fd = new FormData();
  fd.append("body", body);
  if (file) fd.append("file", file);
  const res = await fetch(`/api/portal/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "فشل إرسال الرد");
  return res.json();
}

async function downloadAttachment(messageId: string, filename: string) {
  const token = getPortalToken();
  const res = await fetch(`/api/portal/ticket-messages/${messageId}/attachment`, {
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

export default function PortalTicketDetail() {
  const params = useParams();
  const ticketId = params.id as string;
  const { clientUser } = usePortalAuthStore();
  const { toast } = useToast();
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: ticket, isLoading } = useQuery<TicketDetailData>({
    queryKey: [`/api/portal/tickets/${ticketId}`],
  });

  const replyMutation = useMutation({
    mutationFn: () => sendTicketMessage(ticketId, reply, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/portal/tickets/${ticketId}`] });
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

  const statusCfg = STATUS_CFG[ticket.status] || STATUS_CFG.open;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <Badge className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{ticket.description}</p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-3 max-h-96 overflow-auto">
            {ticket.messages.map((m) => (
              <div
                key={m.id}
                data-testid={`ticket-message-${m.id}`}
                className={`rounded-lg p-3 text-sm max-w-[85%] ${m.senderType === "client" ? "bg-primary/10 mr-auto" : "bg-muted ml-auto"}`}
              >
                <p className="text-xs text-muted-foreground mb-1">{m.senderType === "client" ? clientUser?.name : "فريق الدعم الفني"}</p>
                <p>{m.body}</p>
                {m.attachmentFileName && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 mt-1 gap-1 text-xs underline"
                    onClick={() => downloadAttachment(m.id, m.attachmentFileName!).catch((e) => toast({ title: e.message, variant: "destructive" }))}
                  >
                    <Paperclip className="w-3 h-3" /> {m.attachmentFileName} <Download className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {ticket.status !== "closed" && (
            <div className="space-y-2">
              <Textarea
                data-testid="textarea-ticket-reply"
                placeholder="اكتب ردك هنا..."
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
                  data-testid="button-send-ticket-reply"
                >
                  <Send className="w-4 h-4" /> إرسال
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
