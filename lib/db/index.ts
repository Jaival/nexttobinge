import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

// DATABASE_URL should be Supabase's pooler (port 6543, "Transaction mode"),
// not the direct db.<ref>.supabase.co host. The direct host is IPv6-only, and
// neither Vercel nor many home networks can reach IPv6, which fails as
// "getaddrinfo ENOTFOUND".
//
// In transaction mode each query may run on a different server connection,
// so prepared statements (which live on one connection) can't be reused.
// prepare: false turns them off; it's harmless on other connection types.
const client = postgres(env.DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });
