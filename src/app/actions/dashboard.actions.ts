"use server";

import { db } from "@/db";
import { broadcastLogs, debiturs } from "@/db/schema";
import { sql, count, sum } from "drizzle-orm";

export interface DashboardStats {
  totalDebitur: number;
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  totalBroadcastSessions: number;
  totalSoPokokFormatted: string;
  totalTgkFormatted: string;
  broadcastPerDay: { date: string; terkirim: number; gagal: number; pending: number }[];
  statusDistribution: { name: string; value: number; color: string }[];
}

function formatRupiah(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2)} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(2)} Jt`;
  }
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export async function getDashboardStats(): Promise<{ success: boolean; data?: DashboardStats; error?: string }> {
  try {
    // 1. Total debitur
    const [debiturCount] = await db.select({ count: count() }).from(debiturs);

    // 2. Broadcast log status counts
    const statusCounts = await db
      .select({
        status: broadcastLogs.status,
        count: count(),
      })
      .from(broadcastLogs)
      .groupBy(broadcastLogs.status);

    const sentCount = statusCounts.find((s) => s.status === "SENT")?.count ?? 0;
    const failedCount = statusCounts.find((s) => s.status === "FAILED")?.count ?? 0;
    const pendingCount = statusCounts.find((s) => s.status === "PENDING")?.count ?? 0;

    // 3. Total nominal (so_pokok dan tgk dari debiturs)
    const [totals] = await db
      .select({
        totalSo: sum(debiturs.so_pokok),
        totalTgk: sum(debiturs.tgk),
      })
      .from(debiturs);

    const soValue = parseFloat(totals?.totalSo ?? "0");
    const tgkValue = parseFloat(totals?.totalTgk ?? "0");

    // 4. Broadcast per hari (7 hari terakhir)
    const broadcastPerDay = await db
      .select({
        date: sql<string>`DATE(${broadcastLogs.created_at})`.as("date"),
        status: broadcastLogs.status,
        count: count(),
      })
      .from(broadcastLogs)
      .where(sql`${broadcastLogs.created_at} >= NOW() - INTERVAL '7 days'`)
      .groupBy(sql`DATE(${broadcastLogs.created_at})`, broadcastLogs.status)
      .orderBy(sql`DATE(${broadcastLogs.created_at}) ASC`);

    // Normalize per day
    const dayMap: Record<string, { date: string; terkirim: number; gagal: number; pending: number }> = {};
    for (const row of broadcastPerDay) {
      if (!dayMap[row.date]) {
        dayMap[row.date] = { date: row.date, terkirim: 0, gagal: 0, pending: 0 };
      }
      if (row.status === "SENT") dayMap[row.date].terkirim += row.count;
      if (row.status === "FAILED") dayMap[row.date].gagal += row.count;
      if (row.status === "PENDING") dayMap[row.date].pending += row.count;
    }
    const perDayResult = Object.values(dayMap).map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
    }));

    // 5. Status distribution for pie chart
    const totalLogs = sentCount + failedCount + pendingCount;
    const statusDistribution = [
      { name: "Terkirim", value: sentCount, color: "var(--color-chart-5)" },
      { name: "Gagal", value: failedCount, color: "var(--color-chart-1)" },
      { name: "Pending", value: pendingCount, color: "var(--color-chart-3)" },
    ].filter((s) => s.value > 0);

    // 6. Count unique debitur yang pernah dikirimi pesan
    const [uniqueTargets] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${broadcastLogs.debitur_id})` })
      .from(broadcastLogs);

    return {
      success: true,
      data: {
        totalDebitur: debiturCount.count,
        totalSent: sentCount,
        totalFailed: failedCount,
        totalPending: pendingCount,
        totalBroadcastSessions: totalLogs,
        totalSoPokokFormatted: formatRupiah(soValue),
        totalTgkFormatted: formatRupiah(tgkValue),
        broadcastPerDay: perDayResult,
        statusDistribution,
      },
    };
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return { success: false, error: error.message || "Gagal mengambil statistik" };
  }
}
