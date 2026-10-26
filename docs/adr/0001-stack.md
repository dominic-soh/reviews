# ADR 0001: Stack

Each section is the decision, why, what it costs, and what would reverse it.

## ReactLynx

The client is ReactLynx, built with Rsbuild and `pluginLynx`, `engineVersion` 3.9, React Compiler on, lynx-ui behind our own `ui/` wrappers, Tailwind v3, TanStack Query, Zustand, and react-router v6 `MemoryRouter`.

ReactLynx is the official framework. It has lynx-ui and a first-party test renderer. Vue Lynx is still pre-alpha, has one maintainer, and has no lynx-ui. The API surface is React 17. React 18 needs `@lynx-js/react/compat`.

The published encoder rejects a bundle above Lynx 3.9, so `engineVersion` is 3.9 until a compiler that can emit 4.1 exists. The host SDK must stay at or above the bundle. Device first-frame time for the compiler is not measured yet. A warm build grew from 238133 bytes to 291526 bytes and about 40 ms. That is not a first-frame number. Turn the compiler off on the entry screen with `'use no memo'` only after a device trace shows a visible cost.

Reverse this if Vue Lynx ships lynx-ui, a test renderer, and a second maintainer, or if we leave Lynx.

## Bun

Bun is the runtime, package manager, workspace runner, and script runner. `bun dev` is one script. TypeScript runs without a compile step. Hono, Better Auth, Drizzle, and the MCP SDK also run on Node, so the exit is Node. Vercel can run the same app as a Bun function.

The cost is that some Node APIs and native addons lag.

Reverse this if a dependency we need does not run on Bun and will not run on Node either.

## Hono

Hono speaks Web `Request` and `Response`. Better Auth mounts with `auth.handler(c.req.raw)`. The MCP transport mounts on the same app. Zod contracts validate the edges. It runs on Bun, Node, and Workers.

The cost is fewer built-in conventions than Nuxt or Nest. The context folders replace those conventions. Nuxt was ruled out because it is a second Vue app the Lynx client never renders. Go was ruled out because it splits the language and drops Better Auth and the MCP TypeScript SDK.

Reverse this if we leave the Web request model, or if a framework we adopt already owns the HTTP server.

## Postgres

Postgres holds the tenant rules. Foreign keys and unique constraints keep one answer per review and target, and keep a membership inside one company. Transactions guard state changes. Row security is the backstop when a query forgets `company_id`. Full-text search can cover review text. `jsonb` can store registry field values.

SQLite and Turso were ruled out for the single-writer limit and the lack of row security. Mongo was ruled out because the domain is relational.

The hosted MVP uses Supabase as Postgres only. Drizzle uses the pooler. Migrations use the direct connection. We do not call Supabase Auth, Storage, Realtime, or Edge Functions. Those calls would have to be rewritten on the way out.

Local development uses Docker Postgres so a paused cloud project never blocks `bun dev`.

Reverse this if the data stops being relational, or if we accept a single writer.

## Drizzle

Drizzle keeps the schema in TypeScript, the queries close to SQL, and the migrations in the repo. Better Auth's Drizzle adapter uses the same database.

Reverse this if we generate the schema from a tool Drizzle cannot host, or if we need a query style Drizzle cannot express.

## Better Auth

Better Auth owns sessions, magic links, organizations, and many accounts per user, in our database. The published organization plugin is pinned. The rewrite in better-auth PR 7251 was closed in March 2026.

A company email login mints a `CompanyActor` for one membership. Tenant commands accept only that actor. A personal email is a second login on the same user and mints a `PersonalActor`. That actor is phase 1.

Reverse this if we move sessions to a host we do not control, which we are explicitly not doing with Supabase Auth.

## Vercel and Supabase for the MVP

The hosted MVP is one Vercel project for the Hono API and the static Lynx host, plus one Supabase project used as Postgres. MCP stays stateless. Each tool call is one request. A tool that streams for minutes does not belong on this host.

Supabase Free is two projects, 500 MB of database each, 5 GB of egress, and 50,000 monthly active users. There are no automatic backups. A project pauses after about a week of low activity and can be resumed for a year. A few real queries a day keep it awake.

Vercel Hobby is personal and non-commercial. Included use is 100 GB of transfer, 1,000,000 function invocations, and 4 CPU-hours. A paid employee building this, or a company using it, needs Pro.

Leave when any of these is true. A company other than the builders stores reviews. The database nears 500 MB. The project pauses during a cycle. We need backups. The move is a new `DATABASE_URL` and a long-running Bun process on Render. Render's paid shape is about $7 for the web service plus $6 or $19 for Postgres. Bind that process to `0.0.0.0:$PORT`. The filesystem there is ephemeral. Uploaded ladder files are parsed in the request.

AWS Free plan credits are a six-month trial that closes the account. They are not the destination.

Reverse the host earlier only if Hobby's non-commercial rule already applies before the first outside company.

## What this ADR does not decide

Native App Store and Play Store builds need host apps that embed the Lynx SDK. Staging and production differ by bundle URL and API URL. Those hosts are phase 6. Lynx Explorer is for development.
