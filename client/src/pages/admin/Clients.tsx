import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Phone, Mail, Building, DollarSign, Search, Plus } from "lucide-react";
import type { Client, User } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string }> = {
  "New Lead": { label: "عميل جديد", color: "bg-blue-500/10 text-blue-600" },
  "Contacted": { label: "تم التواصل", color: "bg-yellow-500/10 text-yellow-600" },
  "Meeting Scheduled": { label: "اجتماع مجدول", color: "bg-purple-500/10 text-purple-600" },
  "Proposal Sent": { label: "عرض مُرسل", color: "bg-orange-500/10 text-orange-600" },
  "Negotiation": { label: "تفاوض", color: "bg-pink-500/10 text-pink-600" },
  "Won": { label: "مُغلقة", color: "bg-green-500/10 text-green-600" },
  "Lost": { label: "خُسرت", color: "bg-red-500/10 text-red-600" },
};

interface ClientWithSales extends Client { salesName?: string; }

export default function AdminClients() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [noteDialog, setNoteDialog] = useState<Client | null>(null);
  const [note, setNote] = useState("");
  const [editForm, setEditForm] = useState({ status: "", dealValue: "", nextMeetingDate: "" });

  const { data: clients = [], isLoading } = useQuery<ClientWithSales[]>({ queryKey: ["/api/admin/clients"] });
  const { data: salesUsers = [] } = useQuery<User[]>({ queryKey: ["/api/admin/users"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => apiRequest("PATCH", `/api/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setEditClient(null);
      toast({ title: "تم تحديث بيانات العميل" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => apiRequest("POST", `/api/clients/${id}/notes`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setNoteDialog(null);
      setNote("");
      toast({ title: "تمت إضافة الملاحظة" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const salesMap = Object.fromEntries(salesUsers.map((u) => [u.id, u.name]));
  const filtered = clients.filter((c) =>
    !search ||
    c.clientName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const openEdit = (client: Client) => {
    setEditClient(client);
    setEditForm({
      status: client.status,
      dealValue: String(client.dealValue),
      nextMeetingDate: client.nextMeetingDate ? new Date(client.nextMeetingDate).toISOString().slice(0, 16) : "",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">العملاء</h1>
        <p className="text-muted-foreground mt-1">إدارة ومتابعة جميع العملاء</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          data-testid="input-clients-search"
          placeholder="بحث..."
          className="pr-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UserCheck className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">لا يوجد عملاء</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => {
            const sc = statusConfig[client.status] || { label: client.status, color: "" };
            return (
              <Card key={client.id} data-testid={`card-client-${client.id}`} className="hover-elevate">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{client.clientName}</h3>
                        <Badge className={sc.color}>{sc.label}</Badge>
                        {client.salesId && (
                          <Badge variant="outline" className="text-xs">{salesMap[client.salesId] || "موظف"}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {client.companyName && <span className="flex items-center gap-1"><Building className="w-3 h-3" />{client.companyName}</span>}
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <DollarSign className="w-3 h-3" />{Number(client.dealValue).toLocaleString()} ر.س
                        </span>
                      </div>
                      {client.notes?.length > 0 && (
                        <p className="text-xs text-muted-foreground">آخر ملاحظة: {client.notes[client.notes.length - 1]}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => { setNoteDialog(client); setNote(""); }} data-testid={`button-note-client-${client.id}`}>
                        <Plus className="w-4 h-4 ml-1" />
                        ملاحظة
                      </Button>
                      <Button size="sm" onClick={() => openEdit(client)} data-testid={`button-edit-client-${client.id}`}>
                        تحديث
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editClient} onOpenChange={() => setEditClient(null)}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تحديث بيانات العميل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>قيمة الصفقة (ر.س)</Label>
              <Input type="number" value={editForm.dealValue} onChange={(e) => setEditForm({ ...editForm, dealValue: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>موعد الاجتماع القادم</Label>
              <Input type="datetime-local" value={editForm.nextMeetingDate} onChange={(e) => setEditForm({ ...editForm, nextMeetingDate: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={updateMutation.isPending}
                onClick={() => editClient && updateMutation.mutate({ id: editClient.id, data: editForm })}
              >
                {updateMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditClient(null)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة ملاحظة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Textarea placeholder="أكتب ملاحظتك هنا..." rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={!note.trim() || addNoteMutation.isPending}
                onClick={() => noteDialog && addNoteMutation.mutate({ id: noteDialog.id, note })}
              >
                {addNoteMutation.isPending ? "جاري الإضافة..." : "إضافة"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setNoteDialog(null)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
