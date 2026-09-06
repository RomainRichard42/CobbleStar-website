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
  DISCORD_CLIENT_ID: z.string().trim().default(""),
  DISCORD_CLIENT_SECRET: z.string().trim().default(""),
  DISCORD_BOT_TOKEN: z.string().trim().default(""),
  DISCORD_GUILD_ID: z.string().regex(/^\d{15,24}$/).default("1540002066469101629"),
  MINECRAFT_SERVER_KEY: generatedSecret,
  // Enable ONLY with authenticated Minecraft UUIDs (online-mode or a secured proxy).
  MINECRAFT_RELINK_ENABLED: bool,
  GAME_ADMIN_DISCORD_IDS: z.string().default(""),
  GAME_ADMIN_READ_DISCORD_IDS: z.string().default(""),
  ENABLE_TEST_PURCHASES: bool,
  WIKI_ADMIN_EMAILS: z.string().default("romain.richard42400@gmail.com"),
}).parse(process.env);

export const isProduction = config.NODE_ENV === "production";
