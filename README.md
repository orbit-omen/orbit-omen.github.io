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
