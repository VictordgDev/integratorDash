import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Neon serverless driver — ideal para Vercel Edge/Serverless Functions
const sql = neon(process.env.DATABASE_URL)

export const db = drizzle(sql, { schema })

export type DB = typeof db
