import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder';

if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is not set. drizzle-kit generate can still run, but migrate and push require a real Neon connection string.');
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
