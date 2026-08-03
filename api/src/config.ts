import "dotenv/config";
import { z } from "zod";

const bool = z.string().default("false").transform((value) => value === "true");
const generatedSecret = z.string().min(32).refine((value) => !value.includes("GENERATE") && !value.includes("REPLACE"), "Secret placeholder must be replaced");
const configuredPassword = z.string().min(1).refine((value) => !value.includes("REPLACE"), "Password placeholder must be replaced");

export const config = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(25577),
  PUBLIC_API_URL: z.string().url(),
  SITE_ORIGIN: z.string().url(),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: configuredPassword,
  DB_SSL: bool,
  COOKIE_SECRET: generatedSecret,
  MINECRAFT_SERVER_KEY: generatedSecret,
}).parse(process.env);

export const isProduction = config.NODE_ENV === "production";
