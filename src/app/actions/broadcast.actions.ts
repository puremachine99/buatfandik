"use server";

import { db } from "@/db";
import { broadcastLogs, debiturs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getBroadcastLogs() {
  try {
    const data = await db
      .select({
        id: broadcastLogs.id,
        status: broadcastLogs.status,
        pesan: broadcastLogs.pesan,
        error_reason: broadcastLogs.error_reason,
        created_at: broadcastLogs.created_at,
        sent_at: broadcastLogs.sent_at,
        debitur_id: broadcastLogs.debitur_id,
        debitur_nama: debiturs.nama,
        debitur_wa: debiturs.no_whatsapp,
      })
      .from(broadcastLogs)
      .leftJoin(debiturs, eq(broadcastLogs.debitur_id, debiturs.id))
      .orderBy(desc(broadcastLogs.created_at));

    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching broadcast logs:", error);
    return { success: false, error: error.message || "Gagal mengambil riwayat broadcast" };
  }
}

export async function addBroadcastLogs(entries: { debitur_id: string; pesan: string; status?: "PENDING" | "SENT" | "FAILED" }[]) {
  if (!entries || entries.length === 0) return { success: true };

  try {
    const records = entries.map((e) => ({
      debitur_id: e.debitur_id,
      pesan: e.pesan,
      status: e.status || "PENDING",
      sent_at: e.status === "SENT" ? new Date() : null,
    }));

    await db.insert(broadcastLogs).values(records);
    revalidatePath("/broadcast");
    return { success: true };
  } catch (error: any) {
    console.error("Error adding broadcast logs:", error);
    return { success: false, error: error.message || "Gagal memproses pengiriman" };
  }
}

export async function updateLogStatus(id: string, status: "PENDING" | "SENT" | "FAILED", error_reason?: string) {
  try {
    await db.update(broadcastLogs)
      .set({
        status,
        error_reason: error_reason || null,
        sent_at: status === "SENT" ? new Date() : null,
      })
      .where(eq(broadcastLogs.id, id));
      
    revalidatePath("/broadcast");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
