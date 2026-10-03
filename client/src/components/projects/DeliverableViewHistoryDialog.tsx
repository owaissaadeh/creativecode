import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye } from "lucide-react";

interface DeliverableViewEntry {
  viewedAt: string;
  clientUserName: string;
}

export default function DeliverableViewHistoryDialog({
  apiBase, deliverableId, deliverableTitle, onClose,
}: {
  apiBase: string;
  deliverableId: string | null;
  deliverableTitle: string;
  onClose: () => void;
}) {
  const open = !!deliverableId;

  const { data: views = [], isLoading } = useQuery<DeliverableViewEntry[]>({
    queryKey: [`${apiBase}/deliverables/${deliverableId}/views`],
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> سجل الاطلاع — {deliverableTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : views.length === 0 ? (
            <p className="text-sm text-muted-foreground">لم يتم الاطلاع عليه بعد</p>
          ) : (
            views.map((v, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm" data-testid={`row-deliverable-view-${i}`}>
                <span className="font-medium">{v.clientUserName}</span>
                <span className="text-xs text-muted-foreground">{new Date(v.viewedAt).toLocaleString("ar-SA")}</span>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
