import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Award, Target, DollarSign } from "lucide-react";

interface ReportsData {
  totalSales: number;
  totalCommissions: number;
  closingRate: number;
  bestSales: { name: string; total: string } | null;
  salesByMonth: Array<{ month: string; total: number }>;
  clientsByStatus: Array<{ status: string; count: number }>;
  leadsBySource: Array<{ source: string; count: number }>;
}

const COLORS = ["hsl(217 91% 60%)", "hsl(173 80% 40%)", "hsl(43 96% 56%)", "hsl(27 87% 55%)", "hsl(280 65% 48%)"];

const statusAr: Record<string, string> = {
  "New Lead": "جديد",
  Contacted: "تواصل",
  "Meeting Scheduled": "اجتماع",
  "Proposal Sent": "عرض",
  Negotiation: "تفاوض",
  Won: "مُغلق",
  Lost: "خُسر",
};

export default function AdminReports() {
  const { data, isLoading } = useQuery<ReportsData>({ queryKey: ["/api/admin/reports"] });

  const summaryCards = [
    {
      title: "إجمالي المبيعات",
      value: data ? `${Number(data.totalSales).toLocaleString()} ر.س` : "0",
      icon: DollarSign,
      color: "text-primary bg-primary/10",
    },
    {
      title: "إجمالي العمولات",
      value: data ? `${Number(data.totalCommissions).toLocaleString()} ر.س` : "0",
      icon: TrendingUp,
      color: "text-green-600 bg-green-500/10",
    },
    {
      title: "نسبة الإغلاق",
      value: data ? `${data.closingRate}%` : "0%",
      icon: Target,
      color: "text-orange-600 bg-orange-500/10",
    },
    {
      title: "أفضل موظف",
      value: data?.bestSales?.name || "-",
      icon: Award,
      color: "text-yellow-600 bg-yellow-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">التقارير</h1>
        <p className="text-muted-foreground mt-1">تحليل شامل لأداء الشركة</p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  {isLoading ? <Skeleton className="h-7 w-24 mt-2" /> : (
                    <p className="text-xl font-bold mt-1">{card.value}</p>
                  )}
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${card.color}`}>
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
            <CardTitle className="text-base">المبيعات الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-56 w-full" /> : data?.salesByMonth?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.salesByMonth} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()} ر.س`, "المبيعات"]} />
                  <Bar dataKey="total" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-56 text-muted-foreground text-sm">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">العملاء حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-56 w-full" /> : data?.clientsByStatus?.length ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={220}>
                  <PieChart>
                    <Pie data={data.clientsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                      {data.clientsByStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [v, statusAr[name] || name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {data.clientsByStatus.map((item, i) => (
                    <div key={item.status} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground text-xs">{statusAr[item.status] || item.status}</span>
                      </div>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-56 text-muted-foreground text-sm">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">العملاء المحتملون حسب المصدر</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-40 w-full" /> : data?.leadsBySource?.length ? (
            <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {data.leadsBySource.map((item, i) => (
                <div key={item.source} className="rounded-xl bg-muted/50 p-4 text-center space-y-1">
                  <div className="text-2xl font-bold" style={{ color: COLORS[i % COLORS.length] }}>{item.count}</div>
                  <div className="text-xs text-muted-foreground capitalize">{item.source}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-6">لا توجد بيانات كافية</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
