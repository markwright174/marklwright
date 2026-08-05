import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve('.local/cloudflare.env');

function loadLocalEnv() {
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.replace(/^["']|["']$/g, '');
    process.env[key] = value;
  }
}

async function requestCloudflare(path) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  return { response, data };
}

loadLocalEnv();

if (!process.env.CLOUDFLARE_API_TOKEN) {
  console.error(`Missing CLOUDFLARE_API_TOKEN. Add it to ${envPath}.`);
  process.exit(1);
}

const token = process.env.CLOUDFLARE_API_TOKEN;
const isAccountToken = token.startsWith('cfat_');

if (isAccountToken && !process.env.CLOUDFLARE_ACCOUNT_ID) {
  console.error('This looks like an account-owned Cloudflare token. Add CLOUDFLARE_ACCOUNT_ID to verify it.');
  process.exit(1);
}

const verifyPath = isAccountToken
  ? `/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/tokens/verify`
  : '/user/tokens/verify';
const verify = await requestCloudflare(verifyPath);

if (!verify.response.ok || !verify.data.success) {
  console.error('Cloudflare rejected the token.');
  console.error(JSON.stringify(verify.data.errors || verify.data, null, 2));
  process.exit(1);
}

console.log('Cloudflare token is valid.');

if (process.env.CLOUDFLARE_ACCOUNT_ID) {
  const pages = await requestCloudflare(`/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/pages/projects`);
  if (pages.response.ok && pages.data.success) {
    console.log(`Pages access works. Found ${pages.data.result.length} Pages project(s).`);
  } else {
    console.log('Token verified, but Pages project listing failed.');
    console.log(JSON.stringify(pages.data.errors || pages.data, null, 2));
    process.exitCode = 1;
  }
} else {
  console.log('Add CLOUDFLARE_ACCOUNT_ID to also test Pages access.');
}
