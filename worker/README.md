# OrbitOmen Client Desk Worker

A small Cloudflare Worker backend for the public Client Desk form. It deliberately uses **no D1 and no R2**.

## Storage design
- Request records are written as individual JSON files to a **separate private GitHub repository** (default: `orbit-omen/orbit-client-requests`).
- Discord receives an embed notification in a private channel. The Worker can mention one configured Discord user.
- The public portfolio repository remains public and never receives client request data.
- GitHub is the durable record store; the Worker has no local database.

Create the private repository before deployment. It can be empty; the Worker creates `requests/YYYY/MM/<timestamp>-<uuid>.json` paths on first submission. Do not make this repository public.

## Requirements
- Cloudflare account with Workers access; Node.js and Wrangler CLI.
- A private GitHub repository and a fine-grained GitHub token scoped only to that repository with **Contents: Read and write**.
- A Discord bot installed in the target server with **View Channel**, **Send Messages** and **Attach Files** in the private notification channel.

## Configure
1. Edit `wrangler.toml`: set the exact portfolio origin, private repository name and branch.
2. Install Wrangler: `npm install --global wrangler`.
3. Authenticate: `wrangler login`.
4. Add secrets interactively (never commit their values):
   - `wrangler secret put GITHUB_TOKEN`
   - `wrangler secret put DISCORD_BOT_TOKEN`
   - `wrangler secret put DISCORD_CHANNEL_ID`\n   - `wrangler secret put DISCORD_GUILD_ID` (optional; enables a direct link from the inbox to the Discord message)
   - `wrangler secret put DISCORD_MENTION_USER_ID` (optional)
   - `wrangler secret put ADMIN_PASSWORD` (strong, unique password for Studio inbox login)
   - `wrangler secret put SESSION_SECRET` (at least 32 random bytes, used to sign expiring admin sessions)
5. Deploy: `wrangler deploy`.
6. Copy the deployed `workers.dev` URL into Studio → Client Desk → Worker endpoint.

The GitHub token is used only by the Worker. Never paste it into the portfolio config or browser Studio.

## API
Public routes:
- `GET /api/health` — basic health check.
- `POST /api/requests` — accepts JSON or multipart form data from the public Client Desk form. Multipart requests use a `payload` JSON field and repeated `files` fields. `fields.name` and `fields.description` are required; `website` is a honeypot and must be empty. Up to five allowed files, 8 MB total, are uploaded by the Worker directly to Discord. The private GitHub record stores attachment metadata and the Discord message link; no file is written to the public repository or an object store.

The Worker caps body and field sizes, strips control characters, validates required fields, and applies a best-effort per-IP in-memory rate limit. It saves the record to private GitHub **before** attempting Discord notification. If Discord is unavailable, the request remains stored and the API reports `discordNotified: false`.

Admin routes require `Authorization: Bearer <session-token>`. Sign in first with `POST /api/admin/login` and JSON `{ "password": "..." }`; the Worker returns an HMAC-signed session token that expires after 8 hours.
- `GET /api/requests?limit=30` — returns up to 50 newest records.
- `PATCH /api/requests/<uuid>` — updates status (`new`, `reviewing`, `waiting`, `accepted`, `completed`, `archived`) and/or `adminNotes`.

The Studio Request inbox calls the login endpoint and keeps the short-lived signed token in memory only. It is not written to localStorage, portfolio JSON, or GitHub. Sign out or close/reload the tab to discard it.

## Security notes
- The in-memory rate limiter is isolate-local, not a global quota. Add Cloudflare Turnstile and/or a Cloudflare rate-limiting rule before broad public launch.
- Keep the request repository private and restrict collaborators. Define a retention policy for visitor data.
- Keep the Discord channel private; embeds include visitor-supplied project information.
- Uploads are restricted to image, PDF, text, CSV, ZIP and Office document MIME types, with a five-file and 8 MB total limit. The browser never receives the Discord bot token. Discord channel permissions and retention settings still need to be reviewed before public launch.
- Deployment and secret entry require the account owner; this code does not provision Cloudflare resources automatically.