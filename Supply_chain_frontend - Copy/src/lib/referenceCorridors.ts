/**
 * Supply Connect - Reference Trade Corridors & Chokepoints
 * 
 * Strict Telemetry Honesty Policy:
 * These paths are STATIC REFERENCE GEOMETRIES of major global trade lanes and
 * maritime chokepoints. They do NOT represent live AIS vessel pings, real-time
 * tracking, or satellite feeds.
 */

export interface ReferenceCorridor {
  id: string;
  name: string;
  shortName: string;
  category: 'chokepoint' | 'maritime_highway' | 'inland_waterway';
  color: string;
  annualVolume: string;
  riskProfile: string;
  disclaimer: string;
  waypoints: [number, number][]; // [lat, lng] array
}

export const REFERENCE_CORRIDORS: ReferenceCorridor[] = [
  {
    id: 'malacca-strait',
    name: 'Strait of Malacca Maritime Corridor',
    shortName: 'Strait of Malacca',
    category: 'chokepoint',
    color: '#2DD4BF', // mint/teal
    annualVolume: '~94,000 vessels / year (approx 25% of global traded goods)',
    riskProfile: 'Dense congestion, piracy monitoring, narrow navigational depth (25m)',
    disclaimer: 'Static reference trade corridor — No live vessel telemetry.',
    waypoints: [
      [5.5, 95.3],
      [4.2, 98.6],
      [2.5, 101.5],
      [1.3, 103.8],
      [1.4, 104.5],
      [2.8, 105.5],
    ],
  },
  {
    id: 'suez-bab-el-mandeb',
    name: 'Suez Canal & Bab-el-Mandeb Red Sea Route',
    shortName: 'Suez / Red Sea Transit',
    category: 'chokepoint',
    color: '#F59E0B', // amber
    annualVolume: '~23,000 transits historically (12-15% of world maritime trade)',
    riskProfile: 'Geopolitical conflict, missile/drone threats, Cape rerouting delays (+10-14 days)',
    disclaimer: 'Static reference trade corridor — No live vessel telemetry.',
    waypoints: [
      [31.3, 32.3], // Port Said / Mediterranean entrance
      [29.9, 32.5], // Suez southern entrance
      [27.5, 34.0], // Gulf of Suez
      [22.0, 38.0], // Central Red Sea
      [15.0, 42.0], // Southern Red Sea
      [12.6, 43.4], // Bab-el-Mandeb Strait
      [11.9, 44.5], // Gulf of Aden
      [12.0, 51.0], // Arabian Sea exit
    ],
  },
  {
    id: 'strait-of-hormuz',
    name: 'Strait of Hormuz Petroleum Corridor',
    shortName: 'Strait of Hormuz',
    category: 'chokepoint',
    color: '#EF4444', // red/critical
    annualVolume: '~21 million barrels of petroleum/day (approx 20% of global petroleum consumption)',
    riskProfile: 'Naval interdictions, mine threats, GPS spoofing, extreme single-point vulnerability',
    disclaimer: 'Static reference trade corridor — No live vessel telemetry.',
    waypoints: [
      [27.2, 51.5], // Persian Gulf / Qatar
      [26.5, 54.5],
      [26.2, 56.3], // Hormuz strait bend
      [25.5, 57.0],
      [24.5, 58.5], // Gulf of Oman
    ],
  },
  {
    id: 'panama-canal',
    name: 'Panama Canal Trans-Isthmus Route',
    shortName: 'Panama Canal',
    category: 'chokepoint',
    color: '#38BDF8', // sky
    annualVolume: '~14,000 transits / year (connecting Atlantic and Pacific oceans)',
    riskProfile: 'Drought sensitivity in Gatun Lake, draft restrictions, queue volatility',
    disclaimer: 'Static reference trade corridor — No live vessel telemetry.',
    waypoints: [
      [9.35, -79.9], // Colon / Atlantic side
      [9.15, -79.75], // Gatun Lake
      [8.95, -79.56], // Balboa / Pacific side
    ],
  },
  {
    id: 'trans-pacific',
    name: 'Trans-Pacific Eastbound Highway (East Asia to US West Coast)',
    shortName: 'Trans-Pacific Lane',
    category: 'maritime_highway',
    color: '#2DD4BF',
    annualVolume: '>25 million TEUs annually (consumer goods, electronics, auto components)',
    riskProfile: 'Winter typhoons, Pacific port dockworker negotiations, equipment repositioning imbalance',
    disclaimer: 'Static reference trade corridor — No live vessel telemetry.',
    waypoints: [
      [31.2, 122.0], // Shanghai
      [34.0, 130.0],
      [35.5, 145.0],
      [38.0, 165.0],
      [40.0, -175.0],
      [38.0, -150.0],
      [35.0, -130.0],
      [33.7, -118.5], // LA / Long Beach
    ],
  },
  {
    id: 'trans-atlantic',
    name: 'North Atlantic Trade Corridor (Northern Europe to US East Coast)',
    shortName: 'Trans-Atlantic Route',
    category: 'maritime_highway',
    color: '#818CF8', // indigo
    annualVolume: '>6 million TEUs annually (machinery, pharmaceuticals, chemicals, vehicles)',
    riskProfile: 'Winter North Atlantic gales, container stack collapse risks, port terminal capacity',
    disclaimer: 'Static reference trade corridor — No live vessel telemetry.',
    waypoints: [
      [51.9, 4.5], // Rotterdam
      [50.5, 0.0], // English Channel
      [49.0, -8.0], // Celtic Sea
      [47.0, -25.0],
      [43.0, -45.0],
      [41.0, -65.0],
      [40.6, -74.0], // NY & NJ
    ],
  },
  {
    id: 'cape-of-good-hope',
    name: 'Cape of Good Hope Diversion Highway',
    shortName: 'Cape Diversion Route',
    category: 'maritime_highway',
    color: '#FB923C', // orange
    annualVolume: 'Rerouting channel absorbing diverted Suez mega-container and bulk vessels',
    riskProfile: 'Rough southern seas, severe bunker fuel costs (+3,500 nautical miles), bunkering congestion',
    disclaimer: 'Static reference trade corridor — No live vessel telemetry.',
    waypoints: [
      [1.3, 103.8], // Singapore
      [-5.0, 90.0],
      [-15.0, 70.0],
      [-28.0, 45.0],
      [-34.8, 20.0], // Cape Agulhas
      [-34.0, 17.5], // Cape Town
      [-20.0, 5.0],
      [0.0, -10.0],
      [20.0, -20.0],
      [40.0, -15.0],
      [50.0, -2.0], // Channel entrance
    ],
  },
];

