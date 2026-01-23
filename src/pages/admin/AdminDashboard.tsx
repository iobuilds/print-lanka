import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Package, Users, Tag, Palette, TrendingUp, Clock } from "lucide-react";

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  totalUsers: number;
  activeCoupons: number;
  totalColors: number;
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

    fetchStats();
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
      </div>
    </div>
  );
}
