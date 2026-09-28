import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ToastAction } from "@/components/ui/toast";

export type NotifyType = "deliverable" | "payment" | "receipt" | "stage_status" | "contract" | "comment" | "project_summary" | "financial_summary";

export interface NotifyPreview {
  type: NotifyType;
  refId?: string;
  subject: string;
  html: string;
}

export function useNotifyClient(apiBase: string, projectId: string) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<NotifyPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);

  async function openPreview(type: NotifyType, refId?: string) {
    setLoadingPreview(true);
    setPreview(null);
    try {
      const res = (await apiRequest("POST", `${apiBase}/projects/${projectId}/notify/preview`, { type, refId })) as {
        subject: string;
        html: string;
      };
      setPreview({ type, refId, subject: res.subject, html: res.html });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
    setLoadingPreview(false);
  }

  function promptNotify(type: NotifyType, refId: string | undefined, toastTitle: string) {
    toast({
      title: toastTitle,
      description: "هل تريد إرسال إشعار بهذا التحديث للعميل؟",
      action: (
        <ToastAction altText="إرسال إشعار للعميل" onClick={() => openPreview(type, refId)} data-testid="toast-action-notify">
          إرسال إشعار للعميل
        </ToastAction>
      ),
    });
  }

  function closePreview() {
    setPreview(null);
  }

  async function confirmSend() {
    if (!preview) return;
    setSending(true);
    try {
      await apiRequest("POST", `${apiBase}/projects/${projectId}/notify/send`, { type: preview.type, refId: preview.refId });
      toast({ title: "تم إرسال الإشعار للعميل" });
      setPreview(null);
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
    setSending(false);
  }

  return { preview, loadingPreview, sending, promptNotify, openPreview, closePreview, confirmSend };
}
