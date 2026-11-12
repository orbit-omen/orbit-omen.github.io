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
