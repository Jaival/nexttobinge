import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

// Supabase's transaction-mode pooler (port 6543) hands each query to whichever
// connection is free, so a statement prepared on one connection doesn't exist
// on the next. prepare: false sends every query unprepared.
const client = postgres(env.DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });
