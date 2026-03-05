// ─── Defense Tree & EU Companies (Programmes page) ─────────────────────────

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

// ─── FR Base (existing) ─────────────────────────────────────────────────────

export interface Company {
    id: string;
    company_id: string;
    site_name: string;
    coordinates: [number, number] | null; // [lon, lat], null for table-only entries

    // Categorization
    filiere: string;
    sous_filiere: string;

    // Identity
    raison_sociale: string;
    nom_commercial: string;
    groupe_appartenance: string;
    pays_groupe: string;
    region_siege: string;

    // Metrics
    effectif_total: number;
    ca_meur: number;
    tendance_ca: string;
    tendance_effectif: string;

    // Defense specific
    score_convertibilite: number;
    profil_conversion: string;
    habilitation_defense: boolean;
    certifications: string;

    // Descriptive
    description_activite: string;
    produits_fabriques: string;
    clients_principaux: string;
    part_defense_pct: string;
    capacites_industrielles: string;
    produits_defense_potentiels: string;
    obstacles_conversion: string;
    justification_score: string;
    url_site_web: string;
}

// 14 Distinct colors for the filières according to LE_VECTOR "technical/muted" aesthetics
export const FILIERE_COLORS: Record<string, string> = {
    "Automobile & Mobilité Terrestre": "#3b82f6", // Blue
    "Aéronautique Civile & Spatial": "#0ea5e9", // Light Blue
    "Électronique & Micro-électronique": "#8b5cf6", // Purple
    "Chimie, Matériaux & Explosifs": "#f59e0b", // Amber
    "Batteries, Énergie & Alimentation": "#10b981", // Emerald
    "Moteurs, Actionneurs & Mécatronique": "#64748b", // Slate
    "RF, Antennes & Communications": "#ec4899", // Pink
    "Optique & Vision": "#14b8a6", // Teal
    "Textile Technique & Protection": "#f43f5e", // Rose
    "Fabrication Additive": "#84cc16", // Lime
    "Câblage Harnais & Connectique": "#eab308", // Yellow
    "Pyrotechnie & Munitions": "#ef4444", // Red
    "Naval & Maritime": "#0284c7", // Sky Blue
    "Mécanique Industrielle & Usinage": "#6366f1", // Indigo
};

// Distinct LE_VECTOR styling colors
export const SCENARIOS = [
    {
        id: "sn_155mm",
        name: "Munitions 155mm",
        filieres: ["Chimie, Matériaux & Explosifs", "Pyrotechnie & Munitions", "Automobile & Mobilité Terrestre", "Moteurs, Actionneurs & Mécatronique"]
    },
    {
        id: "sn_drone",
        name: "Drone ISR tactique",
        filieres: ["Aéronautique Civile & Spatial", "Électronique & Micro-électronique", "Batteries, Énergie & Alimentation", "Optique & Vision", "RF, Antennes & Communications", "Moteurs, Actionneurs & Mécatronique"]
    },
    {
        id: "sn_vbl",
        name: "Véhicule blindé léger",
        filieres: ["Automobile & Mobilité Terrestre", "Moteurs, Actionneurs & Mécatronique", "Électronique & Micro-électronique", "Câblage Harnais & Connectique", "Textile Technique & Protection", "Optique & Vision"]
    },
    {
        id: "sn_rodeuse",
        name: "Munition rôdeuse",
        filieres: ["Aéronautique Civile & Spatial", "Électronique & Micro-électronique", "Batteries, Énergie & Alimentation", "RF, Antennes & Communications", "Moteurs, Actionneurs & Mécatronique", "Pyrotechnie & Munitions", "Optique & Vision"]
    },
    {
        id: "sn_antichar",
        name: "Missile antichar",
        filieres: ["Aéronautique Civile & Spatial", "Chimie, Matériaux & Explosifs", "Pyrotechnie & Munitions", "Électronique & Micro-électronique", "Optique & Vision", "Moteurs, Actionneurs & Mécatronique"]
    },
    {
        id: "sn_soldat",
        name: "Équipement individuel",
        filieres: ["Textile Technique & Protection", "Électronique & Micro-électronique", "Optique & Vision"]
    }
];
