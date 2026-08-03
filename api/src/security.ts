import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

export const hashPassword = (password: string) => hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password);
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function linkCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const raw = randomBytes(6);
  let value = "";
  for (let index = 0; index < 6; index += 1) value += alphabet[raw[index]! % alphabet.length];
  return `CS-${value.slice(0, 3)}-${value.slice(3)}`;
}
