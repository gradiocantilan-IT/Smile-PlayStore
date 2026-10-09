import { AppRepository } from '../src/server/repositories/firestore.ts';
import { isEmailAllowed, signSessionToken, createCsrfToken } from '../src/server/auth/adminAuth.ts';

async function bootstrap() {
  const email = process.argv[2] || 'admin@smilestore.app';
  console.log(`Bootstrapping administrator for email: ${email}`);

  if (!isEmailAllowed(email)) {
    console.error(`Error: Email "${email}" is not present in ADMIN_EMAIL_ALLOWLIST.`);
    process.exit(1);
  }

  const user = await AppRepository.upsertUser({ email, role: 'superadmin' });
  const csrfToken = createCsrfToken();
  const token = signSessionToken({
    uid: user.uid,
    email: user.email,
    role: user.role,
    csrfToken,
  });

  await AppRepository.addAuditLog({
    actorEmail: email,
    action: 'ADMIN_CLI_BOOTSTRAP',
    targetType: 'auth',
    targetId: user.uid,
  });

  console.log('Administrator bootstrap successful!');
  console.log(`User ID: ${user.uid}`);
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
  console.log(`Session Token: ${token}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
