// ─── Defense Tree ────────────────────────────────────────────────────────────

export interface TreeNode {
    id: string;
    name: string;
    level: "programme" | "categorie" | "capacite";
    criticality?: "critique" | "haute" | "moyenne" | "faible";
    context?: string;
    description?: string;
    civil_examples?: string;
    bottleneck?: string;
    programmes?: string[];
    nace_codes?: string[];
    children?: TreeNode[];
}

// ─── EU Companies (from Postgres via API) ────────────────────────────────────

export interface CompanyEU {
    id: number;
    company_name: string;
    country_iso: string;
    nace_core: string;
    nace_secondary: string | null;
    trade_description: string | null;
    employees: number | null;
    city: string | null;
    region: string | null;
    revenue_eur_th: number | null;
    ebitda_eur_th: number | null;
    guo_name: string | null;
    guo_country_iso: string | null;
    website: string | null;
    national_id: string | null;
    nb_branches: number | null;
    nb_subsidiaries: number | null;
}

// ─── Map display type ────────────────────────────────────────────────────────

export interface MapCompany {
    id: number;
    name: string;
    coordinates: [number, number]; // [lon, lat]
    employees: number | null;
    revenue: number | null;
    city: string | null;
    region: string | null;
    countryIso: string;
    naceCore: string;
    naceGroup: string;
    tradeDescription: string | null;
    website: string | null;
    guoName: string | null;
}

// ─── NACE group classification & colors ──────────────────────────────────────

const NACE_GROUPS: [string, number, number][] = [
    ["Textile", 13, 15],
    ["Papier & Impression", 17, 18],
    ["Chimie & Pharma", 20, 21],
    ["Plastique & Verre", 22, 23],
    ["Métallurgie", 24, 25],
    ["Électronique", 26, 26],
    ["Équipement électrique", 27, 27],
    ["Machines", 28, 28],
    ["Véhicules", 29, 30],
    ["Fabrication diverse", 31, 33],
    ["Transport & Logistique", 49, 52],
    ["IT & Télécom", 61, 62],
    ["R&D", 72, 72],
];

export function naceToGroup(naceCore: string): string {
    const n = parseInt(naceCore.slice(0, 2), 10);
    if (isNaN(n)) return "Autre";
    for (const [label, lo, hi] of NACE_GROUPS) {
        if (n >= lo && n <= hi) return label;
    }
    return "Autre";
}

export const NACE_GROUP_COLORS: Record<string, string> = {
    "Métallurgie": "#3b82f6",
    "Électronique": "#8b5cf6",
    "Équipement électrique": "#0ea5e9",
    "Machines": "#6366f1",
    "Véhicules": "#64748b",
    "Chimie & Pharma": "#f59e0b",
    "Textile": "#f43f5e",
    "Plastique & Verre": "#10b981",
    "Fabrication diverse": "#84cc16",
    "Transport & Logistique": "#0284c7",
    "IT & Télécom": "#ec4899",
    "R&D": "#14b8a6",
    "Papier & Impression": "#eab308",
    "Autre": "#475569",
};
