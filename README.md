# OrbitOmen Portfolio & Studio

A static GitHub Pages portfolio with a browser-based Studio.

## Live routes
- Public portfolio: https://orbit-omen.github.io/
- Studio: https://orbit-omen.github.io/studio/
- Visual canvas prototype: https://orbit-omen.github.io/studio/canvas.html

## Repository architecture
- `data/portfolio.json` is the portfolio configuration source of truth.
- `assets/site.js` loads that configuration to render the public homepage.
- `studio/` contains the browser-based editing workspace.
- `assets/` contains shared visual styles and site assets.

## Studio: GitHub sync foundation
1. Open Studio → GitHub sync.
2. Create a fine-grained GitHub token restricted to `orbit-omen/orbit-omen.github.io`.
3. Grant **Contents: Read and write**.
4. Paste the token and connect.
5. Import `data/portfolio.json`, edit the configuration, validate, and publish.

The token is held in JavaScript memory for the current page session only. It is not written to localStorage, website files, or commits. Disconnecting or reloading the page clears it. A browser-only Studio cannot protect a token from malicious JavaScript running on the same page, so use a narrowly scoped token and revoke it when no longer needed. A future backend/OAuth integration is preferable for persistent sessions.

Publishing currently updates only `data/portfolio.json` on the selected, imported branch. The Studio checks the remote file SHA before writing to avoid overwriting a newer edit. It does not overwrite unrelated files.

## Deployment
The repository currently has no `.github/workflows/deploy.yml` workflow. Verify **Settings → Pages → Build and deployment** to determine whether Pages is configured for branch deployment or GitHub Actions before changing deployment configuration.

## Development checks
Run `npm run check` with Node.js installed.


## Orbit Studio — homepage editing

The Studio now includes a visual **Home** editor for the public homepage. It edits the hero headline and introduction, primary call to action, about copy, section headings, contact destination and footer. Existing section visibility controls are reflected by the public renderer. Project and service cards are rendered from the imported portfolio configuration.

Studio editors share one in-memory configuration object so edits made in Home, Profile, content lists, the page builder and Advanced JSON stay in sync. The public renderer also restricts content links and image URLs to safe web or local URL forms.

Custom pages currently use query URLs such as `/?page=about-me`; GitHub Pages does not generate arbitrary pretty routes from the browser editor alone.


## Orbit Studio — Media Library & Universal Creator

- The Media Library lists files in `assets/media/` on the selected repository branch.
- Uploads are committed directly to that branch. The current Studio limit is 20 MB per file.
- Active-content extensions such as HTML, JavaScript and SVG are blocked from the public media directory. Raster images can be previewed; video/audio and other files are listed with file-type labels.
- The Universal Creator stores articles, announcements, gallery entries, release notes and general posts in the `contentItems` array inside `data/portfolio.json`.
- After publishing the portfolio configuration, each content item can be viewed at `/?content=<slug>`.
- Media uploads create their own Git commits; content drafts remain local until the portfolio configuration is published.
- The Media Library requires a connected GitHub session with Contents read/write permission. The token remains in memory only.


## Orbit Studio — Navigation & Global Design System

- Navigation Studio edits public navigation labels, destinations, visibility and order.
- Global design tokens control accent colors, background/surface/text colors, font family, content width, base size, corner radius and section spacing.
- The reusable component library supports text, CTA, quote, image and divider templates. Custom pages can reference saved components; updates to a saved component are reflected in linked page blocks.
- All navigation, design-system and component changes are stored in the shared portfolio configuration and published through the existing GitHub publish flow.


## Orbit Studio — SEO, Contact & Analytics

- SEO settings include a page title, meta description, canonical URL, social preview image, X/Twitter handle and a no-index switch.
- Static homepage metadata provides a useful baseline before the browser loads the portfolio configuration. Studio settings update the rendered document metadata at runtime; search engines may not treat JavaScript-generated metadata exactly like server-rendered HTML.
- The optional public contact form uses a Formspree HTTPS endpoint. GitHub Pages does not run server-side form code. Form submissions are sent to the configured provider; configure its inbox, spam protection and privacy notice separately.
- Optional analytics supports Google Analytics 4 measurement IDs and Plausible domains. Analytics is off by default and loads only when enabled with a valid identifier. Site owners are responsible for applicable visitor consent, disclosure and privacy requirements.
- Do not store API keys, passwords or private credentials in the public portfolio configuration.


## Blog & Publishing Studio

- The Blog & publishing tab manages article, announcement, gallery, release and post entries.
- Search and filter by type, status, category and publication date; sort by newest, oldest or title.
- Edit existing entries, change draft/published status, preview public article routes, and delete entries.
- Per-entry fields include category, tags, cover image, date, summary, body and optional SEO title/description/image.
- Draft entries are hidden from the public archive and direct article route. Older entries without a status remain published for backwards compatibility.
- The public journal archive is available at `/?blog=1`; individual entries use `/?content=<slug>`. A Journal navigation link appears when published entries exist.
- Studio changes remain in the portfolio configuration draft. Publish `data/portfolio.json` to commit the editorial changes to the selected branch. GitHub Pages then serves the updated static content.
- This is a client-rendered archive, not a server-side CMS. Query-string routes may have weaker search-engine discoverability than generated static HTML pages; per-entry metadata is applied in the browser after configuration loads.


## Advanced Publishing & Static Site Generator

- Site publishing generates real static HTML at `/blog/<slug>/` for every published content item, plus a static `/blog/` archive.
- The generator also creates `sitemap.xml` and `robots.txt` using the configured public HTTPS site URL (defaults to the GitHub Pages URL shown in Studio).
- Build preview lists every generated file and its size before publishing. Publishing requires explicit confirmation and rejects stale previews if the draft, selected branch or imported configuration revision changes.
- Generated pages, sitemap, robots file and `data/portfolio.json` are written through the Git Data API as a single commit, so the set is applied atomically. The Studio checks the imported configuration SHA before committing to avoid publishing over a newer configuration.
- Studio displays recent repository commits and can selectively roll back Studio publication commits. Rollback creates a new commit, restores only `data/portfolio.json`, `blog/`, `sitemap.xml` and `robots.txt`, and refuses commits that also modify application/source files. Commits with incomplete GitHub file listings are rejected.
- Clean article URLs are generated as actual directories with `index.html`; the existing query-string routes remain available as compatibility fallbacks.


## OrbitOmen Studio — Expansion workspaces (Phase 12 foundation)

- **Visual presets:** Cinematic Developer, Aurora Glass, Minimal Editorial, Creative Studio, Restaurant / Product, Neon Tech and Orbit Signature. Presets apply coordinated global design tokens; custom presets are saved in the portfolio configuration.
- **Multi-site registry:** register independent website names, source branches and deployment paths. The main portfolio is shown as a protected primary site. This is a configuration manager only; branch aggregation into deployment paths requires the dedicated GitHub Actions deployment workflow.
- **Shared media source:** configure the dedicated `media` branch and its public `/media/` mount path. The deployment workflow must assemble this branch into the Pages artifact; GitHub Pages does not publish arbitrary branches at matching URL paths automatically.
- **Social Preview Studio:** configure default Open Graph / Discord title, description, image, handle and preview style. This phase saves metadata settings; the static HTML generator still needs to emit page-specific metadata into the initial HTML response for Discord crawler compatibility.
- **Client Desk form builder:** configure inquiry form copy, enablement, custom contact methods (Instagram, Discord, email, WhatsApp, Telegram, X, LinkedIn and custom platforms), and custom request fields. The Worker endpoint is an optional HTTPS setting. Public submission delivery, private request storage, attachment handling, Discord notifications and request management are not active until the Cloudflare Worker backend is deployed.
- No Discord bot token, GitHub PAT or other secret is stored in the public portfolio configuration.
