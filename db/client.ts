import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema.js';

function createDb(databaseUrl: string) {
    const sql = neon(databaseUrl);

    return drizzle({ client: sql, schema });
}

let cachedDb: ReturnType<typeof createDb> | null = null;

export function getDb() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        return null;
    }

    if (!cachedDb) {
        cachedDb = createDb(databaseUrl);
    }

    return cachedDb;
}
