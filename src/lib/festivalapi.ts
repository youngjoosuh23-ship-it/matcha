const SERVICE_KEY = process.env.TOUR_API_KEY ?? '';
const BASE = '/fstvlapi/openapi/tn_pubr_public_cltur_fstvl_api';

export interface PublicFestival {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  address: string;
  location: { lat: number; lng: number };
  organizer?: string;
  phone?: string;
  homepage?: string;
  description?: string;
}

async function fetchPage(pageNo: number): Promise<{ items: Record<string, string>[]; total: number }> {
  const params = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    numOfRows: '500',
    pageNo: String(pageNo),
    type: 'json',
  });
  const res = await fetch(`${BASE}?${params.toString()}`);
  if (!res.ok) return { items: [], total: 0 };
  const data = await res.json();
  const raw = data?.response?.body?.items ?? [];
  const total = parseInt(data?.response?.body?.totalCount ?? '0', 10);
  return { items: Array.isArray(raw) ? raw : [raw], total };
}

export async function fetchPublicFestivals(
  fromDate?: string,
  toDate?: string,
): Promise<PublicFestival[]> {
  const { items: page1, total } = await fetchPage(1);
  let all = [...page1];

  if (total > 500) {
    const pages = Math.min(Math.ceil(total / 500), 4);
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2))
    );
    rest.forEach(p => all.push(...p.items));
  }

  return all
    .filter(item => item.latitude && item.longitude && parseFloat(item.latitude) !== 0)
    .map((item, i) => ({
      id: `${item.fstvlNm ?? ''}-${item.fstvlStartDate ?? ''}-${i}`,
      name: item.fstvlNm ?? '',
      startDate: item.fstvlStartDate ?? '',
      endDate: item.fstvlEndDate ?? '',
      address: item.rdnmadr ?? '',
      location: { lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) },
      organizer: item.auspcInsttNm || undefined,
      phone: item.phoneNumber || undefined,
      homepage: item.homepageUrl || undefined,
      description: item.fstvlCo || undefined,
    }))
    .filter(f => {
      if (!fromDate && !toDate) return f.startDate >= new Date().toISOString().slice(0, 10);
      if (fromDate && f.endDate && f.endDate < fromDate) return false;
      if (toDate && f.startDate && f.startDate > toDate) return false;
      return true;
    });
}
