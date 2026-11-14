// Generates APPLE_SECRET for Sign in with Apple (Auth.js).
// Apple's "client secret" is a JWT signed (ES256) with your .p8 key. It
// expires after at most 180 days, so re-run this before then and update the
// env var.
//
// Usage:
//   node scripts/apple-client-secret.mjs <path/to/AuthKey_XXXX.p8> <KEY_ID> <TEAM_ID> <SERVICES_ID>
//
// Prints the JWT. Keep the .p8 file out of the repo.

import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const [p8Path, keyId, teamId, servicesId] = process.argv.slice(2);
if (!p8Path || !keyId || !teamId || !servicesId) {
  console.error("Usage: node scripts/apple-client-secret.mjs <AuthKey.p8> <KEY_ID> <TEAM_ID> <SERVICES_ID>");
  process.exit(1);
}

// Apple Key IDs and Team IDs are 10 characters, A–Z and 0–9. Catches a
// placeholder such as "TEAM_ID" left in the command, which would otherwise
// produce a secret Apple rejects with invalid_client.
const APPLE_ID_RE = /^[A-Z0-9]{10}$/;
for (const [label, value] of [["KEY_ID", keyId], ["TEAM_ID", teamId]]) {
  if (!APPLE_ID_RE.test(value)) {
    console.error(`${label} "${value}" isn't a 10-character Apple ID like A1B2C3D4E5.`);
    console.error("Team ID: developer.apple.com/account → Membership details. Key ID: Keys, or the .p8 file name.");
    process.exit(1);
  }
}
if (!servicesId.includes(".")) {
  console.error(`SERVICES_ID "${servicesId}" should look like com.yourdomain.bach.web.`);
  process.exit(1);
}

const MAX_AGE = 180 * 24 * 60 * 60; // Apple's limit
const b64url = (value) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");

const now = Math.floor(Date.now() / 1000);
const header = { alg: "ES256", kid: keyId };
const payload = { iss: teamId, iat: now, exp: now + MAX_AGE, aud: "https://appleid.apple.com", sub: servicesId };
const input = `${b64url(header)}.${b64url(payload)}`;

const key = createPrivateKey(readFileSync(p8Path, "utf8"));
const signature = sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");

console.log(`${input}.${signature}`);
console.error(`Expires ${new Date((now + MAX_AGE) * 1000).toDateString()}. Regenerate before then.`);
