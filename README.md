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
5. Open that link in Lynx Explorer, or in the browser if it is the web preview. It is the page you started from, and opening it finishes sign-in there.

Ada lands on the Demo company as the owner. The directory offers an invite. The org chart is empty apart from Ada.

Any other address can request a link the same way. After it is opened, that person has no company yet, so the preview shows "Create your company" instead of the directory.

## Roadmap

Status as of November 2026.

**Done**

- **Foundation.** One command starts the local stack. A CI script runs checks, typecheck, and tests. An MCP endpoint answers `whoami` for a bearer token.
- **Companies and people.** Companies, invites, roles, reporting lines, and row-level security on tenant data. A personal email can sign in as the same user.
- **Auth hardening.** Production refuses to start with weak or missing settings. Sign-out clears the session. Personal sign-in uses a one-time code. Creating a company and accepting an invite are safe under concurrent requests.
- **Ladders, part one.** Draft a ladder and publish a version. Published versions cannot be edited.

**In progress**

- **Ladders, part two.** Import a ladder from a spreadsheet, edit it as a matrix, read version history, and write criteria in markdown with a preview.

**Planned**

- **Evaluation.** Review cycles, self, peer, and manager reviews, and rules for who can read each answer. Managers see their reports and the peer reviews still missing.
- **Outcomes.** Save a compensation decision that stays hidden until the reveal.
- **Agent access.** Issue and revoke tokens for employees and managers, with an audit log for every agent write.
- **Hosting.** A hosted MVP, then native iOS and Android hosts.
- **Portfolio.** Keep a snapshot of a revealed review, and share it with a grant that can be revoked.

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). `bun install` turns on a hook that rejects any other message.

```
feat: add a sign-out button
fix(auth): refuse a personal session on company routes
```

The type is `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, or `revert`. A scope in parentheses is optional.
