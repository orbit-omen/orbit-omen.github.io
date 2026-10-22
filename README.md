# OrbitOmen - Link-in-Bio (GitHub Pages)

A customized, zero-build Link-in-Bio landing page featuring a Purple - Pastel Pink Minecraft & Developer aesthetic.

## Features
- **Theme:** Obsidian Purple & Pastel Pink palette with Nether Portal floating particles.
- **Developer & Minecraft Centric:** Integrated Modrinth / GitHub blocks, live Minecraft Server status widget (`mcsrvstat.us`), Discord rich presence (`api.lanyard.rest`), and developer skill tags.
- **Live Admin Panel:** Access `/admin.html` with default password `admin123` to customize layout, blocks, and colors with a split live-preview.
- **Zero-Build Deployment:** Works natively on GitHub Pages with `.nojekyll` and `_config.yml`.
- **PWA & Offline Ready:** Includes Web Manifest and Service Worker caching.

---

## Deploy to GitHub Pages

1. **Extract files** into your local folder or repository root.
2. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initialize OrbitOmen Bio"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. In GitHub, open **Settings** > **Pages** > **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: `main` / Folder: `/ (root)`
4. Visit `https://<your-username>.github.io/<repo-name>/`.

---

## Admin Panel & Customization

1. Navigate to `/admin.html` on your site.
2. Sign in with the default password: `admin123`.
3. Tweak your profile, blocks, or theme in real-time.
4. Go to **Deploy / Export** > click **Download config.json**.
5. Replace the `config.json` in your repository and commit changes to push them live to all visitors.

---

## Direct 1-Click Publishing via GitHub PAT & Actions

To publish updates straight from the `/admin.html` dashboard without using Git on your computer:

### 1. Enable GitHub Actions for Pages
1. In your GitHub repository, open **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. The included `.github/workflows/deploy.yml` workflow will now automatically deploy your site whenever a commit touches `config.json` or source files.

### 2. Create a Personal Access Token (PAT)
1. On GitHub, go to your **Settings** > **Developer settings** > **Personal access tokens** > **Fine-grained tokens** (or **Tokens (classic)**).
2. Click **Generate new token**.
3. Configure the permissions:
   - **Repository access:** Only select your link-in-bio repository.
   - **Permissions:** Under **Repository permissions**, set **Contents** to **Read and write**.
4. Generate and copy the token.

### 3. Commit from OrbitAdmin
1. Open your `/admin.html` dashboard and head to the **🚀 Deploy / Export** tab.
2. Under **Direct GitHub Sync**, enter:
   - **Repository:** `your-username/your-repo`
   - **Branch:** `main`
   - **Token:** Paste your Personal Access Token.
3. Click **🚀 Push Commit to GitHub**.
4. The admin panel directly updates `config.json` via GitHub's Contents API, which immediately triggers the GitHub Actions workflow to publish your site live within ~30 seconds.
