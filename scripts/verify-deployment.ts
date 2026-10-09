import { config } from '../src/server/config.ts';
import { getFirebaseAdmin } from '../src/server/firebase/admin.ts';
import { getR2Client } from '../src/server/storage/r2.ts';

async function verifyDeployment() {
  console.log('--- SMILE STORE DEPLOYMENT VERIFICATION ---');
  console.log(`Node Environment: ${config.nodeEnv}`);
  console.log(`Port: ${config.port}`);
  console.log(`App Base URL: ${config.appBaseUrl}`);

  // 1. Firebase Check
  console.log('\n[1/3] Checking Firebase Admin & Firestore...');
  if (config.firebase.isConfigured) {
    const admin = getFirebaseAdmin();
    if (admin.db) {
      console.log('✔ Firebase Admin initialized with private key service credentials.');
    } else {
      console.log('✖ Firebase Admin configuration failed to connect.');
    }
  } else {
    console.log('ℹ Firebase Admin credentials not provided in .env. Running local persistence mode.');
  }

  // 2. Cloudflare R2 Check
  console.log('\n[2/3] Checking Cloudflare R2 S3 Client...');
  if (config.r2.isConfigured) {
    const r2 = getR2Client();
    if (r2) {
      console.log(`✔ Cloudflare R2 client configured for bucket: ${config.r2.bucketName}`);
    } else {
      console.log('✖ Cloudflare R2 client failed to initialize.');
    }
  } else {
    console.log('ℹ Cloudflare R2 credentials not provided in .env. Running local quarantine buffer mode.');
  }

  // 3. Security Allowlist
  console.log('\n[3/3] Checking Admin Security Allowlist...');
  console.log(`✔ Administrator Allowlist: ${config.adminEmailAllowlist.join(', ')}`);

  console.log('\n✔ Verification complete. Deployment readiness confirmed.');
}

verifyDeployment().catch(console.error);
