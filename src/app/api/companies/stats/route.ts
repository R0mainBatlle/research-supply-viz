import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // Same filters as /api/companies EXCEPT nace (so tree counts reflect bar filters only)
  const country = sp.get('country');
  const region = sp.get('region');
  const q = sp.get('q');
  const effMin = sp.get('effMin');
  const effMax = sp.get('effMax');
  const caMin = sp.get('caMin');
  const caMax = sp.get('caMax');
  const urlOnly = sp.get('urlOnly');

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let idx = 1;

  if (country) {
    conditions.push(`country_iso = $${idx}`);
    params.push(country);
    idx++;
  }

  if (region) {
    conditions.push(`region = $${idx}`);
    params.push(region);
    idx++;
  }

  if (q) {
    conditions.push(`to_tsvector('english', COALESCE(trade_description,'') || ' ' || COALESCE(company_name,'') || ' ' || COALESCE(city,'') || ' ' || COALESCE(guo_name,'') || ' ' || COALESCE(region,'')) @@ plainto_tsquery('english', $${idx})`);
    params.push(q);
    idx++;
  }

  if (effMin) {
    conditions.push(`employees >= $${idx}`);
    params.push(parseInt(effMin, 10));
    idx++;
  }

  if (effMax) {
    conditions.push(`employees <= $${idx}`);
    params.push(parseInt(effMax, 10));
    idx++;
  }

  if (caMin) {
    conditions.push(`revenue_eur_th >= $${idx}`);
    params.push(parseFloat(caMin));
    idx++;
  }

  if (caMax) {
    conditions.push(`revenue_eur_th <= $${idx}`);
    params.push(parseFloat(caMax));
    idx++;
  }

  if (urlOnly === '1') {
    conditions.push(`website IS NOT NULL AND website != ''`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [aggResult, naceResult, totalAllResult] = await Promise.all([
    pool.query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN website IS NOT NULL AND website != '' THEN 1 END)::int AS with_url,
        COALESCE(SUM(revenue_eur_th), 0)::float AS total_revenue,
        COALESCE(SUM(employees), 0)::int AS total_employees,
        COUNT(DISTINCT country_iso)::int AS unique_countries
      FROM companies ${where}`,
      params,
    ),
    pool.query(
      `SELECT nace_core, COUNT(*)::int AS cnt FROM companies ${where} GROUP BY nace_core`,
      params,
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM companies`),
  ]);

  const agg = aggResult.rows[0];
  const byNace: Record<string, number> = {};
  for (const row of naceResult.rows) {
    byNace[row.nace_core] = row.cnt;
  }

  return NextResponse.json({
    total: agg.total,
    totalAll: totalAllResult.rows[0].total,
    withUrl: agg.with_url,
    totalRevenue: agg.total_revenue,
    totalEmployees: agg.total_employees,
    uniqueCountries: agg.unique_countries,
    byNace,
  });
}
