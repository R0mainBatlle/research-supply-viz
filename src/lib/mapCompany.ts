import { CompanyEU, MapCompany, naceToGroup } from '@/types';

export function companyEUToMapCompany(
    c: CompanyEU,
    coordinates: [number, number],
): MapCompany {
    return {
        id: c.id,
        name: c.company_name,
        coordinates,
        employees: c.employees,
        revenue: c.revenue_eur_th,
        city: c.city,
        region: c.region,
        countryIso: c.country_iso,
        naceCore: c.nace_core,
        naceGroup: naceToGroup(c.nace_core),
        tradeDescription: c.trade_description,
        website: c.website,
        guoName: c.guo_name,
    };
}
