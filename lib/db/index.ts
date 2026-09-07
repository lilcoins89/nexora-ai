import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

/** Postgres pool when DATABASE_URL is set; otherwise null so local/demo deploys do not crash. */
export const pool = connectionString
  ? new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    })
  : (null as unknown as Pool)
