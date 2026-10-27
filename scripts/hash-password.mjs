// Prints an AUTH_USERS entry for one account.
// Usage: npm run hash-password -- someone@cascadewebsolutions.co
// The password is read from the prompt (or stdin), never from the command line.
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

const email = process.argv[2]?.trim().toLowerCase();
if (!email?.includes("@")) {
  console.error("Usage: npm run hash-password -- <email>");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stderr });
rl.question(`Password for ${email}: `, password => {
  rl.close();
  if (password.length < 12) {
    console.error("Use at least 12 characters.");
    process.exit(1);
  }
  // Same format as hashPassword() in src/lib/auth.ts.
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  console.log(`${email}=scrypt$${salt}$${hash}`);
});
