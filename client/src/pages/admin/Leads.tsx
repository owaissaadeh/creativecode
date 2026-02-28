import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Target, Phone, Mail, Building, UserCheck, ArrowRight, Search, Filter } from "lucide-react";
import type { Lead, User } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string }> = {
  New: { label: "جديد", color: "bg-blue-500/10 text-blue-600" },
  Contacted: { label: "تم التواصل", color: "bg-yellow-500/10 text-yellow-600" },
  Converted: { label: "محوّل", color: "bg-green-500/10 text-green-600" },
  Lost: { label: "مفقود", color: "bg-red-500/10 text-red-600" },
};

export default function AdminLeads() {
  const { toast } = useToast();
  const [assignDialog, setAssignDialog] = useState<Lead | null>(null);
  const [selectedSales, setSelectedSales] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery<Lead[]>({ queryKey: ["/api/admin/leads"] });
  const { data: salesUsers = [] } = useQuery<User[]>({ queryKey: ["/api/admin/users"] });

  const assignMutation = useMutation({
    mutationFn: ({ id, salesId }: { id: string; salesId: string }) =>
      apiRequest("PATCH", `/api/admin/leads/${id}/assign`, { assignedTo: salesId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      setAssignDialog(null);
      toast({ title: "تم تعيين العميل المحتمل بنجاح" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/leads/${id}/convert`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: "تم تحويل العميل المحتمل إلى عميل بنجاح" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const salesList = salesUsers.filter((u) => u.role === "sales");
  const filtered = leads
    .filter((l) => filterStatus === "all" || l.status === filterStatus)
    .filter((l) =>
      !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search)
    );

  const salesMap = Object.fromEntries(salesUsers.map((u) => [u.id, u.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">العملاء المحتملون</h1>
        <p className="text-muted-foreground mt-1">إدارة وتعيين العملاء المحتملين</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            data-testid="input-leads-search"
            placeholder="بحث بالاسم أو الهاتف..."
            className="pr-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44" data-testid="select-leads-filter">
            <Filter className="w-4 h-4 ml-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="New">جديد</SelectItem>
            <SelectItem value="Contacted">تم التواصل</SelectItem>
            <SelectItem value="Converted">محوّل</SelectItem>
            <SelectItem value="Lost">مفقود</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Target className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">لا يوجد عملاء محتملون</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const sc = statusConfig[lead.status] || { label: lead.status, color: "" };
            return (
              <Card key={lead.id} data-testid={`card-lead-${lead.id}`} className="hover-elevate">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{lead.name}</h3>
                        <Badge className={sc.color}>{sc.label}</Badge>
                        {lead.assignedTo && (
                          <Badge variant="outline" className="text-xs">
                            {salesMap[lead.assignedTo] || "موظف"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {lead.companyName && (
                          <span className="flex items-center gap-1"><Building className="w-3 h-3" />{lead.companyName}</span>
                        )}
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>
                        <span className="text-xs">المصدر: {lead.source}</span>
                      </div>
                      {lead.message && <p className="text-sm text-muted-foreground line-clamp-1">{lead.message}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {lead.status !== "Converted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setAssignDialog(lead); setSelectedSales(lead.assignedTo || ""); }}
                          data-testid={`button-assign-lead-${lead.id}`}
                        >
                          <UserCheck className="w-4 h-4 ml-1" />
                          تعيين
                        </Button>
                      )}
                      {lead.status !== "Converted" && lead.status !== "Lost" && (
                        <Button
                          size="sm"
                          onClick={() => convertMutation.mutate(lead.id)}
                          disabled={convertMutation.isPending}
                          data-testid={`button-convert-lead-${lead.id}`}
                        >
                          <ArrowRight className="w-4 h-4 ml-1" />
                          تحويل
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent dir="rtl" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>تعيين موظف للعميل المحتمل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">العميل: <span className="font-medium text-foreground">{assignDialog?.name}</span></p>
            <Select value={selectedSales} onValueChange={setSelectedSales}>
              <SelectTrigger data-testid="select-assign-sales">
                <SelectValue placeholder="اختر موظف مبيعات" />
              </SelectTrigger>
              <SelectContent>
                {salesList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={!selectedSales || assignMutation.isPending}
                onClick={() => assignDialog && assignMutation.mutate({ id: assignDialog.id, salesId: selectedSales })}
                data-testid="button-confirm-assign"
              >
                {assignMutation.isPending ? "جاري التعيين..." : "تعيين"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setAssignDialog(null)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
