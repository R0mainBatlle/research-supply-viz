import { create } from 'zustand';
import { Company } from '@/types';

interface FilterState {
    searchQuery: string;
    filiere: string[];
    minScore: number;
    profil: string[];
    region: string[];
    certifications: string[];
    habilitationDefense: boolean | null;
    tendanceCA: string[];
    activeScenario: string | null;

    // Table-originated filters
    caMin: string;
    caMax: string;
    effMin: string;
    effMax: string;
    urlOnly: boolean;
    filterSource: string;

    setSearchQuery: (q: string) => void;
    toggleFiliere: (f: string) => void;
    setFiliere: (f: string[]) => void;
    setMinScore: (v: number) => void;
    toggleProfil: (p: string) => void;
    setProfil: (p: string[]) => void;
    toggleRegion: (r: string) => void;
    setRegion: (r: string[]) => void;
    toggleCertification: (c: string) => void;
    setHabilitationDefense: (v: boolean | null) => void;
    toggleTendanceCA: (t: string) => void;
    setActiveScenario: (s: string | null) => void;
    setCaMin: (v: string) => void;
    setCaMax: (v: string) => void;
    setEffMin: (v: string) => void;
    setEffMax: (v: string) => void;
    setUrlOnly: (v: boolean) => void;
    setFilterSource: (v: string) => void;
    resetFilters: () => void;
}

interface AppState {
    companies: Company[];
    selectedCompany: Company | null;
    setCompanies: (c: Company[]) => void;
    setSelectedCompany: (c: Company | null) => void;
}

export const useStore = create<FilterState & AppState>((set) => ({
    // Data State
    companies: [],
    selectedCompany: null,
    setCompanies: (companies) => set({ companies }),
    setSelectedCompany: (selectedCompany) => set({ selectedCompany }),

    // Filter State
    searchQuery: '',
    filiere: [],
    minScore: 1,
    profil: [],
    region: [],
    certifications: [],
    habilitationDefense: null,
    tendanceCA: [],
    activeScenario: null,

    // Table filters
    caMin: '',
    caMax: '',
    effMin: '',
    effMax: '',
    urlOnly: false,
    filterSource: '',

    setSearchQuery: (searchQuery) => set({ searchQuery }),
    toggleFiliere: (f) => set((state) => ({
        filiere: state.filiere.includes(f)
            ? state.filiere.filter(x => x !== f)
            : [...state.filiere, f]
    })),
    setFiliere: (filiere) => set({ filiere }),
    setMinScore: (minScore) => set({ minScore }),
    toggleProfil: (p) => set((state) => ({
        profil: state.profil.includes(p)
            ? state.profil.filter(x => x !== p)
            : [...state.profil, p]
    })),
    setProfil: (profil) => set({ profil }),
    toggleRegion: (r) => set((state) => ({
        region: state.region.includes(r)
            ? state.region.filter(x => x !== r)
            : [...state.region, r]
    })),
    setRegion: (region) => set({ region }),
    toggleCertification: (c) => set((state) => ({
        certifications: state.certifications.includes(c)
            ? state.certifications.filter(x => x !== c)
            : [...state.certifications, c]
    })),
    setHabilitationDefense: (habilitationDefense) => set({ habilitationDefense }),
    toggleTendanceCA: (t) => set((state) => ({
        tendanceCA: state.tendanceCA.includes(t)
            ? state.tendanceCA.filter(x => x !== t)
            : [...state.tendanceCA, t]
    })),
    setActiveScenario: (activeScenario) => set({ activeScenario }),
    setCaMin: (caMin) => set({ caMin }),
    setCaMax: (caMax) => set({ caMax }),
    setEffMin: (effMin) => set({ effMin }),
    setEffMax: (effMax) => set({ effMax }),
    setUrlOnly: (urlOnly) => set({ urlOnly }),
    setFilterSource: (filterSource) => set({ filterSource }),
    resetFilters: () => set({
        searchQuery: '',
        filiere: [],
        minScore: 1,
        profil: [],
        region: [],
        certifications: [],
        habilitationDefense: null,
        tendanceCA: [],
        activeScenario: null,
        caMin: '',
        caMax: '',
        effMin: '',
        effMax: '',
        urlOnly: false,
        filterSource: '',
    })
}));
