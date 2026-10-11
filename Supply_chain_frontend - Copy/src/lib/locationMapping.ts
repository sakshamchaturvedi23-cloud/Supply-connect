/**
 * Supply Connect - Location Mapping System
 * 
 * Strict Location Honesty Policy:
 * The disruptions database stores unvalidated, human-entered or RSS-extracted
 * location strings (e.g., "Taiwan", "Red Sea", "Shenzhen", "Global").
 * Coordinates do NOT exist natively in the disruptions database.
 * 
 * We deterministically map recognized strategic supply-chain hubs, ports,
 * manufacturing centers, and maritime chokepoints to approximate coordinates.
 * Broad, multi-region, or ambiguous locations are explicitly labeled as
 * UNMAPPED rather than guessing arbitrary coordinates.
 * 
 * All mapped pins MUST be displayed with "≈ Approximate location" in the UI.
 */

export type LocationPrecision = 'port_chokepoint' | 'industrial_hub' | 'country_centroid';

export type ResolvedLocation =
  | {
      mapped: true;
      lat: number;
      lng: number;
      normalizedName: string;
      rawLocation: string;
      precision: LocationPrecision;
      precisionLabel: string;
    }
  | {
      mapped: false;
      rawLocation: string;
      reason: string;
    };

interface KnownHub {
  keywords: string[];
  lat: number;
  lng: number;
  normalizedName: string;
  precision: LocationPrecision;
}

const KNOWN_HUBS: KnownHub[] = [
  // -------------------------------------------------------------
  // Maritime Chokepoints & Waterways
  // -------------------------------------------------------------
  {
    keywords: ['red sea', 'bab-el-mandeb', 'bab el mandeb', 'yemen', 'houthi', 'aden'],
    lat: 13.0,
    lng: 43.3,
    normalizedName: 'Red Sea / Bab-el-Mandeb Strait',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['suez', 'suez canal', 'egypt', 'sinai'],
    lat: 30.6,
    lng: 32.3,
    normalizedName: 'Suez Canal, Egypt',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['malacca', 'strait of malacca', 'singapore', 'johor'],
    lat: 1.35,
    lng: 103.82,
    normalizedName: 'Strait of Malacca / Singapore Port',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['hormuz', 'strait of hormuz', 'persian gulf', 'oman', 'bandar abbas'],
    lat: 26.6,
    lng: 56.5,
    normalizedName: 'Strait of Hormuz, Persian Gulf',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['panama', 'panama canal', 'gatun lake', 'colon'],
    lat: 9.1,
    lng: -79.7,
    normalizedName: 'Panama Canal Transit',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['taiwan strait', 'taiwan', 'taipei', 'hsinchu', 'kaohsiung', 'tsmc'],
    lat: 24.8,
    lng: 121.0,
    normalizedName: 'Hsinchu / Taiwan Semiconductor Basin',
    precision: 'industrial_hub',
  },
  {
    keywords: ['bosporus', 'bosphorus', 'istanbul', 'black sea', 'dardanelles'],
    lat: 41.1,
    lng: 29.0,
    normalizedName: 'Bosporus Strait, Turkey',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['cape of good hope', 'south africa', 'durban', 'cape town'],
    lat: -34.3,
    lng: 18.5,
    normalizedName: 'Cape of Good Hope Maritime Route',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['english channel', 'dover', 'calais', 'rotterdam to uk'],
    lat: 50.8,
    lng: 1.3,
    normalizedName: 'English Channel / Dover Strait',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['south china sea', 'paracel', 'spratly'],
    lat: 13.5,
    lng: 114.5,
    normalizedName: 'South China Sea Maritime Lane',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['baltic sea', 'gulf of finland', 'kattegat', 'skagerrak'],
    lat: 57.5,
    lng: 19.5,
    normalizedName: 'Baltic Sea Shipping Route',
    precision: 'port_chokepoint',
  },

  // -------------------------------------------------------------
  // Asian Manufacturing & Logistics Hubs
  // -------------------------------------------------------------
  {
    keywords: ['shenzhen', 'guangdong', 'pearl river', 'guangzhou', 'dongguan'],
    lat: 22.54,
    lng: 114.05,
    normalizedName: 'Shenzhen / Guangdong Manufacturing Belt',
    precision: 'industrial_hub',
  },
  {
    keywords: ['shanghai', 'ningbo', 'yangtze delta', 'waigaoqiao', 'yangshan'],
    lat: 31.23,
    lng: 121.47,
    normalizedName: 'Shanghai / Ningbo Port Complex',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['beijing', 'tianjin', 'hebei'],
    lat: 39.1,
    lng: 117.2,
    normalizedName: 'Tianjin Port / Northern China Hub',
    precision: 'industrial_hub',
  },
  {
    keywords: ['wuhan', 'hubei', 'central china'],
    lat: 30.59,
    lng: 114.3,
    normalizedName: 'Wuhan Industrial Center, China',
    precision: 'industrial_hub',
  },
  {
    keywords: ['mumbai', 'jnpt', 'nhava sheva', 'maharashtra'],
    lat: 18.95,
    lng: 72.95,
    normalizedName: 'Mumbai / JNPT Container Port, India',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['mundra', 'gujarat', 'kandla'],
    lat: 22.84,
    lng: 69.7,
    normalizedName: 'Mundra Port, Gujarat, India',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['chennai', 'tamil nadu', 'ennore', 'kattupalli'],
    lat: 13.08,
    lng: 80.29,
    normalizedName: 'Chennai Port & Automotive Cluster, India',
    precision: 'industrial_hub',
  },
  {
    keywords: ['bengaluru', 'bangalore', 'karnataka'],
    lat: 12.97,
    lng: 77.59,
    normalizedName: 'Bengaluru Tech & Defense Corridor, India',
    precision: 'industrial_hub',
  },
  {
    keywords: ['delhi', 'ncr', 'gurugram', 'noida', 'haryana'],
    lat: 28.61,
    lng: 77.21,
    normalizedName: 'Delhi-NCR Logistics Corridor, India',
    precision: 'industrial_hub',
  },
  {
    keywords: ['seoul', 'suwon', 'gyeonggi', 'incheon', 'samsung', 'sk hynix', 'south korea', 'korea'],
    lat: 37.3,
    lng: 127.0,
    normalizedName: 'Gyeonggi / Seoul Semiconductor Cluster',
    precision: 'industrial_hub',
  },
  {
    keywords: ['busan', 'pusan'],
    lat: 35.1,
    lng: 129.04,
    normalizedName: 'Port of Busan, South Korea',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['tokyo', 'yokohama', 'kanto', 'chiba', 'japan'],
    lat: 35.44,
    lng: 139.64,
    normalizedName: 'Tokyo Bay / Yokohama Port, Japan',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['osaka', 'kobe', 'kansai'],
    lat: 34.69,
    lng: 135.5,
    normalizedName: 'Kobe / Osaka Port Gateway, Japan',
    precision: 'industrial_hub',
  },
  {
    keywords: ['vietnam', 'ho chi minh', 'hcmc', 'hai phong', 'hanoi'],
    lat: 10.78,
    lng: 106.7,
    normalizedName: 'Ho Chi Minh City / Saigon Port, Vietnam',
    precision: 'industrial_hub',
  },
  {
    keywords: ['thailand', 'bangkok', 'laem chabang', 'eastern seaboard'],
    lat: 13.08,
    lng: 100.88,
    normalizedName: 'Laem Chabang Port, Thailand',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['malaysia', 'penang', 'port klang', 'kuala lumpur'],
    lat: 3.0,
    lng: 101.4,
    normalizedName: 'Port Klang & Penang Electronics Hub, Malaysia',
    precision: 'industrial_hub',
  },
  {
    keywords: ['indonesia', 'jakarta', 'tanjung priok'],
    lat: -6.1,
    lng: 106.88,
    normalizedName: 'Port of Tanjung Priok / Jakarta, Indonesia',
    precision: 'port_chokepoint',
  },

  // -------------------------------------------------------------
  // Middle East & European Gateways
  // -------------------------------------------------------------
  {
    keywords: ['dubai', 'jebel ali', 'uae', 'emirates', 'abu dhabi'],
    lat: 25.01,
    lng: 55.06,
    normalizedName: 'Port of Jebel Ali, Dubai, UAE',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['saudi arabia', 'jeddah', 'king abdullah port', 'riyadh'],
    lat: 21.48,
    lng: 39.18,
    normalizedName: 'Jeddah Islamic Port, Saudi Arabia',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['rotterdam', 'netherlands', 'holland', 'rhine-meuse', 'dutch'],
    lat: 51.92,
    lng: 4.47,
    normalizedName: 'Port of Rotterdam, Netherlands',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['antwerp', 'belgium', 'flanders'],
    lat: 51.24,
    lng: 4.4,
    normalizedName: 'Port of Antwerp-Bruges, Belgium',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['hamburg', 'elbe', 'northern germany'],
    lat: 53.53,
    lng: 9.97,
    normalizedName: 'Port of Hamburg, Germany',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['ruhr', 'duisburg', 'rhine', 'frankfurt', 'germany', 'bavaria'],
    lat: 51.43,
    lng: 6.76,
    normalizedName: 'Ruhr / Rhine Valley Industrial Corridor, Germany',
    precision: 'industrial_hub',
  },
  {
    keywords: ['felixstowe', 'london', 'thames', 'united kingdom', 'uk', 'britain', 'england'],
    lat: 51.96,
    lng: 1.35,
    normalizedName: 'Port of Felixstowe / London Hub, UK',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['le havre', 'marseille', 'paris', 'france'],
    lat: 49.49,
    lng: 0.11,
    normalizedName: 'Port of Le Havre / Seine Corridor, France',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['valencia', 'algeciras', 'barcelona', 'spain'],
    lat: 39.45,
    lng: -0.32,
    normalizedName: 'Port of Valencia / Mediterranean Hub, Spain',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['genoa', 'trieste', 'milan', 'italy'],
    lat: 44.41,
    lng: 8.92,
    normalizedName: 'Port of Genoa / Northern Italy Basin',
    precision: 'industrial_hub',
  },
  {
    keywords: ['gdansk', 'poland', 'warsaw'],
    lat: 54.38,
    lng: 18.66,
    normalizedName: 'Port of Gdansk, Poland',
    precision: 'port_chokepoint',
  },

  // -------------------------------------------------------------
  // North American Gateways & Corridors
  // -------------------------------------------------------------
  {
    keywords: ['los angeles', 'long beach', 'san pedro', 'california', 'la port'],
    lat: 33.74,
    lng: -118.26,
    normalizedName: 'Port of Los Angeles / Long Beach, USA',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['oakland', 'bay area', 'silicon valley', 'san francisco'],
    lat: 37.8,
    lng: -122.3,
    normalizedName: 'Port of Oakland / Silicon Valley, USA',
    precision: 'industrial_hub',
  },
  {
    keywords: ['new york', 'new jersey', 'ny/nj', 'port newark', 'elizabeth'],
    lat: 40.68,
    lng: -74.04,
    normalizedName: 'Port of New York & New Jersey, USA',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['savannah', 'georgia', 'charleston', 'south carolina'],
    lat: 32.08,
    lng: -81.09,
    normalizedName: 'Port of Savannah, Georgia, USA',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['houston', 'texas', 'gulf coast', 'galveston'],
    lat: 29.76,
    lng: -95.36,
    normalizedName: 'Port of Houston / Gulf Petrochemical Hub, USA',
    precision: 'industrial_hub',
  },
  {
    keywords: ['seattle', 'tacoma', 'puget sound', 'washington'],
    lat: 47.6,
    lng: -122.33,
    normalizedName: 'Seattle-Tacoma Northwest Seaport, USA',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['chicago', 'midwest', 'illinois', 'intermodal'],
    lat: 41.88,
    lng: -87.63,
    normalizedName: 'Chicago Rail & Inland Logistics Hub, USA',
    precision: 'industrial_hub',
  },
  {
    keywords: ['vancouver', 'prince rupert', 'british columbia', 'canada'],
    lat: 49.28,
    lng: -123.12,
    normalizedName: 'Port of Vancouver Gateway, Canada',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['monterrey', 'mexico', 'nuevo leon', 'ciudad juarez', 'tijuana'],
    lat: 25.68,
    lng: -100.31,
    normalizedName: 'Monterrey Nearshoring Belt, Mexico',
    precision: 'industrial_hub',
  },

  // -------------------------------------------------------------
  // Latin America, Africa & Oceania
  // -------------------------------------------------------------
  {
    keywords: ['santos', 'sao paulo', 'brazil'],
    lat: -23.96,
    lng: -46.33,
    normalizedName: 'Port of Santos, Brazil',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['sydney', 'melbourne', 'australia', 'port botany'],
    lat: -33.95,
    lng: 151.22,
    normalizedName: 'Port Botany / Sydney, Australia',
    precision: 'port_chokepoint',
  },
  {
    keywords: ['chile', 'valparaiso', 'san antonio', 'lithium triangle'],
    lat: -33.04,
    lng: -71.62,
    normalizedName: 'Port of Valparaiso / Lithium Corridor, Chile',
    precision: 'industrial_hub',
  },

  // -------------------------------------------------------------
  // Country-Level Centroids (when only country is noted)
  // -------------------------------------------------------------
  {
    keywords: ['united states', 'usa', 'u.s.'],
    lat: 38.8,
    lng: -97.5,
    normalizedName: 'United States (National Scope)',
    precision: 'country_centroid',
  },
  {
    keywords: ['china', 'prc'],
    lat: 34.0,
    lng: 104.0,
    normalizedName: 'China (National Scope)',
    precision: 'country_centroid',
  },
  {
    keywords: ['india'],
    lat: 21.0,
    lng: 78.5,
    normalizedName: 'India (National Scope)',
    precision: 'country_centroid',
  },
  {
    keywords: ['russia', 'moscow'],
    lat: 58.0,
    lng: 50.0,
    normalizedName: 'Russia (Regional Scope)',
    precision: 'country_centroid',
  },
  {
    keywords: ['ukraine', 'kyiv', 'odessa'],
    lat: 48.4,
    lng: 31.2,
    normalizedName: 'Ukraine / Black Sea Ports',
    precision: 'country_centroid',
  },
];

/** Phrases that indicate broad/multi-region or cyberspace scope with no geographic pin */
const UNMAPPED_TERMS = [
  'global',
  'worldwide',
  'international',
  'cross-border',
  'multiple',
  'various',
  'cyber',
  'remote',
  'cloud',
  'satellite',
  'space',
  'unspecified',
  'online',
  'virtual',
];

/**
 * Resolves an unvalidated text location from a disruption record into either
 * a verified geographic coordinate with strict approximate disclaimer,
 * or an unmapped classification.
 */
export function resolveLocation(rawLocation?: string | null): ResolvedLocation {
  const raw = (rawLocation ?? '').trim();

  if (!raw) {
    return {
      mapped: false,
      rawLocation: 'Unspecified',
      reason: 'No location metadata stored in record',
    };
  }

  const lower = raw.toLowerCase();

  // Check for explicitly unmapped/global phrases first
  if (UNMAPPED_TERMS.some((term) => lower === term || lower.includes(term))) {
    return {
      mapped: false,
      rawLocation: raw,
      reason: 'Global or multi-region scope with no singular coordinate',
    };
  }

  // Find matching hub in priority order (ports & chokepoints first, then industrial hubs, then countries)
  for (const hub of KNOWN_HUBS) {
    if (hub.keywords.some((kw) => lower.includes(kw))) {
      let precisionLabel = '≈ Approximate Port / Chokepoint';
      if (hub.precision === 'industrial_hub') {
        precisionLabel = '≈ Approximate Industrial Cluster';
      } else if (hub.precision === 'country_centroid') {
        precisionLabel = '≈ National Center (Broad Region)';
      }

      return {
        mapped: true,
        lat: hub.lat,
        lng: hub.lng,
        normalizedName: hub.normalizedName,
        rawLocation: raw,
        precision: hub.precision,
        precisionLabel,
      };
    }
  }

  // Not found in strategic dictionary
  return {
    mapped: false,
    rawLocation: raw,
    reason: `Region "${raw}" not in strategic port/corridor dictionary`,
  };
}

