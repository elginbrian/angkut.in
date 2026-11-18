import type {
  CartDeviceUnit,
  CartTrackerState,
  GeoQrBin,
  SmartReport,
  TongKuningUnit,
  WhatsAppNotification,
} from "@/types/angkut";

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const PHOTO_EVIDENCE_PRESETS = [
  {
    id: "overflow-open-bin",
    label: "Tong ember 25L terbuka & meluber",
    fileName: "bukti-tong-terbuka-joyosuko8.jpg",
    url: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">
        <rect width="400" height="260" fill="#e4e4e7"/>
        <rect y="185" width="400" height="75" fill="#a1a1aa"/>
        <rect x="0" y="180" width="400" height="8" fill="#71717a"/>
        <rect x="40" y="40" width="320" height="140" rx="6" fill="#d4d4d8"/>
        <path d="M135 120 L225 120 L215 215 L145 215 Z" fill="#18181b"/>
        <ellipse cx="180" cy="120" rx="45" ry="10" fill="#27272a"/>
        <circle cx="165" cy="108" r="18" fill="#f5f5f4" stroke="#d6d3d1" stroke-width="2"/>
        <circle cx="195" cy="106" r="20" fill="#10b981" opacity="0.85"/>
        <circle cx="180" cy="94" r="16" fill="#e4e4e7" stroke="#a1a1aa" stroke-width="1.5"/>
        <ellipse cx="118" cy="212" rx="22" ry="11" fill="#f5f5f4" stroke="#a8a29e" stroke-width="2"/>
        <ellipse cx="242" cy="216" rx="25" ry="12" fill="#27272a"/>
        <rect x="12" y="12" width="170" height="26" rx="6" fill="rgba(24,24,27,0.75)"/>
        <text x="22" y="29" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="600">Ember Terbuka • Meluber</text>
      </svg>
    `),
  },
  {
    id: "full-uncollected-bin",
    label: "Tong penuh belum terangkut",
    fileName: "bukti-tong-penuh-gg3.jpg",
    url: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">
        <rect width="400" height="260" fill="#e5e7eb"/>
        <rect y="185" width="400" height="75" fill="#9ca3af"/>
        <rect x="125" y="95" width="150" height="120" rx="10" fill="#3f3f46"/>
        <rect x="118" y="85" width="164" height="16" rx="5" fill="#27272a"/>
        <circle cx="165" cy="72" r="20" fill="#18181b"/>
        <circle cx="205" cy="68" r="22" fill="#f4f4f5" stroke="#d4d4d8" stroke-width="2"/>
        <circle cx="240" cy="78" r="16" fill="#18181b"/>
        <rect x="145" y="135" width="110" height="52" rx="4" fill="#fafafa"/>
        <rect x="153" y="143" width="24" height="24" fill="#18181b"/>
        <text x="184" y="159" fill="#18181b" font-family="monospace" font-size="11" font-weight="bold">GEOQR</text>
        <rect x="12" y="12" width="165" height="26" rx="6" fill="rgba(24,24,27,0.75)"/>
        <text x="22" y="29" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="600">Tong Penuh • &gt;24 Jam</text>
      </svg>
    `),
  },
  {
    id: "broken-yellow-bin",
    label: "Tong TPS rusak / pecah",
    fileName: "bukti-tong-tps-rusak.jpg",
    url: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">
        <rect width="400" height="260" fill="#e4e4e7"/>
        <rect y="190" width="400" height="70" fill="#71717a"/>
        <path d="M125 85 L260 90 L245 210 L135 210 Z" fill="#27272a"/>
        <path d="M190 120 L212 158 L195 190" fill="none" stroke="#e11d48" stroke-width="5" stroke-linecap="round"/>
        <rect x="120" y="72" width="142" height="14" rx="4" transform="rotate(-8 190 78)" fill="#18181b"/>
        <circle cx="152" cy="215" r="12" fill="#09090b"/>
        <circle cx="232" cy="218" r="8" fill="#52525b"/>
        <rect x="12" y="12" width="176" height="26" rx="6" fill="rgba(225,29,72,0.9)"/>
        <text x="22" y="29" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="600">Tong TPS Rusak / Bocor</text>
      </svg>
    `),
  },
];

export const MERJOSARI_STREET_PATH: Array<[number, number]> = [
  [-7.948303, 112.603203],
  [-7.948283, 112.603319],
  [-7.948259, 112.603486],
  [-7.948226, 112.603688],
  [-7.948158, 112.603705],
  [-7.948031, 112.603727],
  [-7.94797, 112.603726],
  [-7.947824, 112.60374],
  [-7.947621, 112.603749],
  [-7.94746, 112.603752],
  [-7.947434, 112.603753],
  [-7.947164, 112.603763],
  [-7.946912, 112.603768],
  [-7.946818, 112.60377],
  [-7.946689, 112.603777],
  [-7.946596, 112.603793],
  [-7.946401, 112.603827],
  [-7.946118, 112.603893],
  [-7.946235, 112.603939],
  [-7.946616, 112.604135],
  [-7.946679, 112.604182],
  [-7.946721, 112.604217],
  [-7.946761, 112.604273],
  [-7.946805, 112.604353],
  [-7.94687, 112.60448],
  [-7.946919, 112.604583],
  [-7.947023, 112.604789],
  [-7.94708, 112.604884],
  [-7.947151, 112.605012],
  [-7.947276, 112.605218],
  [-7.946894, 112.60533],
  [-7.946694, 112.605381],
  [-7.946271, 112.60549],
  [-7.945338, 112.605746],
];

export const TPS_MERJOSARI_COORDS = {
  lat: -7.945338,
  lng: 112.605746,
};

export const INITIAL_GEOQR_BINS: GeoQrBin[] = [
  {
    id: "tsid-mrjrwkps",
    name: "Kos Putri Joyosuko No. 14",
    shortLabel: "Hunian 01 • RT 01",
    address: "Jl. Joyosuko Gg. IV No. 14, Kel. Merjosari",
    rt: "RT 01",
    rw: "RW 12",
    kaplingName: "Kapling RT 01 & RT 02 RW 12",
    ownerLabel: "Pengelola Kos No. 14",
    ownerPhone: "+62 812-3401-8821",
    assignedCartCode: "GRB-MRJ-01",
    waypointIndex: 0,
    coordinates: { lat: MERJOSARI_STREET_PATH[0][0], lng: MERJOSARI_STREET_PATH[0][1] },
    lastPassedAt: "Hari ini, 06.42 WIB",
    hoursSinceLastPassed: 2,
    lastDwellSeconds: 44,
    lastDistanceMeters: 3.8,
    binCondition: "TERTUTUP_LAYAK",
    binTypeLabel: "Tong Tertutup 80L (2 Unit)",
    incentiveEligible: true,
    discountPercent: 15,
    monthlyFeeBase: 30000,
    pickupHistory: [
      { id: "LOG-02", timestamp: "06.35 WIB", dateLabel: "Kemarin", dwellSeconds: 39, distanceMeters: 4.2, cartCode: "GRB-MRJ-01" },
      { id: "LOG-03", timestamp: "07.12 WIB", dateLabel: "2 hari lalu", dwellSeconds: 51, distanceMeters: 3.1, cartCode: "GRB-MRJ-01" },
    ],
  },
  {
    id: "tsid-ggempatd",
    name: "Hunian Jl. Joyosuko Gg. IV No. 2",
    shortLabel: "Hunian 02 • RT 01",
    address: "Simpang Jl. Joyosuko Gg. IV No. 2, Kel. Merjosari",
    rt: "RT 01",
    rw: "RW 12",
    kaplingName: "Kapling RT 01 & RT 02 RW 12",
    ownerLabel: "Pemilik Rumah No. 2",
    ownerPhone: "+62 812-7701-1102",
    assignedCartCode: "GRB-MRJ-01",
    waypointIndex: 3,
    coordinates: { lat: MERJOSARI_STREET_PATH[3][0], lng: MERJOSARI_STREET_PATH[3][1] },
    lastPassedAt: "Hari ini, 06.46 WIB",
    hoursSinceLastPassed: 2,
    lastDwellSeconds: 36,
    lastDistanceMeters: 4.1,
    binCondition: "TERTUTUP_LAYAK",
    binTypeLabel: "Tong Tertutup 60L (1 Unit)",
    incentiveEligible: true,
    discountPercent: 15,
    monthlyFeeBase: 25000,
    pickupHistory: [
      { id: "LOG-04", timestamp: "06.40 WIB", dateLabel: "Kemarin", dwellSeconds: 35, distanceMeters: 3.9, cartCode: "GRB-MRJ-01" },
    ],
  },
  {
    id: "tsid-jyskselz",
    name: "Warung & Kos Pak Budi No. 4",
    shortLabel: "Hunian 03 • RT 01",
    address: "Jl. Joyosuko Selatan No. 4, Kel. Merjosari",
    rt: "RT 01",
    rw: "RW 12",
    kaplingName: "Kapling RT 01 & RT 02 RW 12",
    ownerLabel: "Bpk. Budi Santoso",
    ownerPhone: "+62 857-9120-3304",
    assignedCartCode: "GRB-MRJ-01",
    waypointIndex: 6,
    coordinates: { lat: MERJOSARI_STREET_PATH[6][0], lng: MERJOSARI_STREET_PATH[6][1] },
    lastPassedAt: "Hari ini, 06.50 WIB",
    hoursSinceLastPassed: 2,
    lastDwellSeconds: 49,
    lastDistanceMeters: 3.4,
    binCondition: "TERBUKA_KURANG_KAPASITAS",
    binTypeLabel: "Tong Terbuka 40L (Kapasitas Kurang)",
    incentiveEligible: false,
    discountPercent: 0,
    monthlyFeeBase: 30000,
    pickupHistory: [],
  },
  {
    id: "tsid-jysktrkn",
    name: "Kontrakan Jl. Joyosuko No. 8",
    shortLabel: "Hunian 04 • RT 01",
    address: "Jl. Joyosuko No. 8, Kel. Merjosari",
    rt: "RT 01",
    rw: "RW 12",
    kaplingName: "Kapling RT 01 & RT 02 RW 12",
    ownerLabel: "Pemilik Kontrakan No. 8",
    ownerPhone: "+62 813-5922-4410",
    assignedCartCode: "GRB-MRJ-01",
    waypointIndex: 10,
    coordinates: { lat: MERJOSARI_STREET_PATH[10][0], lng: MERJOSARI_STREET_PATH[10][1] },
    lastPassedAt: "Hari ini, 06.55 WIB",
    hoursSinceLastPassed: 2,
    lastDwellSeconds: 38,
    lastDistanceMeters: 4.5,
    binCondition: "TERBUKA_KURANG_KAPASITAS",
    binTypeLabel: "Ember Terbuka 25L (Kapasitas Kurang)",
    incentiveEligible: false,
    discountPercent: 0,
    monthlyFeeBase: 30000,
    pickupHistory: [
      { id: "LOG-12", timestamp: "06.48 WIB", dateLabel: "Kemarin", dwellSeconds: 36, distanceMeters: 4.9, cartCode: "GRB-MRJ-01" },
    ],
  },
  {
    id: "tsid-jyskutrw",
    name: "Asrama Mahasiswa Kav. 11",
    shortLabel: "Hunian 05 • RT 01",
    address: "Jl. Joyosuko Utara Kav. 11, Kel. Merjosari",
    rt: "RT 01",
    rw: "RW 12",
    kaplingName: "Kapling RT 01 & RT 02 RW 12",
    ownerLabel: "Pengurus Asrama Kav. 11",
    ownerPhone: "+62 821-4098-2211",
    assignedCartCode: "GRB-MRJ-01",
    waypointIndex: 14,
    coordinates: { lat: MERJOSARI_STREET_PATH[14][0], lng: MERJOSARI_STREET_PATH[14][1] },
    lastPassedAt: "Hari ini, 07.01 WIB",
    hoursSinceLastPassed: 1,
    lastDwellSeconds: 54,
    lastDistanceMeters: 3.2,
    binCondition: "TERTUTUP_LAYAK",
    binTypeLabel: "Tong Tertutup 120L (2 Unit)",
    incentiveEligible: true,
    discountPercent: 15,
    monthlyFeeBase: 35000,
    pickupHistory: [],
  },
  {
    id: "tsid-smpgutra",
    name: "Titik Komunal Sudut Utara",
    shortLabel: "Komunal 01 • RT 01",
    address: "Sudut Utara Jl. Joyosuko, Kel. Merjosari",
    rt: "RT 01",
    rw: "RW 12",
    kaplingName: "Kapling RT 01 & RT 02 RW 12",
    ownerLabel: "Sarana Komunal RT 01",
    ownerPhone: "+62 812-3340-8812",
    assignedCartCode: "GRB-MRJ-01",
    waypointIndex: 17,
    coordinates: { lat: MERJOSARI_STREET_PATH[17][0], lng: MERJOSARI_STREET_PATH[17][1] },
    lastPassedAt: "Hari ini, 07.05 WIB",
    hoursSinceLastPassed: 1,
    lastDwellSeconds: 62,
    lastDistanceMeters: 4.0,
    binCondition: "TERTUTUP_LAYAK",
    binTypeLabel: "Bak Komunal Tertutup 240L",
    incentiveEligible: false,
    discountPercent: 0,
    monthlyFeeBase: 0,
    pickupHistory: [],
  },
  {
    id: "tsid-jystmats",
    name: "Kontrakan Joyosuko Timur No. 5",
    shortLabel: "Hunian 06 • RT 02",
    address: "Jl. Joyosuko Timur No. 5, Kel. Merjosari",
    rt: "RT 02",
    rw: "RW 12",
    kaplingName: "Kapling RT 01 & RT 02 RW 12",
    ownerLabel: "Pengelola Kontrakan No. 5",
    ownerPhone: "+62 815-5501-4405",
    assignedCartCode: "GRB-MRJ-02",
    waypointIndex: 21,
    coordinates: { lat: MERJOSARI_STREET_PATH[21][0], lng: MERJOSARI_STREET_PATH[21][1] },
    lastPassedAt: "Hari ini, 07.09 WIB",
    hoursSinceLastPassed: 1,
    lastDwellSeconds: 37,
    lastDistanceMeters: 3.9,
    binCondition: "TERTUTUP_LAYAK",
    binTypeLabel: "Tong Tertutup 80L (1 Unit)",
    incentiveEligible: true,
    discountPercent: 15,
    monthlyFeeBase: 30000,
    pickupHistory: [],
  },
  {
    id: "tsid-jystmrkv",
    name: "Hunian Jl. Joyosuko Timur No. 21",
    shortLabel: "Hunian 07 • RT 02",
    address: "Jl. Joyosuko Timur No. 21, Kel. Merjosari",
    rt: "RT 02",
    rw: "RW 12",
    kaplingName: "Kapling RT 01 & RT 02 RW 12",
    ownerLabel: "Penghuni Kav. 21",
    ownerPhone: "+62 856-4810-9932",
    assignedCartCode: "GRB-MRJ-02",
    waypointIndex: 26,
    coordinates: { lat: MERJOSARI_STREET_PATH[26][0], lng: MERJOSARI_STREET_PATH[26][1] },
    lastPassedAt: "Kemarin lusa, 07.10 WIB",
    hoursSinceLastPassed: 38,
    lastDwellSeconds: 41,
    lastDistanceMeters: 5.2,
    binCondition: "TERTUTUP_LAYAK",
    binTypeLabel: "Tong Tertutup 60L (1 Unit)",
    incentiveEligible: true,
    discountPercent: 15,
    monthlyFeeBase: 25000,
    pickupHistory: [
      { id: "LOG-22", timestamp: "06.50 WIB", dateLabel: "3 hari lalu", dwellSeconds: 47, distanceMeters: 4.0, cartCode: "GRB-MRJ-02" },
    ],
  },
  {
    id: "tsid-mrjsrigg",
    name: "Kos Merjosari Indah No. 9",
    shortLabel: "Hunian 08 • RT 02",
    address: "Jl. Merjosari Gg. III No. 9, Kel. Merjosari",
    rt: "RT 02",
    rw: "RW 12",
    kaplingName: "Kapling RT 01 & RT 02 RW 12",
    ownerLabel: "Pengelola Kos Indah No. 9",
    ownerPhone: "+62 813-9011-7709",
    assignedCartCode: "GRB-MRJ-02",
    waypointIndex: 29,
    coordinates: { lat: MERJOSARI_STREET_PATH[29][0], lng: MERJOSARI_STREET_PATH[29][1] },
    lastPassedAt: "Kemarin, 07.14 WIB",
    hoursSinceLastPassed: 27,
    lastDwellSeconds: 43,
    lastDistanceMeters: 4.4,
    binCondition: "TERBUKA_KURANG_KAPASITAS",
    binTypeLabel: "Tong Terbuka 35L (Kapasitas Kurang)",
    incentiveEligible: false,
    discountPercent: 0,
    monthlyFeeBase: 30000,
    pickupHistory: [],
  },
  {
    id: "tsid-kmnlsmpj",
    name: "Titik Komunal Simpang Joyosuko",
    shortLabel: "Komunal 02 • TPS",
    address: "Simpang Jl. Joyosuko – Akses TPS Merjosari",
    rt: "RT 02",
    rw: "RW 12",
    kaplingName: "Kapling RT 01 & RT 02 RW 12",
    ownerLabel: "Sarana Komunal RW 12",
    ownerPhone: "+62 812-3340-7700",
    assignedCartCode: "GRB-MRJ-02",
    waypointIndex: 31,
    coordinates: { lat: MERJOSARI_STREET_PATH[31][0], lng: MERJOSARI_STREET_PATH[31][1] },
    lastPassedAt: "Hari ini, 07.18 WIB",
    hoursSinceLastPassed: 1,
    lastDwellSeconds: 65,
    lastDistanceMeters: 3.2,
    binCondition: "KOMUNAL_RUSAK",
    binTypeLabel: "Bak Komunal 240L (Engsel Tutup Patah)",
    incentiveEligible: false,
    discountPercent: 0,
    monthlyFeeBase: 0,
    pickupHistory: [
      { id: "LOG-31", timestamp: "07.05 WIB", dateLabel: "Kemarin", dwellSeconds: 61, distanceMeters: 3.4, cartCode: "GRB-MRJ-02" },
    ],
  },
];

export const INITIAL_CART_STATE: CartTrackerState = {
  cartCode: "GRB-MRJ-01",
  kapling: "RT 01 & RT 02 RW 12 Joyosuko → TPS Merjosari",
  status: "MENUNGGU_IOT",
  currentBinId: "tsid-mrjrwkps",
  currentLocationLabel: "Menunggu sinyal Web Mock IoT",
  coordinates: null,
  tpsWaitDurationMinutes: 0,
  ritaseToday: 2,
  batteryPercent: 86,
  gsmSignal: "Menunggu sinyal Web IoT",
  lastSyncAt: "Belum ada sinyal",
};

export const INITIAL_CART_DEVICES: CartDeviceUnit[] = [
  {
    id: "DEV-01",
    cartCode: "GRB-MRJ-01",
    kapling: "Rute RT 01 RW 12 Joyosuko",
    hardwareSpec: "Web Mock IoT GPS Transmitter",
    gpsStatus: "OFFLINE",
    batteryPercent: 86,
    gsmSignal: "Siaga (Menunggu Web IoT)",
    lastSyncAt: "Belum terhubung",
    geofenceTriggerCountToday: 24,
  },
  {
    id: "DEV-02",
    cartCode: "GRB-MRJ-02",
    kapling: "Rute RT 02 RW 12 Joyosuko",
    hardwareSpec: "Web Mock IoT GPS Transmitter",
    gpsStatus: "LEMAH",
    batteryPercent: 34,
    gsmSignal: "Siaga (Menunggu Web IoT)",
    lastSyncAt: "14 menit lalu",
    geofenceTriggerCountToday: 11,
  },
];

export const INITIAL_REPORTS: SmartReport[] = [
  {
    id: "REP-101",
    ticketCode: "ANG-RTRW-084",
    binId: "tsid-jysktrkn",
    binName: "Kontrakan Jl. Joyosuko No. 8",
    rtRwLabel: "RT 01 / RW 12",
    category: "MELUBER_BAU",
    categoryLabel: "Sampah Meluber / Bau Menyengat",
    description:
      "Ember terbuka ukuran 25L terlalu kecil untuk 6 penghuni kontrakan sehingga sampah meluber meski gerobak pagi sudah mengangkut.",
    photoLabel: PHOTO_EVIDENCE_PRESETS[0].fileName,
    photoUrl: PHOTO_EVIDENCE_PRESETS[0].url,
    reporterDistanceMeters: 8,
    gpsValid: true,
    createdAt: "Hari ini, 08.15 WIB",
    status: "DITERUSKAN_KE_RTRW",
    workflowStage: "BARU",
    escalationTarget: "RT_RW_TEGURAN_HUNIAN",
    escalationLabel: "Pengurus RT 01/RW 12 (Penertiban Tong Hunian)",
    routingReason:
      "Sensor GRB-MRJ-01 mencatat pengangkutan sudah berjalan (Hari ini, 06.55 WIB, berhenti 38 detik). Keluhan diteruskan ke RT/RW untuk evaluasi kapasitas tong hunian.",
  },
  {
    id: "REP-102",
    ticketCode: "ANG-RTRW-083",
    binId: "tsid-jystmrkv",
    binName: "Hunian Jl. Joyosuko Timur No. 21",
    rtRwLabel: "RT 02 / RW 12",
    category: "BELUM_DIANGKUT",
    categoryLabel: "Tong Penuh / Belum Diangkut",
    description:
      "Sampah rumah tangga belum terambil sejak kemarin lusa pagi sehingga tong penuh.",
    photoLabel: PHOTO_EVIDENCE_PRESETS[1].fileName,
    photoUrl: PHOTO_EVIDENCE_PRESETS[1].url,
    reporterDistanceMeters: 14,
    gpsValid: true,
    createdAt: "Hari ini, 07.50 WIB",
    status: "DITERUSKAN_KE_RTRW",
    workflowStage: "BARU",
    escalationTarget: "RT_RW_OPERASIONAL",
    escalationLabel: "Pengurus RT 02/RW 12 & Koordinator Rute",
    routingReason:
      "Log sensor GRB-MRJ-02 belum mencatat kunjungan di titik tsid-jystmrkv selama 38 jam (>24 jam).",
  },
  {
    id: "REP-103",
    ticketCode: "DLH-MRJ-209",
    binId: "tsid-kmnlsmpj",
    binName: "Titik Komunal Simpang Joyosuko",
    rtRwLabel: "RT 02 / RW 12",
    category: "KERUSAKAN_SARANA",
    categoryLabel: "Kerusakan Sarana / Tong Kuning TPS",
    description:
      "Sebanyak 11 dari 18 unit tong kuning di TPS Merjosari mengalami kerusakan roda atau dasar bocor serta tutup bak komunal patah.",
    photoLabel: PHOTO_EVIDENCE_PRESETS[2].fileName,
    photoUrl: PHOTO_EVIDENCE_PRESETS[2].url,
    reporterDistanceMeters: 19,
    gpsValid: true,
    createdAt: "Kemarin, 14.30 WIB",
    status: "DITERUSKAN_KE_DLH",
    workflowStage: "DITINDAKLANJUTI",
    escalationTarget: "DLH_ASET_SARANA",
    escalationLabel: "Bidang Sarpras DLH Kota Malang",
    routingReason:
      "Laporan kerusakan bak komunal atau unit tong kuning TPS diteruskan ke DLH untuk inspeksi dan peremajaan alat.",
    adminActionNote: "Sedang diverifikasi inventaris 18 unit di TPS Merjosari.",
  },
];

export const INITIAL_WHATSAPP_LOGS: WhatsAppNotification[] = [
  {
    id: "WA-01",
    recipientRole: "Ketua RT 01 / RW 12",
    recipientPhone: "+62 812-3340-8812",
    timestamp: "08.15",
    messageType: "TEGURAN_HUNIAN",
    relatedBinId: "tsid-jysktrkn",
    relatedReportId: "REP-101",
    content:
      "*[ANGKUT.IN • PENERTIBAN TONG HUNIAN]*\nTiket: ANG-RTRW-084\nLokasi: Kontrakan Jl. Joyosuko No. 8\n\n✅ Log unit *GRB-MRJ-01* mencatat pengangkutan SUDAH dilakukan pukul 06.55 WIB (berhenti 38 dtk, jarak 4.5m).\n\n⚠️ Warga melaporkan sampah meluber karena ember terbuka 25L tidak mencukupi. Mohon tindak lanjut teguran ke pemilik hunian.",
  },
  {
    id: "WA-02",
    recipientRole: "Ketua RT 02 & Koordinator Rute",
    recipientPhone: "+62 813-5910-4402",
    timestamp: "07.50",
    messageType: "OPERASIONAL_RUTE",
    relatedBinId: "tsid-jystmrkv",
    relatedReportId: "REP-102",
    content:
      "*[ANGKUT.IN • EVALUASI RUTE GEROBAK]*\nTiket: ANG-RTRW-083\nLokasi: Hunian Jl. Joyosuko Timur No. 21\n\n🚨 Sensor *GRB-MRJ-02* belum memasuki radius 10m titik ini selama *38 jam*. Mohon koordinasikan pengambilan hari ini.",
  },
];

export const INITIAL_TONG_KUNING_UNITS: TongKuningUnit[] = [
  { id: "TK-01", code: "TK-MRJ-01", zone: "Bongkar Muat Barat", condition: "LAYAK", defectNote: "Kondisi baik, roda dan tutup utuh", lastInspected: "14 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-02", code: "TK-MRJ-02", zone: "Bongkar Muat Barat", condition: "LAYAK", defectNote: "Kondisi baik, roda dan tutup utuh", lastInspected: "14 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-03", code: "TK-MRJ-03", zone: "Bongkar Muat Barat", condition: "LAYAK", defectNote: "Kondisi baik", lastInspected: "14 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-04", code: "TK-MRJ-04", zone: "Jalur Tengah TPS", condition: "LAYAK", defectNote: "Kondisi baik", lastInspected: "14 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-05", code: "TK-MRJ-05", zone: "Jalur Tengah TPS", condition: "LAYAK", defectNote: "Kondisi baik", lastInspected: "14 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-06", code: "TK-MRJ-06", zone: "Jalur Timur TPS", condition: "LAYAK", defectNote: "Kondisi baik", lastInspected: "14 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-07", code: "TK-MRJ-07", zone: "Jalur Timur TPS", condition: "LAYAK", defectNote: "Kondisi baik", lastInspected: "14 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-08", code: "TK-MRJ-08", zone: "Bongkar Muat Barat", condition: "RUSAK_RINGAN", defectNote: "Engsel tutup atas patah", lastInspected: "13 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-09", code: "TK-MRJ-09", zone: "Bongkar Muat Barat", condition: "RUSAK_RINGAN", defectNote: "1 roda belakang macet / patah", lastInspected: "13 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-10", code: "TK-MRJ-10", zone: "Jalur Tengah TPS", condition: "RUSAK_RINGAN", defectNote: "Pegangan dorong bengkok", lastInspected: "13 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-11", code: "TK-MRJ-11", zone: "Jalur Tengah TPS", condition: "RUSAK_RINGAN", defectNote: "Engsel tutup patah & retak sudut", lastInspected: "13 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-12", code: "TK-MRJ-12", zone: "Jalur Timur TPS", condition: "RUSAK_RINGAN", defectNote: "Karet roda terlepas", lastInspected: "13 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-13", code: "TK-MRJ-13", zone: "Jalur Timur TPS", condition: "RUSAK_RINGAN", defectNote: "Penutup hilang", lastInspected: "13 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-14", code: "TK-MRJ-14", zone: "Zona Transfer Timur", condition: "RUSAK_BERAT", defectNote: "Dasar tong pecah & rembes air lindi", lastInspected: "12 Nov 2026", spkStatus: "DIAJUKAN_SPK" },
  { id: "TK-15", code: "TK-MRJ-15", zone: "Zona Transfer Timur", condition: "RUSAK_BERAT", defectNote: "Dinding samping retak panjang", lastInspected: "12 Nov 2026", spkStatus: "DIAJUKAN_SPK" },
  { id: "TK-16", code: "TK-MRJ-16", zone: "Zona Transfer Barat", condition: "RUSAK_BERAT", defectNote: "Kedua roda belakang hancur & berlubang", lastInspected: "12 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-17", code: "TK-MRJ-17", zone: "Jalur Timur TPS", condition: "RUSAK_BERAT", defectNote: "Bodi terbelah, tidak layak pakai", lastInspected: "12 Nov 2026", spkStatus: "TIDAK_ADA" },
  { id: "TK-18", code: "TK-MRJ-18", zone: "Jalur Timur TPS", condition: "RUSAK_BERAT", defectNote: "Dasar bocor & besi pengait patah", lastInspected: "12 Nov 2026", spkStatus: "TIDAK_ADA" },
];
