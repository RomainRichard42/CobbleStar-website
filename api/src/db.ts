import mysql, { PoolConnection, RowDataPacket } from "mysql2/promise";
import { config } from "./config.js";

export const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  ssl: config.DB_SSL ? {} : undefined,
  connectionLimit: 10,
  enableKeepAlive: true,
  decimalNumbers: true,
});

export async function transaction<T>(work: (connection: PoolConnection) => Promise<T>) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export type DbRow = RowDataPacket & Record<string, unknown>;
