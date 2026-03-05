"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Search, Download, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight } from "lucide-react";

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

// ── Column definitions ─────────────────────────────────────────
const COLUMNS: { key: SortKey | "url_site_web" | "groupe_appartenance" | "source_data" | "profil_conversion" | "description_activite"; label: string; sortable: boolean; width: string; numeric?: boolean }[] = [
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

// ── Page component ─────────────────────────────────────────────
export default function VizPage() {
  const [data, setData] = useState<Entreprise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterFiliere, setFilterFiliere] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterProfil, setFilterProfil] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [caMin, setCaMin] = useState("");
  const [caMax, setCaMax] = useState("");
  const [effMin, setEffMin] = useState("");
  const [effMax, setEffMax] = useState("");
  const [urlOnly, setUrlOnly] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("ca_meur");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Pagination
  const [page, setPage] = useState(0);

  // Detail panel
  const [selected, setSelected] = useState<Entreprise | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);

  // Load data
  useEffect(() => {
    fetch("/data/companies_full.json")
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

  // Unique values for filter dropdowns
  const filieres = useMemo(() => [...new Set(data.map((r) => r.filiere).filter(Boolean))].sort() as string[], [data]);
  const regions = useMemo(() => [...new Set(data.map((r) => r.region_siege).filter(Boolean))].sort() as string[], [data]);
  const profils = useMemo(() => [...new Set(data.map((r) => r.profil_conversion).filter(Boolean))].sort() as string[], [data]);
  const sources = useMemo(() => [...new Set(data.map((r) => r.source_data).filter(Boolean))].sort() as string[], [data]);

  // Filter + Sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = data.filter((r) => {
      if (q) {
        const hay = [r.raison_sociale, r.ville_siege, r.description_activite, r.groupe_appartenance, r.produits_fabriques]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterFiliere && r.filiere !== filterFiliere) return false;
      if (filterRegion && r.region_siege !== filterRegion) return false;
      if (filterProfil && r.profil_conversion !== filterProfil) return false;
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

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
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
  }, [data, search, filterFiliere, filterRegion, filterProfil, filterSource, urlOnly, caMin, caMax, effMin, effMax, sortKey, sortDir]);

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [search, filterFiliere, filterRegion, filterProfil, filterSource, urlOnly, caMin, caMax, effMin, effMax, sortKey, sortDir]);

  // Paginated slice
  const pageData = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Stats
  const stats = useMemo(() => {
    const withUrl = filtered.filter((r) => r.url_site_web).length;
    const totalCa = filtered.reduce((acc, r) => acc + (r.ca_meur || 0), 0);
    const totalEff = filtered.reduce((acc, r) => acc + (r.effectif_total || 0), 0);
    return { withUrl, totalCa, totalEff };
  }, [filtered]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir(key === "raison_sociale" || key === "filiere" || key === "region_siege" || key === "ville_siege" ? "asc" : "desc");
      }
    },
    [sortKey]
  );

  const resetFilters = () => {
    setSearch("");
    setFilterFiliere("");
    setFilterRegion("");
    setFilterProfil("");
    setFilterSource("");
    setCaMin("");
    setCaMax("");
    setEffMin("");
    setEffMax("");
    setUrlOnly(false);
  };

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
      <main className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
        <div className="text-section-header animate-pulse">CHARGEMENT DE LA BASE...</div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-[var(--color-bg)]">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="h-14 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <a href="/" className="font-mono text-xs tracking-[0.3em] uppercase hover:text-[var(--color-muted)] transition-colors">
            LE_VECTOR
          </a>
          <div className="h-4 w-px bg-[var(--color-border)]" />
          <span className="text-sm tracking-tight">BASE INDUSTRIELLE</span>
        </div>
        <div className="flex items-center gap-6">
          <Metric label="ENTREPRISES" value={filtered.length.toLocaleString("fr-FR")} />
          <Metric label="AVEC SITE WEB" value={`${stats.withUrl.toLocaleString("fr-FR")} (${filtered.length > 0 ? Math.round((stats.withUrl / filtered.length) * 100) : 0}%)`} />
          <Metric label="CA CUMUL\u00c9" value={`${stats.totalCa.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} M\u20ac`} />
          <Metric label="EFFECTIF TOTAL" value={stats.totalEff.toLocaleString("fr-FR")} />
        </div>
      </header>

      {/* ── Filter bar ──────────────────────────────────── */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 flex gap-3 flex-wrap items-end shrink-0">
        <FilterGroup label="RECHERCHE">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, ville, activit\u00e9..."
              className="pl-8 pr-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs rounded-none w-[200px] outline-none focus:border-[var(--color-accent)] font-sans"
            />
          </div>
        </FilterGroup>

        <FilterGroup label="FILI\u00c8RE">
          <Select value={filterFiliere} onChange={setFilterFiliere} options={filieres} placeholder="Toutes" />
        </FilterGroup>

        <FilterGroup label="R\u00c9GION">
          <Select value={filterRegion} onChange={setFilterRegion} options={regions} placeholder="Toutes" />
        </FilterGroup>

        <FilterGroup label="PROFIL">
          <Select value={filterProfil} onChange={setFilterProfil} options={profils} placeholder="Tous" />
        </FilterGroup>

        <FilterGroup label="SOURCE">
          <Select value={filterSource} onChange={setFilterSource} options={sources} placeholder="Toutes" />
        </FilterGroup>

        <FilterGroup label="CA (M\u20ac)">
          <div className="flex gap-1 items-center">
            <input type="number" value={caMin} onChange={(e) => setCaMin(e.target.value)} placeholder="Min" className="w-[60px] py-1.5 px-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs rounded-none outline-none focus:border-[var(--color-accent)] font-mono" />
            <span className="text-[var(--color-muted)] text-xs">&ndash;</span>
            <input type="number" value={caMax} onChange={(e) => setCaMax(e.target.value)} placeholder="Max" className="w-[60px] py-1.5 px-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs rounded-none outline-none focus:border-[var(--color-accent)] font-mono" />
          </div>
        </FilterGroup>

        <FilterGroup label="EFFECTIF">
          <div className="flex gap-1 items-center">
            <input type="number" value={effMin} onChange={(e) => setEffMin(e.target.value)} placeholder="Min" className="w-[60px] py-1.5 px-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs rounded-none outline-none focus:border-[var(--color-accent)] font-mono" />
            <span className="text-[var(--color-muted)] text-xs">&ndash;</span>
            <input type="number" value={effMax} onChange={(e) => setEffMax(e.target.value)} placeholder="Max" className="w-[60px] py-1.5 px-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs rounded-none outline-none focus:border-[var(--color-accent)] font-mono" />
          </div>
        </FilterGroup>

        <div className="flex items-center gap-2 self-end pb-0.5">
          <button
            onClick={() => setUrlOnly(!urlOnly)}
            className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider border transition-colors ${urlOnly ? "bg-[var(--color-accent)] text-[var(--color-bg)] border-[var(--color-accent)]" : "bg-transparent text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-accent)]"}`}
          >
            URL
          </button>
        </div>

        <div className="flex-1" />

        <button onClick={resetFilters} className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-accent)] border border-[var(--color-border)] transition-colors self-end">
          RESET
        </button>
        <button onClick={exportCSV} className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-[var(--color-accent)] text-[var(--color-bg)] clip-snip-corner-sm flex items-center gap-1.5 self-end">
          <Download size={12} /> EXPORT CSV
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
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
                        sortKey === col.key ? (
                          sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                        ) : (
                          <ArrowUpDown size={11} className="opacity-30" />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => (
                <tr
                  key={`${r.siren || ""}-${i}`}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
                  onClick={() => setSelected(r)}
                >
                  {/* Entreprise */}
                  <td className="p-3 font-medium text-[var(--color-accent)] truncate max-w-[240px]" title={r.raison_sociale || ""}>
                    {r.raison_sociale || "\u2014"}
                  </td>
                  {/* URL */}
                  <td className="p-3 truncate max-w-[180px]">
                    {r.url_site_web ? (
                      <a
                        href={r.url_site_web}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#3b82f6] hover:underline flex items-center gap-1"
                        title={r.url_site_web}
                      >
                        <span className="truncate">{r.url_site_web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                        <ExternalLink size={10} className="shrink-0 opacity-50" />
                      </a>
                    ) : (
                      <span className="text-[var(--color-muted)]">&mdash;</span>
                    )}
                  </td>
                  {/* CA */}
                  <td className="p-3 font-mono text-right">{r.ca_meur !== null ? r.ca_meur.toLocaleString("fr-FR") : <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  {/* Effectif */}
                  <td className="p-3 font-mono text-right">{r.effectif_total !== null ? r.effectif_total.toLocaleString("fr-FR") : <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  {/* EBITDA */}
                  <td className="p-3 font-mono text-right">{r.ebitda_meur !== null ? r.ebitda_meur.toLocaleString("fr-FR") : <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  {/* Filiere */}
                  <td className="p-3 text-[11px] text-[var(--color-muted)] truncate max-w-[180px]" title={r.filiere || ""}>{r.filiere || "\u2014"}</td>
                  {/* Region */}
                  <td className="p-3 text-[11px]">{r.region_siege || <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  {/* Ville */}
                  <td className="p-3 text-[11px]">{r.ville_siege || <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  {/* Groupe */}
                  <td className="p-3 text-[11px] truncate max-w-[160px]" title={r.groupe_appartenance || ""}>{r.groupe_appartenance || <span className="text-[var(--color-muted)]">&mdash;</span>}</td>
                  {/* Profil */}
                  <td className="p-3">
                    {r.profil_conversion ? <ProfilBadge profil={r.profil_conversion} /> : <span className="text-[var(--color-muted)]">&mdash;</span>}
                  </td>
                  {/* Source */}
                  <td className="p-3">
                    {r.source_data ? <SourceBadge source={r.source_data} /> : null}
                  </td>
                  {/* Activite */}
                  <td className="p-3 text-[10px] text-[var(--color-muted)] truncate max-w-[280px]" title={r.description_activite || ""}>{r.description_activite || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-40 text-[var(--color-muted)] text-sm">
              Aucun r&eacute;sultat pour ces filtres.
            </div>
          )}
        </div>

        {/* ── Detail panel ──────────────────────────────── */}
        {selected && (
          <div className="w-[380px] border-l border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto filter-scrollbar shrink-0">
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-base font-semibold leading-tight pr-4">{selected.raison_sociale}</h2>
                <button onClick={() => setSelected(null)} className="text-[var(--color-muted)] hover:text-[var(--color-accent)]">
                  <X size={16} />
                </button>
              </div>

              {selected.url_site_web && (
                <a
                  href={selected.url_site_web}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3b82f6] text-xs hover:underline flex items-center gap-1 mb-4"
                >
                  <ExternalLink size={12} />
                  {selected.url_site_web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                </a>
              )}

              <div className="space-y-4">
                <DetailSection title="IDENTIT\u00c9">
                  <DetailRow label="Fili\u00e8re" value={selected.filiere} />
                  <DetailRow label="R\u00e9gion" value={selected.region_siege} />
                  <DetailRow label="Ville" value={selected.ville_siege} />
                  <DetailRow label="Groupe" value={selected.groupe_appartenance} />
                  <DetailRow label="Pays groupe" value={selected.pays_groupe} />
                  <DetailRow label="Forme juridique" value={selected.forme_juridique} />
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
                  <DetailText value={selected.description_activite} />
                  <DetailRow label="Produits" value={selected.produits_fabriques} />
                  <DetailRow label="Certifications" value={selected.certifications} />
                  <DetailRow label="Capacit\u00e9s" value={selected.capacites_industrielles} />
                </DetailSection>

                <DetailSection title="D\u00c9FENSE">
                  <DetailRow label="Profil" value={selected.profil_conversion} />
                  <DetailRow label="Score" value={selected.score_convertibilite !== null ? String(selected.score_convertibilite) : null} />
                  <DetailRow label="Potentiel" value={selected.produits_defense_potentiels} />
                </DetailSection>

                <DetailSection title="M\u00c9TA">
                  <DetailRow label="Source" value={selected.source_data} />
                </DetailSection>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Pagination footer ───────────────────────────── */}
      <div className="h-10 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center px-6 justify-between shrink-0">
        <span className="text-[10px] font-mono text-[var(--color-muted)]">
          {filtered.length.toLocaleString("fr-FR")} r&eacute;sultats
          {filtered.length !== data.length && ` / ${data.length.toLocaleString("fr-FR")} total`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => { setPage((p) => p - 1); tableRef.current?.scrollTo(0, 0); }}
              className="p-1 text-[var(--color-muted)] hover:text-[var(--color-accent)] disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] font-mono text-[var(--color-muted)]">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => { setPage((p) => p + 1); tableRef.current?.scrollTo(0, 0); }}
              className="p-1 text-[var(--color-muted)] hover:text-[var(--color-accent)] disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[9px] text-[var(--color-muted)] font-mono tracking-widest">{label}</span>
      <span className="text-xs font-semibold text-[var(--color-accent)]">{value}</span>
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

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="py-1.5 px-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs rounded-none outline-none focus:border-[var(--color-accent)] font-sans min-w-[120px] appearance-none"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function ProfilBadge({ profil }: { profil: string }) {
  const colors: Record<string, string> = {
    civil_pur: "text-[#60a5fa] border-[#60a5fa44]",
    civil_diversifie: "text-[#fbbf24] border-[#fbbf2444]",
    dual_use: "text-[#fb923c] border-[#fb923c44]",
    bitd: "text-[#f87171] border-[#f8717144]",
  };
  return (
    <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border ${colors[profil] || "text-[var(--color-muted)] border-[var(--color-border)]"}`}>
      {profil.replace("_", " ")}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    orbis: "text-[#818cf8]",
    "orbis+db": "text-[#4ade80]",
    db_only: "text-[#a78bfa]",
  };
  return (
    <span className={`text-[9px] font-mono uppercase tracking-wider ${colors[source] || "text-[var(--color-muted)]"}`}>
      {source}
    </span>
  );
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
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline truncate">
          {value}
        </a>
      ) : (
        <span className="text-[var(--color-accent)] truncate" title={value}>{value}</span>
      )}
    </div>
  );
}

function DetailText({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  return <p className="text-xs text-[var(--color-accent)] leading-relaxed">{value}</p>;
}
