import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Target, UserCheck, DollarSign, TrendingUp, Award } from "lucide-react";

interface Stats {
  totalLeads: number;
  totalClients: number;
  totalSales: number;
  totalCommissions: number;
  totalSalesUsers: number;
  bestSales: { name: string; total: string } | null;
  closingRate: number;
  recentLeads: Array<{ id: string; name: string; status: string; createdAt: string }>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({ queryKey: ["/api/admin/stats"] });

  const cards = [
    { title: "إجمالي العملاء المحتملين", value: stats?.totalLeads || 0, icon: Target, color: "text-blue-600 bg-blue-500/10" },
    { title: "إجمالي العملاء", value: stats?.totalClients || 0, icon: UserCheck, color: "text-green-600 bg-green-500/10" },
    { title: "موظفو المبيعات", value: stats?.totalSalesUsers || 0, icon: Users, color: "text-purple-600 bg-purple-500/10" },
    {
      title: "إجمالي المبيعات",
      value: stats?.totalSales ? `${Number(stats.totalSales).toLocaleString()} د.أ` : "0 د.أ",
      icon: DollarSign,
      color: "text-orange-600 bg-orange-500/10"
    },
    {
      title: "إجمالي العمولات",
      value: stats?.totalCommissions ? `${Number(stats.totalCommissions).toLocaleString()} د.أ` : "0 د.أ",
      icon: TrendingUp,
      color: "text-primary bg-primary/10"
    },
    {
      title: "نسبة الإغلاق",
      value: `${stats?.closingRate || 0}%`,
      icon: Award,
      color: "text-yellow-600 bg-yellow-500/10"
    },
  ];

  const statusColors: Record<string, string> = {
    New: "bg-blue-500/10 text-blue-600",
    Contacted: "bg-yellow-500/10 text-yellow-600",
    Converted: "bg-green-500/10 text-green-600",
    Lost: "bg-red-500/10 text-red-600",
  };
  const statusLabels: Record<string, string> = {
    New: "جديد",
    Contacted: "تم التواصل",
    Converted: "محوّل",
    Lost: "مفقود",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">لوحة تحكم المدير</h1>
        <p className="text-muted-foreground mt-1">نظرة عامة على أداء الشركة</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title} data-testid={`card-stat-${card.title}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-2" />
                  ) : (
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
        {/* Best Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="w-5 h-5 text-yellow-500" />
              أفضل موظف مبيعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : stats?.bestSales ? (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-yellow-600">
                    {stats.bestSales.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{stats.bestSales.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {Number(stats.bestSales.total).toLocaleString()} د.أ إجمالي المبيعات
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">لا يوجد بيانات كافية</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-primary" />
              آخر العملاء المحتملين
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : stats?.recentLeads?.length ? (
              <div className="space-y-2">
                {stats.recentLeads.slice(0, 5).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                    <span className="text-sm font-medium truncate">{lead.name}</span>
                    <Badge className={`text-xs flex-shrink-0 ${statusColors[lead.status] || ""}`}>
                      {statusLabels[lead.status] || lead.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">لا يوجد عملاء محتملون بعد</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
