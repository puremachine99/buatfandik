"use server";

import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getMessageTemplates() {
  try {
    const data = await db
      .select()
      .from(messageTemplates)
      .orderBy(desc(messageTemplates.updated_at));
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching message templates:", error);
    return { success: false, error: "Gagal mengambil template pesan" };
  }
}

export async function upsertMessageTemplate(purpose: string, template: string) {
  try {
    const [result] = await db
      .insert(messageTemplates)
      .values({ purpose, template })
      .onConflictDoUpdate({
        target: messageTemplates.purpose,
        set: {
          template,
          updated_at: new Date(),
        },
      })
      .returning();

    revalidatePath("/broadcast");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error upserting message template:", error);
    return { success: false, error: error.message || "Gagal menyimpan template" };
  }
}

export async function deleteMessageTemplate(id: string) {
  try {
    await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
    revalidatePath("/broadcast");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting message template:", error);
    return { success: false, error: error.message || "Gagal menghapus template" };
  }
}
