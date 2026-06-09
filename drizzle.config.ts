import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set...');
}

export default defineConfig({
    dialect: 'postgresql',
    schema: './db/schema.ts',
    out: './drizzle',
    dbCredentials: {
        url: databaseUrl,
    },
    entities: {
        roles: {
            provider: 'neon',
        },
    },
});
