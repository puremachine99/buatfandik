import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Set up postgres client instance. Disable prefetch as it might cause issues in some environments.
export const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
