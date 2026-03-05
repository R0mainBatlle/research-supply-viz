import { create } from 'zustand';
import { TreeNode, CompanyEU, MapCompany } from '@/types';
import { loadGeocodeLookup, geocodeCity } from '@/lib/geocode';
import { companyEUToMapCompany } from '@/lib/mapCompany';

type SortKey = "company_name" | "country_iso" | "nace_core" | "employees" | "revenue_eur_th" | "ebitda_eur_th" | "city" | "region" | "guo_name";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "map";

interface Stats {
    total: number;
    totalAll: number;
    withUrl: number;
    totalRevenue: number;
    totalEmployees: number;
    uniqueCountries: number;
    byNace: Record<string, number>;
}

interface DefenseState {
    tree: TreeNode | null;

    // View
    viewMode: ViewMode;

    // Server-side paginated results (table)
    results: CompanyEU[];
    total: number;
    stats: Stats;
    loading: boolean;

    // Map data
    mapCompanies: MapCompany[];
    mapLoading: boolean;
    selectedMapCompany: MapCompany | null;

    // Dropdown data
    countries: [string, number][];
    regions: string[];

    selectedNode: TreeNode | null;
    selectedCompany: CompanyEU | null;

    // Filters
    searchQuery: string;
    countryFilter: string;
    regionFilter: string;
    caMin: string;
    caMax: string;
    effMin: string;
    effMax: string;
    urlOnly: boolean;

    // Sort
    sortKey: SortKey;
    sortDir: SortDir;

    // Pagination
    page: number;

    // Actions
    setTree: (t: TreeNode) => void;
    setViewMode: (m: ViewMode) => void;
    setSelectedNode: (n: TreeNode | null) => void;
    setSelectedCompany: (c: CompanyEU | null) => void;
    setSelectedMapCompany: (c: MapCompany | null) => void;
    setSearchQuery: (q: string) => void;
    setCountryFilter: (c: string) => void;
    setRegionFilter: (r: string) => void;
    setCaMin: (v: string) => void;
    setCaMax: (v: string) => void;
    setEffMin: (v: string) => void;
    setEffMax: (v: string) => void;
    setUrlOnly: (v: boolean) => void;
    setSortKey: (k: SortKey) => void;
    setPage: (p: number) => void;
    resetFilters: () => void;

    // Server fetch actions
    fetchResults: () => Promise<void>;
    fetchStats: () => Promise<void>;
    fetchFilters: () => Promise<void>;
    fetchMapResults: () => Promise<void>;
}

export type { SortKey, SortDir, Stats, ViewMode };

function collectNaceCodes(node: TreeNode): string[] {
    if (node.nace_codes) return node.nace_codes;
    const codes = new Set<string>();
    for (const child of node.children || []) {
        for (const code of collectNaceCodes(child)) codes.add(code);
    }
    return Array.from(codes);
}

const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';

function apiFetch(path: string): Promise<Response> {
    const headers: Record<string, string> = {};
    if (API_TOKEN) headers['Authorization'] = `Bearer ${API_TOKEN}`;
    return fetch(path, { headers });
}

function buildBarParams(state: DefenseState): URLSearchParams {
    const p = new URLSearchParams();
    if (state.countryFilter) p.set('country', state.countryFilter);
    if (state.regionFilter) p.set('region', state.regionFilter);
    if (state.searchQuery.trim()) p.set('q', state.searchQuery.trim());
    if (state.effMin) p.set('effMin', state.effMin);
    if (state.effMax) p.set('effMax', state.effMax);
    if (state.caMin) p.set('caMin', state.caMin);
    if (state.caMax) p.set('caMax', state.caMax);
    if (state.urlOnly) p.set('urlOnly', '1');
    return p;
}

/** Fetch all pages for map display (pageSize=500, parallel batches) */
async function fetchAllPages(baseParams: URLSearchParams): Promise<CompanyEU[]> {
    baseParams.set('pageSize', '500');
    baseParams.set('page', '0');
    baseParams.set('sort', 'employees');
    baseParams.set('dir', 'desc');

    // First page to get total
    const res = await apiFetch(`/api/companies?${baseParams}`);
    const first = await res.json();
    const all: CompanyEU[] = first.data;
    const total: number = first.total;

    if (total <= 500) return all;

    // Cap at 5000 companies for map performance
    const maxPages = Math.min(Math.ceil(total / 500), 10);
    const remaining = Array.from({ length: maxPages - 1 }, (_, i) => i + 1);

    const batches = await Promise.all(
        remaining.map(async (page) => {
            const p = new URLSearchParams(baseParams);
            p.set('page', String(page));
            const r = await apiFetch(`/api/companies?${p}`);
            const json = await r.json();
            return json.data as CompanyEU[];
        })
    );

    for (const batch of batches) all.push(...batch);
    return all;
}

export const useDefenseStore = create<DefenseState>((set, get) => ({
    tree: null,
    viewMode: 'table',

    results: [],
    total: 0,
    stats: { total: 0, totalAll: 0, withUrl: 0, totalRevenue: 0, totalEmployees: 0, uniqueCountries: 0, byNace: {} },
    loading: false,

    mapCompanies: [],
    mapLoading: false,
    selectedMapCompany: null,

    countries: [],
    regions: [],

    selectedNode: null,
    selectedCompany: null,

    searchQuery: '',
    countryFilter: '',
    regionFilter: '',
    caMin: '',
    caMax: '',
    effMin: '',
    effMax: '',
    urlOnly: false,

    sortKey: 'employees',
    sortDir: 'desc',

    page: 0,

    setTree: (tree) => set({ tree }),
    setViewMode: (viewMode) => set({ viewMode }),
    setSelectedNode: (selectedNode) => set({ selectedNode, page: 0 }),
    setSelectedCompany: (selectedCompany) => set({ selectedCompany }),
    setSelectedMapCompany: (selectedMapCompany) => set({ selectedMapCompany }),
    setSearchQuery: (searchQuery) => set({ searchQuery, page: 0 }),
    setCountryFilter: (countryFilter) => set({ countryFilter, page: 0 }),
    setRegionFilter: (regionFilter) => set({ regionFilter, page: 0 }),
    setCaMin: (caMin) => set({ caMin, page: 0 }),
    setCaMax: (caMax) => set({ caMax, page: 0 }),
    setEffMin: (effMin) => set({ effMin, page: 0 }),
    setEffMax: (effMax) => set({ effMax, page: 0 }),
    setUrlOnly: (urlOnly) => set({ urlOnly, page: 0 }),
    setSortKey: (key) => set((s) => ({
        sortKey: key,
        sortDir: s.sortKey === key ? (s.sortDir === 'asc' ? 'desc' : 'asc') : (key === 'company_name' || key === 'city' || key === 'region' || key === 'country_iso' ? 'asc' : 'desc'),
        page: 0,
    })),
    setPage: (page) => set({ page }),
    resetFilters: () => set({
        searchQuery: '',
        countryFilter: '',
        regionFilter: '',
        caMin: '',
        caMax: '',
        effMin: '',
        effMax: '',
        urlOnly: false,
    }),

    fetchResults: async () => {
        const state = get();
        set({ loading: true });

        const p = buildBarParams(state);

        if (state.selectedNode) {
            const codes = collectNaceCodes(state.selectedNode);
            if (codes.length > 0) p.set('nace', codes.join(','));
        }

        p.set('sort', state.sortKey);
        p.set('dir', state.sortDir);
        p.set('page', String(state.page));
        p.set('pageSize', '100');

        try {
            const res = await apiFetch(`/api/companies?${p}`);
            const json = await res.json();
            set({ results: json.data, total: json.total, loading: false });
        } catch {
            set({ loading: false });
        }
    },

    fetchStats: async () => {
        const state = get();
        const p = buildBarParams(state);

        try {
            const res = await apiFetch(`/api/companies/stats?${p}`);
            const json = await res.json();
            set({ stats: json });
        } catch {
            // silent
        }
    },

    fetchFilters: async () => {
        try {
            const res = await apiFetch('/api/companies/filters');
            const json = await res.json();
            set({ countries: json.countries, regions: json.regions });
        } catch {
            // silent
        }
    },

    fetchMapResults: async () => {
        const state = get();
        set({ mapLoading: true });

        const p = buildBarParams(state);
        // Force country=FR for France map
        p.set('country', 'FR');

        if (state.selectedNode) {
            const codes = collectNaceCodes(state.selectedNode);
            if (codes.length > 0) p.set('nace', codes.join(','));
        }

        try {
            const [companies, lookup] = await Promise.all([
                fetchAllPages(p),
                loadGeocodeLookup(),
            ]);

            const mapped: MapCompany[] = [];
            for (const c of companies) {
                const coords = geocodeCity(lookup, c.city);
                if (coords) {
                    mapped.push(companyEUToMapCompany(c, coords));
                }
            }

            set({ mapCompanies: mapped, mapLoading: false });
        } catch {
            set({ mapLoading: false });
        }
    },
}));
