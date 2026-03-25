import { pgTable, uuid, varchar, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const statusEnum = pgEnum('status', ['PENDING', 'SENT', 'FAILED']);

export const debiturs = pgTable('debiturs', {
  id: uuid('id').defaultRandom().primaryKey(),
  no_debitur: varchar('no_debitur', { length: 255 }).unique().notNull(),
  nama: varchar('nama', { length: 255 }).notNull(),
  agunan: text('agunan'),
  so_pokok: numeric('so_pokok').notNull(),
  tgk: numeric('tgk').notNull(),
  no_whatsapp: varchar('no_whatsapp', { length: 25 }).notNull(),
  tags: text('tags').array().default([]).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const broadcastLogs = pgTable('broadcast_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  debitur_id: uuid('debitur_id').references(() => debiturs.id, { onDelete: 'cascade' }).notNull(),
  status: statusEnum('status').default('PENDING').notNull(),
  pesan: text('pesan').notNull(),
  error_reason: text('error_reason'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  sent_at: timestamp('sent_at'),
});
