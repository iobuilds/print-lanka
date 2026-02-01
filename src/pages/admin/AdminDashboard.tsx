import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Package, Users, Tag, Palette, Clock, MessageSquare, AlertTriangle } from "lucide-react";

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  totalUsers: number;
  activeCoupons: number;
  totalColors: number;
}

interface SMSBalance {
  balance: number;
  lowBalance: boolean;
  loading: boolean;
  error: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
    activeCoupons: 0,
    totalColors: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [smsBalance, setSmsBalance] = useState<SMSBalance>({
    balance: 0,
    lowBalance: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [ordersRes, pendingRes, usersRes, couponsRes, colorsRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("coupons").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("available_colors").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      setStats({
        totalOrders: ordersRes.count || 0,
        pendingOrders: pendingRes.count || 0,
        totalUsers: usersRes.count || 0,
        activeCoupons: couponsRes.count || 0,
        totalColors: colorsRes.count || 0,
      });
      setIsLoading(false);
    };

    const fetchSMSBalance = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("sms-balance");
        
        if (error) {
          console.error("SMS balance error:", error);
          setSmsBalance({
            balance: 0,
            lowBalance: false,
            loading: false,
            error: "Failed to fetch SMS balance",
          });
          return;
        }

        if (data?.success) {
          setSmsBalance({
            balance: data.balance || 0,
            lowBalance: data.lowBalance || false,
            loading: false,
            error: null,
          });
        } else {
          setSmsBalance({
            balance: 0,
            lowBalance: false,
            loading: false,
            error: data?.error || "Unknown error",
          });
        }
      } catch (err) {
        console.error("SMS balance fetch error:", err);
        setSmsBalance({
          balance: 0,
          lowBalance: false,
          loading: false,
          error: "Network error",
        });
      }
    };

    fetchStats();
    fetchSMSBalance();
  }, []);

  const statCards = [
    { title: "Total Orders", value: stats.totalOrders, icon: Package, color: "text-blue-500" },
    { title: "Pending Review", value: stats.pendingOrders, icon: Clock, color: "text-amber-500" },
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-green-500" },
    { title: "Active Coupons", value: stats.activeCoupons, icon: Tag, color: "text-purple-500" },
    { title: "Available Colors", value: stats.totalColors, icon: Palette, color: "text-pink-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your 3D printing business</p>
      </div>

      {/* SMS Balance Warning */}
      {smsBalance.lowBalance && !smsBalance.loading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Low SMS Balance!</AlertTitle>
          <AlertDescription>
            Your SMS balance is below 100 units ({smsBalance.balance} remaining). 
            Please recharge to ensure notifications are not interrupted.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* SMS Balance Card */}
        <Card className={smsBalance.lowBalance ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              SMS Balance
            </CardTitle>
            <MessageSquare className={`w-5 h-5 ${smsBalance.lowBalance ? "text-destructive" : "text-cyan-500"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${smsBalance.lowBalance ? "text-destructive" : ""}`}>
              {smsBalance.loading ? "..." : smsBalance.error ? "Error" : smsBalance.balance}
            </div>
            {smsBalance.lowBalance && (
              <p className="text-xs text-destructive mt-1">Low balance!</p>
            )}
            {smsBalance.error && (
              <p className="text-xs text-muted-foreground mt-1">{smsBalance.error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
