use angular style commits
let me know if I'm asking for something that doesn't make total sense or is suboptimal

discipline:
- prefer minimal, root-cause fixes over broad refactors
- for serverless and webhook code, do not rely on in-memory process state across requests
- keep durable state outside the runtime; assume cold starts, retries, and concurrent invocations
- make handlers idempotent when practical, especially around external side effects
- initialize SDK clients and bots explicitly; do not assume warm-instance state is already available
- keep request paths fast and push slow or retryable work to queues/background jobs when possible
- after changes, run the narrowest meaningful validation before doing more edits
- for Telegram on Vercel, prefer webhooks over polling and keep the webhook handler stateless
- when using grammY in serverless handlers, reuse a single init promise per instance or provide botInfo explicitly
- register bot middleware once per runtime instance; avoid request-scoped middleware duplication
- for TypeScript changes, default to `npm run typecheck` as the first validation pass
- use `npm run vercel:dev` for local Vercel work; do not add or rely on a recursive `dev` script
- treat Drizzle schema generation and live database operations differently: `db:generate` can run without `DATABASE_URL`, but `db:migrate` and `db:push` require it
- ring the alarm if theres any `global['!']` in our code
