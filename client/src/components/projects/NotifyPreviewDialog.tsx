import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { NotifyPreview } from "@/hooks/use-notify-client";

export default function NotifyPreviewDialog({
  preview, loading, sending, onClose, onConfirm,
}: {
  preview: NotifyPreview | null;
  loading: boolean;
  sending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const open = loading || !!preview;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>معاينة البريد الإلكتروني</DialogTitle>
        </DialogHeader>
        {loading || !preview ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-[480px] w-full rounded-lg" />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              الموضوع: <span className="font-medium text-foreground">{preview.subject}</span>
            </p>
            <iframe
              sandbox=""
              srcDoc={preview.html}
              className="w-full h-[480px] rounded-lg border bg-white"
              title="معاينة البريد"
              data-testid="iframe-notify-preview"
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-notify">
            إلغاء
          </Button>
          <Button onClick={onConfirm} disabled={sending || loading || !preview} data-testid="button-confirm-notify">
            {sending ? "جارٍ الإرسال..." : "تأكيد الإرسال"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
