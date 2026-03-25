import { getDashboardStats } from "@/app/actions/dashboard.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Banknote,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { BroadcastBarChart } from "@/components/dashboard/broadcast-bar-chart";
import { StatusPieChart } from "@/components/dashboard/status-pie-chart";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass = "text-muted-foreground",
  valueClass = "",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconClass?: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`rounded-full p-1.5 bg-muted ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const result = await getDashboardStats();
  const stats = result.data;

  const totalMessages = (stats?.totalSent ?? 0) + (stats?.totalFailed ?? 0) + (stats?.totalPending ?? 0);
  const sentRate = totalMessages > 0 ? ((stats?.totalSent ?? 0) / totalMessages) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview status & statistik WhatsApp Broadcast · Bank BTN
        </p>
      </div>

      {/* Error state */}
      {!result.success && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive text-sm">
            ⚠️ Gagal memuat data: {result.error}
          </CardContent>
        </Card>
      )}

      {/* === ROW 1: Summary Cards === */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          title="Kontak Tersedia"
          value={(stats?.totalDebitur ?? 0).toLocaleString("id-ID")}
          subtitle="Total debitur terdaftar"
          icon={Users}
          iconClass="text-sky-600"
        />
        <StatCard
          title="Pesan Terkirim"
          value={(stats?.totalSent ?? 0).toLocaleString("id-ID")}
          subtitle={`${sentRate.toFixed(1)}% dari total pesan`}
          icon={CheckCircle2}
          iconClass="text-emerald-600"
          valueClass="text-emerald-600"
        />
        <StatCard
          title="Pesan Gagal"
          value={(stats?.totalFailed ?? 0).toLocaleString("id-ID")}
          subtitle="Perlu diperiksa"
          icon={XCircle}
          iconClass="text-destructive"
          valueClass="text-destructive"
        />
        <StatCard
          title="Pending / Antrean"
          value={(stats?.totalPending ?? 0).toLocaleString("id-ID")}
          subtitle="Menunggu dikirim"
          icon={Clock}
          iconClass="text-amber-500"
          valueClass="text-amber-500"
        />
        <StatCard
          title="Total Broadcast"
          value={(totalMessages).toLocaleString("id-ID")}
          subtitle="Total percobaan kirim"
          icon={Send}
          iconClass="text-primary"
        />
        <StatCard
          title="Debitur Dikontak"
          value={(stats?.totalBroadcastSessions ?? 0).toLocaleString("id-ID")}
          subtitle="Pernah dikirim pesan"
          icon={MessageSquare}
          iconClass="text-violet-600"
        />
        <StatCard
          title="Total SO Pokok"
          value={stats?.totalSoPokokFormatted ?? "Rp 0"}
          subtitle="Saldo Outstanding"
          icon={Banknote}
          iconClass="text-rose-600"
          valueClass="text-base"
        />
        <StatCard
          title="Total TGK"
          value={stats?.totalTgkFormatted ?? "Rp 0"}
          subtitle="Total Tunggakan Kredit"
          icon={TrendingUp}
          iconClass="text-orange-500"
          valueClass="text-base"
        />
      </div>

      {/* === ROW 2: Charts === */}
      <div className="grid gap-4 md:grid-cols-7">
        {/* Bar Chart - 7 hari terakhir */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Aktivitas Broadcast 7 Hari Terakhir</CardTitle>
            <CardDescription>
              Perbandingan pesan terkirim, gagal, dan pending per hari
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BroadcastBarChart data={stats?.broadcastPerDay ?? []} />
          </CardContent>
        </Card>

        {/* Pie Chart - Status Distribution */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Distribusi Status Pesan</CardTitle>
            <CardDescription>
              Proporsi status dari semua pesan yang pernah dikirim
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatusPieChart
              data={stats?.statusDistribution ?? []}
              total={totalMessages}
            />
            {/* Legend Detail */}
            <div className="mt-4 space-y-2">
              {[
                { label: "Terkirim", value: stats?.totalSent ?? 0, color: "bg-chart-5" },
                { label: "Gagal", value: stats?.totalFailed ?? 0, color: "bg-chart-1" },
                { label: "Pending", value: stats?.totalPending ?? 0, color: "bg-chart-3" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm ${item.color}`} />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {item.value.toLocaleString("id-ID")}
                    {totalMessages > 0 && (
                      <span className="text-muted-foreground font-normal ml-1 text-xs">
                        ({((item.value / totalMessages) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === ROW 3: Nominal Info === */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="w-4 h-4 text-rose-500" />
              Total SO Pokok (Saldo Outstanding)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-rose-500">
              {stats?.totalSoPokokFormatted ?? "Rp 0"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Akumulasi saldo outstanding seluruh debitur terdaftar
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Total TGK (Tunggakan Kredit)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-500">
              {stats?.totalTgkFormatted ?? "Rp 0"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Akumulasi total tunggakan kredit seluruh debitur terdaftar
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
