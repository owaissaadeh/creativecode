import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, User } from "lucide-react";
import type { Commission, User as UserType } from "@shared/schema";

interface CommissionWithDetails extends Commission {
  salesName?: string;
  clientName?: string;
}

export default function AdminCommissions() {
  const { data: commissions = [], isLoading } = useQuery<CommissionWithDetails[]>({
    queryKey: ["/api/admin/commissions"],
  });

  const total = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
  const totalDeal = commissions.reduce((sum, c) => sum + Number(c.dealValue), 0);

  const bySales: Record<string, { name: string; amount: number; count: number }> = {};
  commissions.forEach((c) => {
    const key = c.salesId;
    if (!bySales[key]) bySales[key] = { name: c.salesName || "موظف", amount: 0, count: 0 };
    bySales[key].amount += Number(c.commissionAmount);
    bySales[key].count += 1;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">العمولات</h1>
        <p className="text-muted-foreground mt-1">تقرير شامل لعمولات فريق المبيعات</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي العمولات</p>
              {isLoading ? <Skeleton className="h-8 w-28 mt-2" /> : (
                <p className="text-2xl font-bold mt-1 text-primary">{total.toLocaleString()} ر.س</p>
              )}
            </div>
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي قيمة الصفقات</p>
              {isLoading ? <Skeleton className="h-8 w-28 mt-2" /> : (
                <p className="text-2xl font-bold mt-1">{totalDeal.toLocaleString()} ر.س</p>
              )}
            </div>
            <div className="w-11 h-11 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">عدد الصفقات المُغلقة</p>
              {isLoading ? <Skeleton className="h-8 w-16 mt-2" /> : (
                <p className="text-2xl font-bold mt-1">{commissions.length}</p>
              )}
            </div>
            <div className="w-11 h-11 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">العمولات حسب الموظف</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : Object.keys(bySales).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">لا توجد عمولات بعد</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(bySales)
                  .sort(([, a], [, b]) => b.amount - a.amount)
                  .map(([id, s]) => (
                    <div key={id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{s.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.count} صفقة</p>
                        </div>
                      </div>
                      <p className="font-bold text-primary">{s.amount.toLocaleString()} ر.س</p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">سجل العمولات</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : commissions.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">لا توجد عمولات بعد</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {commissions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.clientName || "عميل"}</p>
                      <p className="text-xs text-muted-foreground">{c.salesName} · {c.commissionRate}%</p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-sm font-bold text-green-600">+{Number(c.commissionAmount).toLocaleString()} ر.س</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("ar-SA")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
