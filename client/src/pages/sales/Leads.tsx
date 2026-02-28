import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Target, Phone, Mail, Building, Search } from "lucide-react";
import type { Lead } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string }> = {
  New: { label: "جديد", color: "bg-blue-500/10 text-blue-600" },
  Contacted: { label: "تم التواصل", color: "bg-yellow-500/10 text-yellow-600" },
  Converted: { label: "محوّل", color: "bg-green-500/10 text-green-600" },
  Lost: { label: "مفقود", color: "bg-red-500/10 text-red-600" },
};

export default function SalesLeads() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery<Lead[]>({ queryKey: ["/api/sales/leads"] });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/sales/leads/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/stats"] });
      toast({ title: "تم تحديث الحالة" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const filtered = leads
    .filter((l) => filterStatus === "all" || l.status === filterStatus)
    .filter((l) =>
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search)
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">عملائي المحتملون</h1>
        <p className="text-muted-foreground mt-1">العملاء المحتملون المعينون لك</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            data-testid="input-my-leads-search"
            placeholder="بحث..."
            className="pr-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
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
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
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
              <Card key={lead.id} data-testid={`card-my-lead-${lead.id}`} className="hover-elevate">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{lead.name}</h3>
                        <Badge className={sc.color}>{sc.label}</Badge>
                        <span className="text-xs text-muted-foreground">{lead.serviceType}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {lead.companyName && <span className="flex items-center gap-1"><Building className="w-3 h-3" />{lead.companyName}</span>}
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>
                      </div>
                      {lead.message && <p className="text-sm text-muted-foreground line-clamp-1">{lead.message}</p>}
                    </div>
                    <div className="flex-shrink-0">
                      <Select
                        value={lead.status}
                        onValueChange={(v) => updateStatusMutation.mutate({ id: lead.id, status: v })}
                        disabled={lead.status === "Converted"}
                      >
                        <SelectTrigger className="w-40" data-testid={`select-lead-status-${lead.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">جديد</SelectItem>
                          <SelectItem value="Contacted">تم التواصل</SelectItem>
                          <SelectItem value="Lost">مفقود</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
