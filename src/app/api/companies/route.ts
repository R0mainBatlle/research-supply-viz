import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const VALID_SORT_KEYS = new Set([
  'company_name', 'country_iso', 'nace_core', 'employees',
  'revenue_eur_th', 'ebitda_eur_th', 'city', 'region', 'guo_name',
]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const nace = sp.get('nace');          // comma-separated: "2550,2591"
  const country = sp.get('country');
  const region = sp.get('region');
  const q = sp.get('q');
  const effMin = sp.get('effMin');
  const effMax = sp.get('effMax');
  const caMin = sp.get('caMin');
  const caMax = sp.get('caMax');
  const urlOnly = sp.get('urlOnly');
  const sort = sp.get('sort') || 'employees';
  const dir = sp.get('dir') || 'desc';
  const page = Math.max(0, parseInt(sp.get('page') || '0', 10));
  const pageSize = Math.min(500, Math.max(1, parseInt(sp.get('pageSize') || '100', 10)));

  const conditions: string[] = [];
  const params: (string | number | string[])[] = [];
  let idx = 1;

  if (nace) {
    const codes = nace.split(',').map(s => s.trim()).filter(Boolean);
    if (codes.length > 0) {
      conditions.push(`nace_core = ANY($${idx}::text[])`);
      params.push(codes);
      idx++;
    }
  }

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
  const sortCol = VALID_SORT_KEYS.has(sort) ? sort : 'employees';
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC';
  const nulls = sortDir === 'ASC' ? 'NULLS LAST' : 'NULLS LAST';

  const selectCols = `id, company_name, country_iso, nace_core, nace_secondary, trade_description, employees, city, region, revenue_eur_th, ebitda_eur_th, guo_name, guo_country_iso, website, national_id, nb_branches, nb_subsidiaries`;

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT ${selectCols} FROM companies ${where} ORDER BY ${sortCol} ${sortDir} ${nulls} LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, pageSize, page * pageSize],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM companies ${where}`,
      params,
    ),
  ]);

  return NextResponse.json({
    data: dataResult.rows,
    total: countResult.rows[0].total,
    page,
    pageSize,
  });
}
