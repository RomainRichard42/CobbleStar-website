import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

export const hashPassword = (password: string) => hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password);
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function linkCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  while (value.length < 10) {
    const byte = randomBytes(1)[0]!;
    // 224 est le plus grand multiple de 32 inférieur à 256 : on évite ainsi
    // le biais du modulo tout en conservant un code facile à recopier.
    if (byte < 224) value += alphabet[byte % alphabet.length];
  }
  return `CS-${value.slice(0, 5)}-${value.slice(5)}`;
}

export const normalizeLinkCode = (value: string) => value.trim().toUpperCase();
