# Smile Store — Orange Android APK Marketplace

**Smile Store** is a production-oriented, mobile-first cloud Android APK marketplace built with React, TypeScript, Tailwind CSS, Express, Firebase Firestore, and Cloudflare R2 object storage.

---

## 1. Key Architectural Principles

- **Zero Dummy Data**: The marketplace launches completely empty. There are no placeholder records, fake ratings, simulated reviews, or dummy counters.
- **Strict Verification Gate**: Applications can never be published unless their Android APK Signature Scheme (v2/v3) block is cryptographically verified against the binary digest.
- **Private Storage**: APK binaries are stored in private Cloudflare R2 buckets. Downloads are served via short-lived (5-minute) presigned URLs.
- **Mobile-First Orange Design**: Engineered with an orange palette (`#FF7A00`, `#FF9F43`, `#FFF7F0`), strict zero-pill metadata discipline, and $\ge 44\text{px}$ touch targets.
- **Serverless & Vercel Compatible**: Ready for deployment to Vercel with Node.js runtime handlers and dedicated S3-compatible R2 storage.

---

## 2. Cryptographic Signature Verification Pipeline

Smile Store avoids superficial file extensions or magic-byte checks. The verification engine (`src/server/verification/apkVerifier.ts`):

1. **Quarantine Storage**: Uploads candidate APKs directly to private quarantine storage (`quarantine/apk/...`).
2. **ZIP EOCD & Central Directory Analysis**: Locates the ZIP End of Central Directory (EOCD) table and determines the Central Directory offset.
3. **APK Signing Block Inspection**:
   - Inspects the 16-byte magic footer `APK Sig Block 42` preceding the Central Directory.
   - Parses ID-value pairs:
     - `0x7109871a`: APK Signature Scheme v2
     - `0xf05368c0`: APK Signature Scheme v3
4. **Certificate & Digest Extraction**:
   - Extracts the X.509 DER certificate chain embedded in the signer's block.
   - Computes the SHA-256 fingerprint (`XX:XX:...`) of the signing certificate.
   - Computes the full file SHA-256 digest.
5. **Binary XML (AXML) Manifest Extraction**:
   - Decodes `AndroidManifest.xml` from the ZIP entries.
   - Extracts genuine `package`, `versionCode`, `versionName`, and `<uses-permission>` tags.
6. **Publication Promotion**:
   - Only when cryptographic verification succeeds and an administrator approves publication, the binary is promoted from quarantine to the published storage namespace (`published/apk/...`).

---

## 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
# Public Variables
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""

# Firebase Admin Service Account (Secret)
FIREBASE_PROJECT_ID=""
FIREBASE_CLIENT_EMAIL=""
FIREBASE_PRIVATE_KEY=""

# Cloudflare R2 Storage (AWS S3-Compatible SDK)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_BASE_URL=""

# Security & Access Control
ADMIN_EMAIL_ALLOWLIST="admin@smilestore.app,gradiocantilan@gmail.com"
SESSION_SECRET="your-64-char-random-secret"
APP_BASE_URL="http://localhost:3000"
MAX_APK_SIZE_MB="150"
```

---

## 4. Local Development

```bash
# Install dependencies
npm install

# Run test suite
npm run test

# Start full-stack development server (Express API + Vite HMR)
npm run dev
```

Visit `http://localhost:3000`.

---

## 5. Vercel Deployment Checklist

1. **Repository Setup**: Push project to GitHub/GitLab.
2. **Vercel Project Creation**: Import repository on Vercel.
3. **Framework Preset**: Other / Vite.
4. **Build Command**: `npm run build`.
5. **Output Directory**: `dist`.
6. **Environment Variables**: Add all variables from `.env.example` into Vercel Project Settings > Environment Variables.
7. **Deploy**: Trigger deployment.

---

## 6. Firestore Database Schema

- **`apps`**: App records including cryptographic hashes, status (`draft`, `pending`, `published`, `rejected`, `archived`), and download counts.
- **`categories`**: Derived dynamically from published applications.
- **`cmsSettings`**: Marketplace branding and limits.
- **`auditLogs`**: Immutable records of every administrator action, publication, and verification.
- **`users`**: Administrator identities validated against `ADMIN_EMAIL_ALLOWLIST`.
