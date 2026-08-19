import { createHash } from "node:crypto";

const PRIMARY_URL = "https://raw.githubusercontent.com/Manablaq/genlayer-evidence-primary/e2d9fa8ca4228a44a7b30f4213fc09ea7fc7051f/records/finality-yes.txt";
const CORROBORATION_URL = "https://raw.githubusercontent.com/Manablaq/genlayer-evidence-corroboration/b0b4e3466abd2318c37be220ef5ae2f56e1a6002/records/finality-yes.txt";
const AUTHORITATIVE_SOURCE_URL = "https://raw.githubusercontent.com/genlayerlabs/genlayer-docs/9699f3900dd697689090f6595f5c14b4f0a60fdf/pages/understand-genlayer-protocol/optimistic-democracy-how-genlayer-works.mdx";
const SOURCE_DIGEST = "844d219afb599bc08c51d9580458bf88d68f8f9947aa90562f9aa3dfc4c26a0e";
const REQUIRED_HEADERS = [
  "Outcome-Market-Evidence",
  "Record-ID",
  "Question",
  "Policy",
  "Authority",
  "Authoritative-Source",
  "Source-Observed-At",
  "Evidence-Published-At",
  "Evidence-Expires-At",
  "Source-Digest",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parsePinnedUrl(url) {
  const match = /^https:\/\/raw\.githubusercontent\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/([0-9a-f]{40})\/.+$/.exec(url);
  assert(match, `Not a commit-pinned raw GitHub URL: ${url}`);
  return { repository: `${match[1]}/${match[2]}`, commit: match[3] };
}

async function fetchText(url) {
  const response = await fetch(url);
  assert(response.ok, `Fetch failed for ${url}: HTTP ${response.status}`);
  return response.text();
}

function parseRecord(text, label) {
  const separator = text.indexOf("\n\n");
  assert(separator > 0, `${label}: missing blank line before evidence body`);
  const headerLines = text.slice(0, separator).split("\n");
  assert(headerLines.length === REQUIRED_HEADERS.length, `${label}: unexpected header count`);

  const headers = {};
  for (const [index, line] of headerLines.entries()) {
    const separatorIndex = line.indexOf(": ");
    assert(separatorIndex > 0, `${label}: malformed header`);
    const name = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 2);
    assert(name === REQUIRED_HEADERS[index], `${label}: header ${index + 1} must be ${REQUIRED_HEADERS[index]}`);
    assert(value.trim().length > 0, `${label}: ${name} is empty`);
    headers[name] = value;
  }
  assert(text.slice(separator + 2).trim().length > 0, `${label}: empty evidence body`);
  assert(!Object.hasOwn(headers, "Outcome"), `${label}: record must not supply an outcome`);
  return headers;
}

const [primaryText, corroborationText, authoritativeSource] = await Promise.all([
  fetchText(PRIMARY_URL),
  fetchText(CORROBORATION_URL),
  fetchText(AUTHORITATIVE_SOURCE_URL),
]);
const primaryRef = parsePinnedUrl(PRIMARY_URL);
const corroborationRef = parsePinnedUrl(CORROBORATION_URL);
assert(primaryRef.repository !== corroborationRef.repository, "Evidence fixtures must use distinct repositories");

const primary = parseRecord(primaryText, "primary");
const corroboration = parseRecord(corroborationText, "corroboration");
for (const key of REQUIRED_HEADERS) {
  assert(primary[key] === corroboration[key], `Records disagree on ${key}`);
}
assert(primary["Authoritative-Source"] === AUTHORITATIVE_SOURCE_URL, "Unexpected authoritative source URL");
const sourceDigest = createHash("sha256").update(authoritativeSource).digest("hex");
assert(sourceDigest === SOURCE_DIGEST, "Authoritative source SHA-256 differs from the release record");
assert(primary["Source-Digest"] === sourceDigest, "Evidence source digest does not match authoritative bytes");

console.log(JSON.stringify({
  primary: { url: PRIMARY_URL, ref: `${primaryRef.repository}@${primaryRef.commit}` },
  corroboration: { url: CORROBORATION_URL, ref: `${corroborationRef.repository}@${corroborationRef.commit}` },
  authoritativeSource: AUTHORITATIVE_SOURCE_URL,
  sourceSha256: sourceDigest,
  recordId: primary["Record-ID"],
  corroborationVerified: true,
}, null, 2));
