# signpdf

Drop a PDF, place a signature/text/date, download the signed file. Everything runs in the browser — files never leave the device. For high-stakes contracts (real estate, legal, financial) people should still use DocuSign; this is for everyday paperwork.

Lives at `signpdf.casefoster.ai`.

## Setup

```bash
npm install
```

Installs everything in `package.json`. Takes ~30 seconds.

```bash
npm run dev
```

Starts the dev server. Open `http://localhost:3000` in your browser.

## Test on your phone before deploying

This is non-negotiable for this app — the signature pad and field dragging behave differently on touch devices than on a trackpad.

1. With `npm run dev` running on your laptop, find the laptop's local IP:
   - Mac: `ipconfig getifaddr en0` in Terminal (gives you something like `192.168.1.42`)
2. On your phone, on the same WiFi, open Safari and go to `http://192.168.1.42:3000` (replace with your IP).
3. Try uploading a PDF, placing a signature, dragging it, downloading. Especially test:
   - Signature pad: does drawing feel responsive?
   - Drag: can your finger grab the resize handle in the corner?
   - Download: does the signed PDF actually open in iOS Files / share sheet?

## Git: first push from a fresh clone

Run this once after cloning so commits go to the right account:

```bash
git config user.name "casefosterai"
git config user.email "casekfoster@gmail.com"
```

Then the usual:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/casefosterai/signpdf.git
git push -u origin main
```

If push gives a 403 error, GitHub auth is cached for the wrong account. Fix with:

```bash
gh auth login
```

Pick the `casefosterai` account when prompted.

## Deploy to Vercel

1. Go to [vercel.com](https://vercel.com), click "Add New Project," and import the GitHub repo.
2. Framework should auto-detect as **Next.js**. No env vars needed.
3. Click "Deploy." Takes ~1 minute.

You'll get a `signpdf-xxx.vercel.app` URL. Test that first — open it on your phone, verify everything still works in production.

## Subdomain: `signpdf.casefoster.ai`

Two-step: tell Vercel about the domain, then point DNS at Vercel.

**In Vercel:**
1. Open the `signpdf` project → Settings → Domains.
2. Add `signpdf.casefoster.ai`.
3. Vercel will show a CNAME target — usually `cname.vercel-dns.com`. Copy it.

**In Namecheap (or wherever `casefoster.ai` is registered):**
1. Open the `casefoster.ai` domain → Advanced DNS.
2. Add a new record:
   - Type: **CNAME**
   - Host: `signpdf`
   - Value: `cname.vercel-dns.com` (or whatever Vercel gave you)
   - TTL: Automatic
3. Save.

DNS propagation usually takes 1–5 minutes. Vercel will auto-issue an SSL cert once it sees the CNAME pointing at it. After that, `signpdf.casefoster.ai` works.

## Add the gallery entry on casefoster.ai

Separate project — handle it there. Slug is `signpdf`.

## Common deploy issues

- **Build error about `pdfjs-dist` and `canvas`:** the `next.config.mjs` already includes the fix (`config.resolve.alias.canvas = false`). If you copy this project as a starter for another, that line has to come along.
- **PDF preview is blank in production but works in dev:** the pdfjs worker is loaded from a CDN (cloudflare). If you're on a network that blocks it, the worker fails silently. The fallback would be to host the worker file yourself in `public/`, but the CDN approach is simpler for now.
- **Signature looks tiny / pixelated when stamped:** the signature pad trims whitespace, so a sloppy small drawing in a big pad will scale up oddly. The signature image is fit-to-box in the final PDF, so resize the field on the page to control how big it appears.
- **iOS download doesn't open the PDF:** Safari sometimes opens download links instead of triggering save. The "Download" button creates a `Blob` URL and an anchor click, which works in iOS Safari 13+. On older iOS, the user may need to tap-and-hold to save.

## Icon / PWA assets you still need to generate

Drop these into `public/`:

- `apple-touch-icon.png` — **180×180**
- `icon-192.png` — **192×192**
- `icon-512.png` — **512×512**

**Suggested icon:** a simple rounded-square mark. Black background (`#0a0a0a`) with a single red checkmark or a stylized "S" in the casefoster red (`#FF4D4D`). Keep it simple — at 192px most detail vanishes.

The `app/icon.tsx` file generates a tiny browser-tab favicon dynamically, so that one's already covered.

## Architecture notes

- **`pdf-lib`** writes signatures into the original PDF on the client side.
- **`pdfjs-dist`** renders PDF pages onto a canvas so the user can see where to place fields. Loaded lazily (only on the client) to keep the initial bundle small.
- **`react-signature-canvas`** is the signature drawing surface.
- Field positions are stored as **normalized ratios** (0..1) instead of pixel coordinates. This means resizing the browser window or zooming the PDF preview doesn't move the fields — they always sit in the same proportional spot on the page.
- All state is in React. No localStorage, no backend, nothing persists across reloads.

## What this does NOT do (intentional)

- No audit trail, no IP logging, no certificate of completion.
- No sending to a third party — you sign your own PDF and download it.
- No multi-party flow. If you need that, scope it as a separate project (Tier 2).
- No editing the PDF text itself — only stamping new content on top.
