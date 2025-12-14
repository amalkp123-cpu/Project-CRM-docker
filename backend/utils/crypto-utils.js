const crypto = require("crypto");

function sha256(input = "") {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function getKey() {
  const k = String(process.env.SIN_ENC_KEY || "").trim();
  if (!/^[0-9a-fA-F]{64}$/.test(k)) {
    throw new Error("SIN_ENC_KEY must be 32 bytes hex (64 hex chars)");
  }
  return Buffer.from(k, "hex");
}

const KEY = getKey(); // throws early if misconfigured

function encrypt(text) {
  const iv = crypto.randomBytes(12); // 12 bytes recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(text), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

function decrypt(b64) {
  if (!b64) return null;
  let raw;
  try {
    raw = Buffer.from(b64, "base64");
  } catch (e) {
    return null;
  }
  if (raw.length < 28) return null; // iv(12) + tag(16) minimum
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  try {
    const dec = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    dec.setAuthTag(tag);
    const out = Buffer.concat([dec.update(ciphertext), dec.final()]);
    return out.toString("utf8");
  } catch (err) {
    return null;
  }
}

module.exports = { encrypt, decrypt, sha256 };
