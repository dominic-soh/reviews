# Reviews

A Lynx client and a Bun API for company reviews.

```bash
bun install
bun run check
bun run test
bun dev
```

`bun dev` starts Postgres, Mailpit, the API, and the Lynx dev server. The API health check is `http://127.0.0.1:3001/health`. The web preview is `http://127.0.0.1:3000/__web_preview?casename=main.web.bundle`. If port 3000 is taken, the dev server prints the preview URL it actually bound.

## Demo sign-in

Sign-in is a magic link. Nothing in this flow has a password. `bun dev` seeds one company, **Demo**, owned by **Ada Demo**.

1. Start the stack with `bun dev`.
2. Open the web preview. The first screen is "Welcome to Reviews".
3. Enter `ada@demo.test` and press **Send sign-in link**. The screen changes to "Check your email".
4. Open Mailpit at `http://127.0.0.1:8025`. The message subject is "Sign in to Reviews", and the body is the sign-in URL.
5. Open that URL on this machine. It verifies the link against the API and sets the session cookie.
6. Return to the web preview and reload it.

Ada lands on the Demo company as the owner. The directory offers an invite. The org chart is empty apart from Ada.

Any other address can request a link the same way. After it is opened, that person has no company yet, so the preview shows "Create your company" instead of the directory.
