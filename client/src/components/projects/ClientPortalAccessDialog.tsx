import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyRound, Mail } from "lucide-react";
import type { Client } from "@shared/schema";

interface ClientPortalUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
  isActive: boolean;
  lastLoginAt: string | null;
}

export default function ClientPortalAccessDialog({ client, open, onClose }: { client: Client; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: client.clientName, email: "", password: "" });

  const { data: portalUsers = [] } = useQuery<ClientPortalUser[]>({
    queryKey: [`/api/admin/clients/${client.id}/client-users`],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/clients/${client.id}/client-users`, { ...form, role: "owner" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/clients/${client.id}/client-users`] });
      toast({ title: "تم إنشاء حساب البوابة بنجاح" });
      setForm({ name: client.clientName, email: "", password: "" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/admin/client-users/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/admin/clients/${client.id}/client-users`] }),
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>وصول بوابة العميل — {client.clientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {portalUsers.length > 0 && (
            <div className="space-y-2">
              <Label>الحسابات الحالية</Label>
              {portalUsers.map((pu) => (
                <div key={pu.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{pu.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{pu.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">{pu.isActive ? "مفعّل" : "معطّل"}</span>
                    <Switch
                      checked={pu.isActive}
                      onCheckedChange={(v) => toggleActiveMutation.mutate({ id: pu.id, isActive: v })}
                      data-testid={`switch-portal-user-${pu.id}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-border">
            <Label className="flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> إنشاء حساب دخول جديد</Label>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">الاسم</Label>
              <Input data-testid="input-portal-user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  data-testid="input-portal-user-email"
                  type="email"
                  className="pr-9"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">كلمة المرور المؤقتة</Label>
              <Input
                data-testid="input-portal-user-password"
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="6 أحرف على الأقل"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.name.trim() || !form.email.trim() || form.password.length < 6}
              data-testid="button-create-portal-user"
            >
              {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء الحساب"}
            </Button>
            <p className="text-xs text-muted-foreground">
              شارك بيانات الدخول هذه مع العميل يدوياً ليتمكن من الدخول إلى بوابة العملاء.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
