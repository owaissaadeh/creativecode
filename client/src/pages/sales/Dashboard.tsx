import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, UserCheck, DollarSign, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/lib/auth";

interface SalesStats {
  totalLeads: number;
  totalClients: number;
  totalCommissions: number;
  wonClients: number;
  recentLeads: Array<{ id: string; name: string; status: string }>;
  recentClients: Array<{ id: string; clientName: string; status: string }>;
}

const leadStatusConfig: Record<string, { label: string; color: string }> = {
  New: { label: "جديد", color: "bg-blue-500/10 text-blue-600" },
  Contacted: { label: "تم التواصل", color: "bg-yellow-500/10 text-yellow-600" },
  Converted: { label: "محوّل", color: "bg-green-500/10 text-green-600" },
  Lost: { label: "مفقود", color: "bg-red-500/10 text-red-600" },
};

const clientStatusConfig: Record<string, { label: string; color: string }> = {
  "New Lead": { label: "جديد", color: "bg-blue-500/10 text-blue-600" },
  Won: { label: "مُغلقة", color: "bg-green-500/10 text-green-600" },
  Lost: { label: "خُسرت", color: "bg-red-500/10 text-red-600" },
  Negotiation: { label: "تفاوض", color: "bg-pink-500/10 text-pink-600" },
};

export default function SalesDashboard() {
  const { user } = useAuthStore();
  const { data: stats, isLoading } = useQuery<SalesStats>({ queryKey: ["/api/sales/stats"] });

  const cards = [
    { title: "عملائي المحتملون", value: stats?.totalLeads || 0, icon: Target, color: "text-blue-600 bg-blue-500/10" },
    { title: "عملائي", value: stats?.totalClients || 0, icon: UserCheck, color: "text-green-600 bg-green-500/10" },
    { title: "صفقات مُغلقة", value: stats?.wonClients || 0, icon: TrendingUp, color: "text-orange-600 bg-orange-500/10" },
    {
      title: "عمولاتي",
      value: stats?.totalCommissions ? `${Number(stats.totalCommissions).toLocaleString()} د.أ` : "0 د.أ",
      icon: DollarSign,
      color: "text-primary bg-primary/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">مرحباً، {user?.name}</h1>
        <p className="text-muted-foreground mt-1">هنا نظرة عامة على نشاطك</p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  {isLoading ? <Skeleton className="h-8 w-20 mt-2" /> : (
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  )}
                </div>
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-primary" />
              آخر العملاء المحتملين
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-11 rounded-lg" />)}</div>
            ) : stats?.recentLeads?.length ? (
              <div className="space-y-2">
                {stats.recentLeads.map((lead) => {
                  const sc = leadStatusConfig[lead.status] || { label: lead.status, color: "" };
                  return (
                    <div key={lead.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                      <span className="text-sm font-medium truncate">{lead.name}</span>
                      <Badge className={`text-xs flex-shrink-0 ${sc.color}`}>{sc.label}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">لا يوجد عملاء محتملون معينون لك</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="w-5 h-5 text-green-600" />
              آخر العملاء
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-11 rounded-lg" />)}</div>
            ) : stats?.recentClients?.length ? (
              <div className="space-y-2">
                {stats.recentClients.map((client) => {
                  const sc = clientStatusConfig[client.status] || { label: client.status, color: "" };
                  return (
                    <div key={client.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                      <span className="text-sm font-medium truncate">{client.clientName}</span>
                      <Badge className={`text-xs flex-shrink-0 ${sc.color}`}>{sc.label}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">لا يوجد عملاء بعد</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
