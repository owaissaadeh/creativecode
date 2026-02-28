import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Edit, Users as UsersIcon } from "lucide-react";
import type { User } from "@shared/schema";

export default function AdminUsers() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", commissionRate: "10" });

  const { data: users = [], isLoading } = useQuery<User[]>({ queryKey: ["/api/admin/users"] });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "تم إنشاء المستخدم بنجاح" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; commissionRate: string }) =>
      apiRequest("PATCH", `/api/admin/users/${data.id}`, { commissionRate: data.commissionRate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDialogOpen(false);
      setEditUser(null);
      toast({ title: "تم تحديث نسبة العمولة" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const resetForm = () => setForm({ name: "", email: "", password: "", commissionRate: "10" });

  const handleOpen = (user?: User) => {
    if (user) {
      setEditUser(user);
      setForm({ name: user.name, email: user.email, password: "", commissionRate: String(user.commissionRate) });
    } else {
      setEditUser(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editUser) {
      updateMutation.mutate({ id: editUser.id, commissionRate: form.commissionRate });
    } else {
      if (!form.name || !form.email || !form.password) {
        toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
        return;
      }
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
          <p className="text-muted-foreground mt-1">إنشاء وإدارة موظفي المبيعات</p>
        </div>
        <Button onClick={() => handleOpen()} className="gap-2" data-testid="button-create-user">
          <Plus className="w-4 h-4" />
          موظف جديد
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UsersIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">لا يوجد موظفون بعد</p>
          <Button onClick={() => handleOpen()} variant="outline" className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            أضف أول موظف
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <Card key={user.id} data-testid={`card-user-${user.id}`} className="hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <Badge className={user.role === "admin" ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-600"}>
                    {user.role === "admin" ? "مدير" : "مبيعات"}
                  </Badge>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">نسبة العمولة</span>
                  <span className="font-bold text-primary">{user.commissionRate}%</span>
                </div>
                {user.role === "sales" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleOpen(user)}
                    data-testid={`button-edit-user-${user.id}`}
                  >
                    <Edit className="w-4 h-4" />
                    تعديل العمولة
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? "تعديل نسبة العمولة" : "إضافة موظف مبيعات"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {!editUser && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="u-name">الاسم</Label>
                  <Input id="u-name" data-testid="input-user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم الموظف" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-email">البريد الإلكتروني</Label>
                  <Input id="u-email" type="email" data-testid="input-user-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-pass">كلمة المرور</Label>
                  <Input id="u-pass" type="password" data-testid="input-user-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="كلمة المرور" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="u-commission">نسبة العمولة (%)</Label>
              <Input id="u-commission" type="number" min="0" max="100" data-testid="input-user-commission" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1" data-testid="button-save-user">
                {isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
