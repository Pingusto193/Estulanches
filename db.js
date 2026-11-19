// O mesmo Pool do repositorio de referencia, com dados vindos do Docker/.env.
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'estulanches',
  port: Number(process.env.DB_PORT || 5432)
})

export default pool
