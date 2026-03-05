"use client";

import React, { useCallback, useMemo, useRef } from "react";
import { Search, Download, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { CompanyEU, naceToGroup } from "@/types";
import { useDefenseStore, SortKey } from "@/store/useDefenseStore";

// ── Helpers ─────────────────────────────────────────────────────

const COUNTRY_NAMES: Record<string, string> = {
  AT: "Autriche", BE: "Belgique", BG: "Bulgarie", CY: "Chypre", CZ: "Tchéquie",
  DE: "Allemagne", DK: "Danemark", EE: "Estonie", ES: "Espagne", FI: "Finlande",
  FR: "France", GR: "Grèce", HR: "Croatie", HU: "Hongrie", IE: "Irlande",
  IT: "Italie", LT: "Lituanie", LU: "Luxembourg", LV: "Lettonie", MT: "Malte",
  NL: "Pays-Bas", PL: "Pologne", PT: "Portugal", RO: "Roumanie", SE: "Suède",
  SI: "Slovénie", SK: "Slovaquie", NO: "Norvège", CH: "Suisse", GB: "Royaume-Uni",
};

const PAGE_SIZE = 100;

const COLUMNS: { key: string; label: string; sortable: boolean; width: string; numeric?: boolean }[] = [
  { key: "company_name", label: "ENTREPRISE", sortable: true, width: "min-w-[200px] max-w-[260px]" },
  { key: "website", label: "SITE WEB", sortable: false, width: "min-w-[140px] max-w-[180px]" },
  { key: "revenue_eur_th", label: "CA (k€)", sortable: true, width: "min-w-[90px]", numeric: true },
  { key: "employees", label: "EFFECTIF", sortable: true, width: "min-w-[90px]", numeric: true },
  { key: "ebitda_eur_th", label: "EBITDA (k€)", sortable: true, width: "min-w-[100px]", numeric: true },
  { key: "country_iso", label: "PAYS", sortable: true, width: "min-w-[80px]" },
  { key: "nace_core", label: "NACE", sortable: true, width: "min-w-[60px]" },
  { key: "region", label: "RÉGION", sortable: true, width: "min-w-[120px]" },
  { key: "city", label: "VILLE", sortable: true, width: "min-w-[100px]" },
  { key: "guo_name", label: "GROUPE", sortable: true, width: "min-w-[130px] max-w-[160px]" },
  { key: "trade_description", label: "ACTIVITÉ", sortable: false, width: "min-w-[200px] max-w-[300px]" },
];

// ── Main component ──────────────────────────────────────────────
export function CompanyResults() {
  const store = useDefenseStore();
  const {
    results, total, stats, loading,
    countries, regions: regionList,
    selectedNode, selectedCompany, setSelectedCompany,
    searchQuery, setSearchQuery,
    countryFilter, setCountryFilter,
    regionFilter, setRegionFilter,
    naceFilter, setNaceFilter,
    caMin, setCaMin, caMax, setCaMax,
    effMin, setEffMin, effMax, setEffMax,
    urlOnly, setUrlOnly,
    sortKey, sortDir, setSortKey,
    page, setPage,
    resetFilters,
  } = store;

  // Build NACE options sorted by count desc, with group label
  const naceOptions = useMemo(() => {
    const entries = Object.entries(stats.byNace)
      .map(([code, count]) => ({ code, count, group: naceToGroup(code) }))
      .sort((a, b) => b.count - a.count);
    return entries.map(({ code, count, group }) => ({
      value: code,
      label: `${code} — ${group} (${count.toLocaleString("fr-FR")})`,
    }));
  }, [stats.byNace]);

  const tableRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(key);
  }, [setSortKey]);

  const exportCSV = () => {
    const headers = ["company_name", "country_iso", "nace_core", "website", "revenue_eur_th", "employees", "ebitda_eur_th", "city", "region", "guo_name", "guo_country_iso", "trade_description", "nace_secondary", "national_id", "nb_branches", "nb_subsidiaries"];
    let csv = headers.join(",") + "\n";
    results.forEach((r) => {
      csv += headers.map((h) => {
        const v = r[h as keyof CompanyEU];
        if (v === null || v === undefined) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",") + "\n";
    });
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `programmes_eu_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* ── Stats bar ───────────────────────────────────── */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2 flex items-center gap-6 shrink-0">
        <StatChip label="ENTREPRISES" value={stats.total.toLocaleString("fr-FR")} sub={`/ ${stats.totalAll.toLocaleString("fr-FR")}`} />
        <StatChip label="PAYS" value={String(stats.uniqueCountries)} />
        <StatChip label="AVEC SITE WEB" value={`${stats.withUrl.toLocaleString("fr-FR")}`} sub={`(${stats.total > 0 ? Math.round((stats.withUrl / stats.total) * 100) : 0}%)`} />
        <StatChip label="CA CUMULÉ" value={`${(stats.totalRevenue / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} M€`} />
        <StatChip label="EFFECTIF TOTAL" value={stats.totalEmployees.toLocaleString("fr-FR")} />
        {selectedNode && (
          <div className="ml-auto flex items-baseline gap-1.5">
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--color-muted)]">NŒUD</span>
            <span className="text-xs font-semibold text-[var(--color-accent)]">{selectedNode.name}</span>
          </div>
        )}
        {loading && <Loader2 size={14} className="animate-spin text-[var(--color-muted)] ml-auto" />}
      </div>

      {/* ── Filter bar ──────────────────────────────────── */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2.5 flex gap-3 flex-wrap items-end shrink-0">
        <FilterGroup label="RECHERCHE">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom, ville, activité..."
              className="pl-8 pr-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs rounded-none w-[200px] outline-none focus:border-[var(--color-accent)] font-sans"
            />
          </div>
        </FilterGroup>
        <FilterGroup label="PAYS">
          <FilterSelect
            value={countryFilter}
            onChange={setCountryFilter}
            options={countries.map(([code, count]) => ({ value: code, label: `${COUNTRY_NAMES[code] || code} (${count})` }))}
            placeholder="Tous"
          />
        </FilterGroup>
        <FilterGroup label="RÉGION">
          <FilterSelect
            value={regionFilter}
            onChange={setRegionFilter}
            options={regionList.map(r => ({ value: r, label: r }))}
            placeholder="Toutes"
          />
        </FilterGroup>
        <FilterGroup label="NACE">
          <FilterSelect
            value={naceFilter}
            onChange={setNaceFilter}
            options={naceOptions}
            placeholder="Tous"
          />
        </FilterGroup>
        <FilterGroup label="CA (k€)">
          <div className="flex gap-1 items-center">
            <RangeInput value={caMin} onChange={setCaMin} placeholder="Min" />
            <span className="text-[var(--color-muted)] text-xs">&ndash;</span>
            <RangeInput value={caMax} onChange={setCaMax} placeholder="Max" />
          </div>
        </FilterGroup>
        <FilterGroup label="EFFECTIF">
          <div className="flex gap-1 items-center">
            <RangeInput value={effMin} onChange={setEffMin} placeholder="Min" />
            <span className="text-[var(--color-muted)] text-xs">&ndash;</span>
            <RangeInput value={effMax} onChange={setEffMax} placeholder="Max" />
          </div>
        </FilterGroup>
        <button
          onClick={() => setUrlOnly(!urlOnly)}
          className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider border transition-colors self-end ${urlOnly ? "bg-[var(--color-accent)] text-[var(--color-bg)] border-[var(--color-accent)]" : "bg-transparent text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-accent)]"}`}
        >
          URL
        </button>
        <div className="flex-1" />
        <button onClick={resetFilters} className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-accent)] border border-[var(--color-border)] transition-colors self-end">
          RESET
        </button>
        <button onClick={exportCSV} className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-[var(--color-accent)] text-[var(--color-bg)] clip-snip-corner-sm flex items-center gap-1.5 self-end">
          <Download size={12} /> EXPORT
        </button>
      </div>

      {/* ── Table + Detail ──────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Table */}
        <div className="flex-1 overflow-auto filter-scrollbar" ref={tableRef}>
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`p-3 text-section-header ${col.width} ${col.sortable ? "cursor-pointer hover:text-[var(--color-accent)]" : ""} ${sortKey === col.key ? "text-[var(--color-accent)]" : ""}`}
                    onClick={col.sortable ? () => handleSort(col.key as SortKey) : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.sortable && (
                        sortKey === col.key
                          ? (sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
                          : <ArrowUpDown size={11} className="opacity-30" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr
                  key={`${r.id}-${page}-${i}`}
                  className={`border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors ${selectedCompany?.id === r.id ? "bg-[var(--color-surface)]" : ""}`}
                  onClick={() => setSelectedCompany(r)}
                >
                  <td className="p-3 font-medium text-[var(--color-accent)] truncate max-w-[260px]" title={r.company_name || ""}>{r.company_name || "—"}</td>
                  <td className="p-3 truncate max-w-[180px]">
                    {r.website ? (
                      <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#3b82f6] hover:underline flex items-center gap-1" title={r.website}>
                        <span className="truncate">{r.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                        <ExternalLink size={10} className="shrink-0 opacity-50" />
                      </a>
                    ) : <span className="text-[var(--color-muted)]">&mdash;</span>}
                  </td>
                  <NumCell value={r.revenue_eur_th} />
                  <NumCell value={r.employees} />
                  <NumCell value={r.ebitda_eur_th} />
                  <td className="p-3 text-[11px] font-mono">{r.country_iso ? `${r.country_iso}` : <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  <td className="p-3 text-[11px] font-mono">{r.nace_core}</td>
                  <td className="p-3 text-[11px]">{r.region || <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  <td className="p-3 text-[11px]">{r.city || <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  <td className="p-3 text-[11px] truncate max-w-[160px]" title={r.guo_name || ""}>{r.guo_name || <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  <td className="p-3 text-[10px] text-[var(--color-muted)] truncate max-w-[300px]" title={r.trade_description || ""}>{r.trade_description || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && !loading && (
            <div className="flex items-center justify-center h-40 text-[var(--color-muted)] text-sm">
              {selectedNode ? "Aucun résultat pour ces filtres." : "Sélectionnez un nœud dans l'arbre."}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedCompany && (
          <div className="w-[360px] border-l border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto filter-scrollbar shrink-0">
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-base font-semibold leading-tight pr-4">{selectedCompany.company_name}</h2>
                <button onClick={() => setSelectedCompany(null)} className="text-[var(--color-muted)] hover:text-[var(--color-accent)] shrink-0"><X size={16} /></button>
              </div>
              {selectedCompany.website && (
                <a href={selectedCompany.website.startsWith("http") ? selectedCompany.website : `https://${selectedCompany.website}`} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] text-xs hover:underline flex items-center gap-1 mb-4">
                  <ExternalLink size={12} />{selectedCompany.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                </a>
              )}
              <div className="space-y-4">
                <DetailSection title="IDENTITÉ">
                  <DetailRow label="Pays" value={selectedCompany.country_iso ? (COUNTRY_NAMES[selectedCompany.country_iso] || selectedCompany.country_iso) : null} />
                  <DetailRow label="Région" value={selectedCompany.region} />
                  <DetailRow label="Ville" value={selectedCompany.city} />
                  <DetailRow label="Groupe" value={selectedCompany.guo_name} />
                  <DetailRow label="Pays groupe" value={selectedCompany.guo_country_iso ? (COUNTRY_NAMES[selectedCompany.guo_country_iso] || selectedCompany.guo_country_iso) : null} />
                  <DetailRow label="ID national" value={selectedCompany.national_id} />
                  <DetailRow label="NACE" value={selectedCompany.nace_core} />
                  {selectedCompany.nace_secondary && <DetailRow label="NACE sec." value={selectedCompany.nace_secondary} />}
                </DetailSection>
                <DetailSection title="FINANCIER">
                  <DetailRow label="CA" value={selectedCompany.revenue_eur_th !== null ? `${selectedCompany.revenue_eur_th.toLocaleString("fr-FR")} k€` : null} />
                  <DetailRow label="EBITDA" value={selectedCompany.ebitda_eur_th !== null ? `${selectedCompany.ebitda_eur_th.toLocaleString("fr-FR")} k€` : null} />
                  <DetailRow label="Effectif" value={selectedCompany.employees !== null ? selectedCompany.employees.toLocaleString("fr-FR") : null} />
                  <DetailRow label="Sites" value={selectedCompany.nb_branches != null && selectedCompany.nb_branches > 0 ? String(selectedCompany.nb_branches) : null} />
                  <DetailRow label="Filiales" value={selectedCompany.nb_subsidiaries != null && selectedCompany.nb_subsidiaries > 0 ? String(selectedCompany.nb_subsidiaries) : null} />
                </DetailSection>
                <DetailSection title="ACTIVITÉ">
                  {selectedCompany.trade_description && <p className="text-xs text-[var(--color-accent)] leading-relaxed">{selectedCompany.trade_description}</p>}
                </DetailSection>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────── */}
      <div className="h-9 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center px-6 justify-between shrink-0">
        <span className="text-[10px] font-mono text-[var(--color-muted)]">
          {total.toLocaleString("fr-FR")} résultats
          {total !== stats.totalAll && ` / ${stats.totalAll.toLocaleString("fr-FR")} total`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => { setPage(page - 1); tableRef.current?.scrollTo(0, 0); }} className="p-1 text-[var(--color-muted)] hover:text-[var(--color-accent)] disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="text-[10px] font-mono text-[var(--color-muted)]">{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => { setPage(page + 1); tableRef.current?.scrollTo(0, 0); }} className="p-1 text-[var(--color-muted)] hover:text-[var(--color-accent)] disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function StatChip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--color-muted)]">{label}</span>
      <span className="text-xs font-semibold text-[var(--color-accent)]">{value}</span>
      {sub && <span className="text-[10px] text-[var(--color-muted)]">{sub}</span>}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--color-muted)]">{label}</label>
      {children}
    </div>
  );
}

function FilterSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="py-1.5 px-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs rounded-none outline-none focus:border-[var(--color-accent)] font-sans min-w-[120px] appearance-none">
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function RangeInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-[60px] py-1.5 px-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs rounded-none outline-none focus:border-[var(--color-accent)] font-mono" />;
}

function NumCell({ value }: { value: number | null | undefined }) {
  return <td className="p-3 font-mono text-right">{value != null && typeof value === "number" ? value.toLocaleString("fr-FR") : <span className="text-[var(--color-muted)]">&mdash;</span>}</td>;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-section-header mb-2 pb-1 border-b border-[var(--color-border)]">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-[var(--color-muted)] shrink-0 w-[80px]">{label}</span>
      <span className="text-[var(--color-accent)] truncate" title={value}>{value}</span>
    </div>
  );
}
