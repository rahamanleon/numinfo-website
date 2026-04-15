# NumInfo - Bangladesh Number Lookup

A sleek, modern phone number lookup tool for Bangladesh numbers, built with pure HTML/CSS/JS and deployed on GitHub Pages.

**Live site:** https://rahamanleon.github.io/numinfo-website/

## Features

- Look up Bangladesh mobile numbers
- Shows: Name, Number, Facebook ID
- Beautiful glassmorphism UI
- Fully responsive
- API key protected via build-time injection (never exposed in source)

## How It Works

The site uses GitHub Actions to inject the API URL at **build time**, so secrets are never visible in the public repository source code.

```
Repository (public)  →  GitHub Actions  →  GitHub Pages (live)
     src/index.html        build.yml          dist/index.html
     (placeholder)         (injects secret)   (real API URL)
```

## Setup

### 1. Set the API URL Secret

Go to your repo **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|------|-------|
| `API_URL` | Your API endpoint (e.g. ``) |

### 2. Enable GitHub Pages

1. Go to **Settings → Pages**
2. Under "Build and deployment" → Source: **GitHub Actions**
3. Save

### 3. Push to Master

Every push to `master` will automatically build and deploy.

## Local Development

```bash
# Set your API URL
export API_URL=""

# Run build
chmod +x build.sh
./build.sh

# Open dist/index.html in browser
```

Or without the build script:

```bash
export API_URL=""
sed "s|{{API_URL}}|${API_URL}|g" src/index.html > dist/index.html
```

## Project Structure

```
numinfo-website/
├── src/
│   └── index.html        # Source (placeholder: {{API_URL}})
├── dist/                 # Built output (gitignored)
├── .github/
│   └── workflows/
│       └── build.yml     # Build & deploy pipeline
├── build.sh             # Local build script
├── .env.example         # Template for local env vars
├── README.md
└── numinfo-website.html # Standalone version (no build needed)
```

## Security

- The actual API URL is stored as a GitHub Secret and only injected during the CI/CD build
- The `dist/` folder is gitignored and only exists after build
- Public source code contains only the placeholder `{{API_URL}}`
