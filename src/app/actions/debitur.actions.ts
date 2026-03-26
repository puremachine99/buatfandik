"use server";

import { db } from "@/db";
import { debiturs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getDebiturs() {
  try {
    const data = await db.select().from(debiturs).orderBy(desc(debiturs.created_at));
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching debiturs:", error);
    return { success: false, error: "Gagal mengambil data debitur" };
  }
}

export async function addDebitur(data: any) {
  try {
    const [newItem] = await db.insert(debiturs).values({
      no_debitur: data.no_debitur,
      nama: data.nama,
      agunan: data.agunan || "",
      so_pokok: data.so_pokok.toString(),
      tgk: data.tgk.toString(),
      no_whatsapp: data.no_whatsapp,
      tags: data.tags || [],
    }).returning();
    
    revalidatePath("/debitur");
    revalidatePath("/broadcast");
    return { success: true, data: newItem };
  } catch (error: any) {
    console.error("Error adding debitur:", error);
    return { success: false, error: error.message || "Gagal menambahkan debitur" };
  }
}

export async function updateDebitur(id: string, data: any) {
  try {
    const [updated] = await db.update(debiturs).set({
      no_debitur: data.no_debitur,
      nama: data.nama,
      agunan: data.agunan,
      so_pokok: data.so_pokok.toString(),
      tgk: data.tgk.toString(),
      no_whatsapp: data.no_whatsapp,
      tags: data.tags,
    }).where(eq(debiturs.id, id)).returning();
    
    revalidatePath("/debitur");
    revalidatePath("/broadcast");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating debitur:", error);
    return { success: false, error: error.message || "Gagal update debitur" };
  }
}

export async function deleteDebitur(id: string) {
  try {
    await db.delete(debiturs).where(eq(debiturs.id, id));
    revalidatePath("/debitur");
    revalidatePath("/broadcast");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting debitur:", error);
    return { success: false, error: error.message || "Gagal menghapus debitur" };
  }
}

export async function bulkAddTagsToDebiturs(ids: string[], tag: string) {
  try {
    const { inArray } = await import("drizzle-orm");
    // Fetch current tags for the given ids
    const rows = await db
      .select({ id: debiturs.id, tags: debiturs.tags })
      .from(debiturs)
      .where(inArray(debiturs.id, ids));

    // Update each one individually, merging the new tag
    for (const row of rows) {
      const currentTags: string[] = row.tags || [];
      if (!currentTags.includes(tag)) {
        const newTags = [...currentTags, tag];
        await db
          .update(debiturs)
          .set({ tags: newTags })
          .where(eq(debiturs.id, row.id));
      }
    }

    revalidatePath("/debitur");
    revalidatePath("/broadcast");
    return { success: true };
  } catch (error: any) {
    console.error("Error bulk adding tags to debiturs:", error);
    return { success: false, error: error.message || "Gagal menambahkan tag secara massal" };
  }
}

export async function bulkDeleteDebiturs(ids: string[]) {
  try {
    const { inArray } = await import("drizzle-orm");
    await db.delete(debiturs).where(inArray(debiturs.id, ids));
    revalidatePath("/debitur");
    revalidatePath("/broadcast");
    return { success: true };
  } catch (error: any) {
    console.error("Error bulk deleting debiturs:", error);
    return { success: false, error: error.message || "Gagal menghapus data secara massal" };
  }
}

export async function bulkAddDebiturs(dataArray: any[]) {
  try {
    const values = dataArray.map(data => ({
      no_debitur: data.no_debitur,
      nama: data.nama,
      agunan: data.agunan || "",
      so_pokok: data.so_pokok.toString(),
      tgk: data.tgk.toString(),
      no_whatsapp: data.no_whatsapp,
      tags: data.tags || [],
    }));
    
    await db.insert(debiturs).values(values).onConflictDoNothing({ target: debiturs.no_debitur });
    
    revalidatePath("/debitur");
    revalidatePath("/broadcast");
    return { success: true, message: `Berhasil mengimpor data debitur!` };
  } catch (error: any) {
    console.error("Error bulk insert debiturs:", error);
    return { success: false, error: error.message || "Gagal bulk insert debitur" };
  }
}
