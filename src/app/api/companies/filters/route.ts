import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const [countriesResult, regionsResult] = await Promise.all([
    pool.query(
      `SELECT country_iso, COUNT(*)::int AS cnt FROM companies WHERE country_iso IS NOT NULL GROUP BY country_iso ORDER BY cnt DESC`,
    ),
    pool.query(
      `SELECT DISTINCT region FROM companies WHERE region IS NOT NULL AND region != '' ORDER BY region`,
    ),
  ]);

  const countries: [string, number][] = countriesResult.rows.map(r => [r.country_iso, r.cnt]);
  const regions: string[] = regionsResult.rows.map(r => r.region);

  return NextResponse.json({ countries, regions });
}
