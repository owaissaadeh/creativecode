import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import type { Commission } from "@shared/schema";

interface CommissionWithClient extends Commission {
  clientName?: string;
}

export default function SalesCommissions() {
  const { user } = useAuthStore();
  const { data: commissions = [], isLoading } = useQuery<CommissionWithClient[]>({
    queryKey: ["/api/sales/commissions"],
  });

  const total = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
  const totalDeal = commissions.reduce((sum, c) => sum + Number(c.dealValue), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">عمولاتي</h1>
        <p className="text-muted-foreground mt-1">سجل عمولاتك من الصفقات المُغلقة</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي عمولاتي</p>
              {isLoading ? <Skeleton className="h-8 w-28 mt-2" /> : (
                <p className="text-2xl font-bold mt-1 text-primary">{total.toLocaleString()} د.أ</p>
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
              <p className="text-sm text-muted-foreground">إجمالي قيمة صفقاتي</p>
              {isLoading ? <Skeleton className="h-8 w-28 mt-2" /> : (
                <p className="text-2xl font-bold mt-1">{totalDeal.toLocaleString()} د.أ</p>
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
              <p className="text-sm text-muted-foreground">نسبة عمولتي</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">{user?.commissionRate}%</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">سجل العمولات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : commissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <DollarSign className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">لا توجد عمولات بعد</p>
              <p className="text-sm text-muted-foreground mt-1">ستظهر عمولاتك عند إغلاق صفقة (Won)</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commissions.map((c) => (
                <div key={c.id} data-testid={`card-commission-${c.id}`} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.clientName || "عميل"}</p>
                      <p className="text-xs text-muted-foreground">
                        قيمة الصفقة: {Number(c.dealValue).toLocaleString()} د.أ · نسبة {c.commissionRate}%
                      </p>
                    </div>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="font-bold text-green-600">+{Number(c.commissionAmount).toLocaleString()} د.أ</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("ar-SA")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
