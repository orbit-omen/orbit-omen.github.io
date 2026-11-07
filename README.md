# OrbitOmen Studio — GitHub Pages foundation

This release provides a working static portfolio and a browser-based content Studio.

## URLs
- Public site: `https://orbit-omen.github.io/`
- Studio: `https://orbit-omen.github.io/studio/`

## Deploy
1. Put the contents of this folder at the root of the `orbit-omen/orbit-omen.github.io` repository.
2. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
3. Push to `main` or run **Deploy OrbitOmen Website** from Actions.

## Use Studio
Open `/studio/`. Edit content and projects. Click **Save changes**. The Studio stores data in this browser's LocalStorage. Export JSON for backup. To publish content to visitors, update the site's deployed content/config and push the changes to GitHub.

## Important limitations
This is a functional static foundation, not the complete SaaS platform in the larger master specification. There is no server-side authentication, shared multi-user persistence, Discord integration, Cloudflare Worker, GitHub API commit flow, true drag/drop canvas, or keyframe animation timeline in this release. Never store credentials or secrets in this static app. Add a separately secured backend before treating Studio as private.

## Checks
Run `npm run check` with Node.js installed.

## Visual canvas editor (v0.3)
Open Studio → Visual canvas. Add headings, text and buttons; select and drag elements; edit text, font size, weight, colors, position and width; duplicate/delete; save the scene in browser LocalStorage or export JSON. This initial canvas is a separate editor workspace and does not yet write the live portfolio DOM or provide responsive layout constraints.
