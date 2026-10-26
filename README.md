# Reviews

A Lynx client and a Bun API for company reviews.

```bash
bun install
bun run check
bun run test
bun dev
```

`bun dev` starts Postgres, Mailpit, the API, and the Lynx dev server. The API health check is `http://127.0.0.1:3001/health`. The web preview is `http://127.0.0.1:3000/__web_preview?casename=main.web.bundle`.
