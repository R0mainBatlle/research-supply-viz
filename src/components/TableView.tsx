"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Search, Download, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/store/useStore";

// ── Types ──────────────────────────────────────────────────────
interface Entreprise {
  raison_sociale: string | null;
  filiere: string | null;
  url_site_web: string | null;
  ca_meur: number | null;
  effectif_total: number | null;
  ebitda_meur: number | null;
  ville_siege: string | null;
  region_siege: string | null;
  code_naf: string | null;
  description_activite: string | null;
  groupe_appartenance: string | null;
  pays_groupe: string | null;
  profil_conversion: string | null;
  source_data: string | null;
  siren: string | null;
  nb_sites_production: number | null;
  forme_juridique: string | null;
  produits_fabriques: string | null;
  score_convertibilite: number | null;
  certifications: string | null;
  capacites_industrielles: string | null;
  produits_defense_potentiels: string | null;
}

type SortKey = "raison_sociale" | "ca_meur" | "effectif_total" | "ebitda_meur" | "filiere" | "region_siege" | "ville_siege" | "score_convertibilite";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 100;

const COLUMNS: { key: string; label: string; sortable: boolean; width: string; numeric?: boolean }[] = [
  { key: "raison_sociale", label: "ENTREPRISE", sortable: true, width: "min-w-[200px] max-w-[240px]" },
  { key: "url_site_web", label: "SITE WEB", sortable: false, width: "min-w-[140px] max-w-[180px]" },
  { key: "ca_meur", label: "CA (M\u20ac)", sortable: true, width: "min-w-[90px]", numeric: true },
  { key: "effectif_total", label: "EFFECTIF", sortable: true, width: "min-w-[90px]", numeric: true },
  { key: "ebitda_meur", label: "EBITDA (M\u20ac)", sortable: true, width: "min-w-[100px]", numeric: true },
  { key: "filiere", label: "FILI\u00c8RE", sortable: true, width: "min-w-[160px] max-w-[180px]" },
  { key: "region_siege", label: "R\u00c9GION", sortable: true, width: "min-w-[120px]" },
  { key: "ville_siege", label: "VILLE", sortable: true, width: "min-w-[100px]" },
  { key: "groupe_appartenance", label: "GROUPE", sortable: false, width: "min-w-[130px] max-w-[160px]" },
  { key: "profil_conversion", label: "PROFIL", sortable: false, width: "min-w-[100px]" },
  { key: "source_data", label: "SOURCE", sortable: false, width: "min-w-[80px]" },
  { key: "description_activite", label: "ACTIVIT\u00c9", sortable: false, width: "min-w-[200px] max-w-[280px]" },
];

// ── Main component ─────────────────────────────────────────────
export function TableView() {
  const [data, setData] = useState<Entreprise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Shared filters from store
  const store = useStore();
  const {
    searchQuery, setSearchQuery,
    filiere: activeFilieres, setFiliere,
    region: activeRegions, setRegion,
    profil: activeProfils, setProfil,
    caMin, setCaMin, caMax, setCaMax,
    effMin, setEffMin, effMax, setEffMax,
    urlOnly, setUrlOnly,
    filterSource, setFilterSource,
    resetFilters,
  } = store;

  // Sort (local — sort order doesn't need to sync to map)
  const [sortKey, setSortKey] = useState<SortKey>("ca_meur");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Pagination
  const [page, setPage] = useState(0);

  // Detail panel
  const [selected, setSelected] = useState<Entreprise | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);

  // Load full dataset
  useEffect(() => {
    fetch("/data/companies_unified.json")
      .then((r) => r.json())
      .then((d: Entreprise[]) => {
        setData(d);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load data", err);
        setIsLoading(false);
      });
  }, []);

  // Unique values for dropdowns
  const filieres = useMemo(() => [...new Set(data.map((r) => r.filiere).filter(Boolean))].sort() as string[], [data]);
  const regions = useMemo(() => [...new Set(data.map((r) => r.region_siege).filter(Boolean))].sort() as string[], [data]);
  const profils = useMemo(() => [...new Set(data.map((r) => r.profil_conversion).filter(Boolean))].sort() as string[], [data]);
  const sources = useMemo(() => [...new Set(data.map((r) => r.source_data).filter(Boolean))].sort() as string[], [data]);

  // Dropdown values: show single selection or "" for none/multiple
  const filiereDropdown = activeFilieres.length === 1 ? activeFilieres[0] : "";
  const regionDropdown = activeRegions.length === 1 ? activeRegions[0] : "";
  const profilDropdown = activeProfils.length === 1 ? activeProfils[0] : "";

  // Filter + Sort
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const result = data.filter((r) => {
      if (q) {
        const hay = [r.raison_sociale, r.ville_siege, r.description_activite, r.groupe_appartenance, r.produits_fabriques]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (activeFilieres.length > 0 && r.filiere && !activeFilieres.includes(r.filiere)) return false;
      if (activeRegions.length > 0 && r.region_siege && !activeRegions.includes(r.region_siege)) return false;
      if (activeProfils.length > 0 && r.profil_conversion && !activeProfils.includes(r.profil_conversion)) return false;
      if (filterSource && r.source_data !== filterSource) return false;
      if (urlOnly && !r.url_site_web) return false;

      const caMinN = caMin ? parseFloat(caMin) : null;
      const caMaxN = caMax ? parseFloat(caMax) : null;
      if (caMinN !== null && (r.ca_meur === null || r.ca_meur < caMinN)) return false;
      if (caMaxN !== null && (r.ca_meur === null || r.ca_meur > caMaxN)) return false;

      const effMinN = effMin ? parseFloat(effMin) : null;
      const effMaxN = effMax ? parseFloat(effMax) : null;
      if (effMinN !== null && (r.effectif_total === null || r.effectif_total < effMinN)) return false;
      if (effMaxN !== null && (r.effectif_total === null || r.effectif_total > effMaxN)) return false;

      return true;
    });

    result.sort((a, b) => {
      const aVal = a[sortKey as keyof Entreprise];
      const bVal = b[sortKey as keyof Entreprise];
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortDir === "asc" ? -1 : 1;
      if (aStr > bStr) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, searchQuery, activeFilieres, activeRegions, activeProfils, filterSource, urlOnly, caMin, caMax, effMin, effMax, sortKey, sortDir]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [searchQuery, activeFilieres, activeRegions, activeProfils, filterSource, urlOnly, caMin, caMax, effMin, effMax, sortKey, sortDir]);

  const pageData = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Stats
  const stats = useMemo(() => {
    const withUrl = filtered.filter((r) => r.url_site_web).length;
    const totalCa = filtered.reduce((acc, r) => acc + (r.ca_meur || 0), 0);
    const totalEff = filtered.reduce((acc, r) => acc + (r.effectif_total || 0), 0);
    return { withUrl, totalCa, totalEff };
  }, [filtered]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "raison_sociale" || key === "filiere" || key === "region_siege" || key === "ville_siege" ? "asc" : "desc");
    }
  }, [sortKey]);

  const exportCSV = () => {
    const headers = ["raison_sociale", "filiere", "url_site_web", "ca_meur", "effectif_total", "ebitda_meur", "ville_siege", "region_siege", "siren", "groupe_appartenance", "description_activite", "profil_conversion", "source_data"];
    let csv = headers.join(",") + "\n";
    filtered.forEach((r) => {
      csv += headers.map((h) => {
        const v = r[h as keyof Entreprise];
        if (v === null || v === undefined) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",") + "\n";
    });
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `research_supply_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-section-header animate-pulse">CHARGEMENT DE LA BASE...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* ── Stats bar ───────────────────────────────────── */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2 flex items-center gap-6 shrink-0">
        <StatChip label="ENTREPRISES" value={filtered.length.toLocaleString("fr-FR")} sub={`/ ${data.length.toLocaleString("fr-FR")}`} />
        <StatChip label="AVEC SITE WEB" value={`${stats.withUrl.toLocaleString("fr-FR")}`} sub={`(${filtered.length > 0 ? Math.round((stats.withUrl / filtered.length) * 100) : 0}%)`} />
        <StatChip label="CA CUMUL\u00c9" value={`${stats.totalCa.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} M\u20ac`} />
        <StatChip label="EFFECTIF TOTAL" value={stats.totalEff.toLocaleString("fr-FR")} />
      </div>

      {/* ── Filter bar ──────────────────────────────────── */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2.5 flex gap-3 flex-wrap items-end shrink-0">
        <FilterGroup label="RECHERCHE">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom, ville, activit\u00e9..."
              className="pl-8 pr-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs rounded-none w-[200px] outline-none focus:border-[var(--color-accent)] font-sans"
            />
          </div>
        </FilterGroup>
        <FilterGroup label="FILI\u00c8RE">
          <FilterSelect value={filiereDropdown} onChange={(v) => setFiliere(v ? [v] : [])} options={filieres} placeholder={activeFilieres.length > 1 ? `${activeFilieres.length} filières` : "Toutes"} />
        </FilterGroup>
        <FilterGroup label="R\u00c9GION">
          <FilterSelect value={regionDropdown} onChange={(v) => setRegion(v ? [v] : [])} options={regions} placeholder={activeRegions.length > 1 ? `${activeRegions.length} régions` : "Toutes"} />
        </FilterGroup>
        <FilterGroup label="PROFIL">
          <FilterSelect value={profilDropdown} onChange={(v) => setProfil(v ? [v] : [])} options={profils} placeholder={activeProfils.length > 1 ? `${activeProfils.length} profils` : "Tous"} />
        </FilterGroup>
        <FilterGroup label="SOURCE">
          <FilterSelect value={filterSource} onChange={setFilterSource} options={sources} placeholder="Toutes" />
        </FilterGroup>
        <FilterGroup label="CA (M\u20ac)">
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
              {pageData.map((r, i) => (
                <tr
                  key={`${r.siren || ""}-${page}-${i}`}
                  className={`border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors ${selected === r ? "bg-[var(--color-surface)]" : ""}`}
                  onClick={() => setSelected(r)}
                >
                  <td className="p-3 font-medium text-[var(--color-accent)] truncate max-w-[240px]" title={r.raison_sociale || ""}>{r.raison_sociale || "\u2014"}</td>
                  <td className="p-3 truncate max-w-[180px]">
                    {r.url_site_web ? (
                      <a href={r.url_site_web} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#3b82f6] hover:underline flex items-center gap-1" title={r.url_site_web}>
                        <span className="truncate">{r.url_site_web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                        <ExternalLink size={10} className="shrink-0 opacity-50" />
                      </a>
                    ) : <span className="text-[var(--color-muted)]">&mdash;</span>}
                  </td>
                  <NumCell value={r.ca_meur} />
                  <NumCell value={r.effectif_total} />
                  <NumCell value={r.ebitda_meur} />
                  <td className="p-3 text-[11px] text-[var(--color-muted)] truncate max-w-[180px]" title={r.filiere || ""}>{r.filiere || "\u2014"}</td>
                  <td className="p-3 text-[11px]">{r.region_siege || <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  <td className="p-3 text-[11px]">{r.ville_siege || <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  <td className="p-3 text-[11px] truncate max-w-[160px]" title={r.groupe_appartenance || ""}>{r.groupe_appartenance || <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  <td className="p-3">{r.profil_conversion ? <ProfilBadge profil={r.profil_conversion} /> : <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  <td className="p-3">{r.source_data ? <SourceBadge source={r.source_data} /> : null}</td>
                  <td className="p-3 text-[10px] text-[var(--color-muted)] truncate max-w-[280px]" title={r.description_activite || ""}>{r.description_activite || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-40 text-[var(--color-muted)] text-sm">Aucun r&eacute;sultat pour ces filtres.</div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-[360px] border-l border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto filter-scrollbar shrink-0">
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-base font-semibold leading-tight pr-4">{selected.raison_sociale}</h2>
                <button onClick={() => setSelected(null)} className="text-[var(--color-muted)] hover:text-[var(--color-accent)] shrink-0"><X size={16} /></button>
              </div>
              {selected.url_site_web && (
                <a href={selected.url_site_web} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] text-xs hover:underline flex items-center gap-1 mb-4">
                  <ExternalLink size={12} />{selected.url_site_web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                </a>
              )}
              <div className="space-y-4">
                <DetailSection title="IDENTIT\u00c9">
                  <DetailRow label="Fili\u00e8re" value={selected.filiere} />
                  <DetailRow label="R\u00e9gion" value={selected.region_siege} />
                  <DetailRow label="Ville" value={selected.ville_siege} />
                  <DetailRow label="Groupe" value={selected.groupe_appartenance} />
                  <DetailRow label="Pays groupe" value={selected.pays_groupe} />
                  <DetailRow label="Forme jur." value={selected.forme_juridique} />
                  <DetailRow label="SIREN" value={selected.siren} link={selected.siren ? `https://www.societe.com/societe/-${selected.siren}.html` : undefined} />
                  <DetailRow label="NAF" value={selected.code_naf} />
                </DetailSection>
                <DetailSection title="FINANCIER">
                  <DetailRow label="CA" value={selected.ca_meur !== null ? `${selected.ca_meur.toLocaleString("fr-FR")} M\u20ac` : null} />
                  <DetailRow label="EBITDA" value={selected.ebitda_meur !== null ? `${selected.ebitda_meur.toLocaleString("fr-FR")} M\u20ac` : null} />
                  <DetailRow label="Effectif" value={selected.effectif_total !== null ? selected.effectif_total.toLocaleString("fr-FR") : null} />
                  <DetailRow label="Sites" value={selected.nb_sites_production !== null ? String(selected.nb_sites_production) : null} />
                </DetailSection>
                <DetailSection title="ACTIVIT\u00c9">
                  {selected.description_activite && <p className="text-xs text-[var(--color-accent)] leading-relaxed">{selected.description_activite}</p>}
                  <DetailRow label="Produits" value={selected.produits_fabriques} />
                  <DetailRow label="Certifs" value={selected.certifications} />
                  <DetailRow label="Capacit\u00e9s" value={selected.capacites_industrielles} />
                </DetailSection>
                <DetailSection title="D\u00c9FENSE">
                  <DetailRow label="Profil" value={selected.profil_conversion} />
                  <DetailRow label="Score" value={selected.score_convertibilite !== null ? String(selected.score_convertibilite) : null} />
                  <DetailRow label="Potentiel" value={selected.produits_defense_potentiels} />
                </DetailSection>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────── */}
      <div className="h-9 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center px-6 justify-between shrink-0">
        <span className="text-[10px] font-mono text-[var(--color-muted)]">
          {filtered.length.toLocaleString("fr-FR")} r\u00e9sultats
          {filtered.length !== data.length && ` / ${data.length.toLocaleString("fr-FR")} total`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => { setPage((p) => p - 1); tableRef.current?.scrollTo(0, 0); }} className="p-1 text-[var(--color-muted)] hover:text-[var(--color-accent)] disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="text-[10px] font-mono text-[var(--color-muted)]">{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => { setPage((p) => p + 1); tableRef.current?.scrollTo(0, 0); }} className="p-1 text-[var(--color-muted)] hover:text-[var(--color-accent)] disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

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

function FilterSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="py-1.5 px-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs rounded-none outline-none focus:border-[var(--color-accent)] font-sans min-w-[120px] appearance-none">
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function RangeInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-[60px] py-1.5 px-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs rounded-none outline-none focus:border-[var(--color-accent)] font-mono" />;
}

function NumCell({ value }: { value: number | null | undefined }) {
  return <td className="p-3 font-mono text-right">{value != null && typeof value === "number" ? value.toLocaleString("fr-FR") : <span className="text-[var(--color-muted)]">&mdash;</span>}</td>;
}

function ProfilBadge({ profil }: { profil: string }) {
  const colors: Record<string, string> = { civil_pur: "text-[#60a5fa] border-[#60a5fa44]", civil_diversifie: "text-[#fbbf24] border-[#fbbf2444]", dual_use: "text-[#fb923c] border-[#fb923c44]", bitd: "text-[#f87171] border-[#f8717144]" };
  return <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border ${colors[profil] || "text-[var(--color-muted)] border-[var(--color-border)]"}`}>{profil.replace("_", " ")}</span>;
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = { orbis: "text-[#818cf8]", "orbis+db": "text-[#4ade80]", db_only: "text-[#a78bfa]" };
  return <span className={`text-[9px] font-mono uppercase tracking-wider ${colors[source] || "text-[var(--color-muted)]"}`}>{source}</span>;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-section-header mb-2 pb-1 border-b border-[var(--color-border)]">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, link }: { label: string; value: string | null | undefined; link?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-[var(--color-muted)] shrink-0 w-[80px]">{label}</span>
      {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline truncate">{value}</a> : <span className="text-[var(--color-accent)] truncate" title={value}>{value}</span>}
    </div>
  );
}
