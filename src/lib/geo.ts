/**
 * Curated geographic tree used by the cascading location picker.
 *
 * India is modelled at full depth: State/UT → District → specific locations.
 * Other countries are modelled one level shallower (region → locations) because
 * their administrative subdivisions are less useful for weather lookups.
 *
 * Every leaf carries real coordinates so the forecast can be fetched directly.
 */

export interface GeoPlace {
  name: string;
  lat: number;
  lon: number;
}

export interface GeoDistrict {
  name: string;
  locations: GeoPlace[];
}

export interface GeoRegion {
  name: string;
  /** full depth (India) */
  districts?: GeoDistrict[];
  /** shallow depth (other countries) */
  locations?: GeoPlace[];
}

export interface GeoCountry {
  name: string;
  code: string;
  regions: GeoRegion[];
}

/* compact tuple shapes: [name, lat, lon] and [name, places] */
type P = [string, number, number];
type Districts = [string, P[]][];
type IndiaState = [string, Districts];
type IndiaRaw = [string, string, IndiaState[]];
type ShallowRaw = [string, string, [string, P[]][]];

const place = ([name, lat, lon]: P): GeoPlace => ({ name, lat, lon });

const buildIndia = (raw: IndiaRaw): GeoCountry => ({
  name: raw[0],
  code: raw[1],
  regions: raw[2].map(([rn, districts]): GeoRegion => ({
    name: rn,
    districts: districts.map(([dn, locs]) => ({ name: dn, locations: locs.map(place) })),
  })),
});

const buildShallow = (raw: ShallowRaw): GeoCountry => ({
  name: raw[0],
  code: raw[1],
  regions: raw[2].map(([rn, locs]): GeoRegion => ({ name: rn, locations: locs.map(place) })),
});

/* ================================================================
   INDIA — 28 states + 8 union territories
================================================================ */

const INDIA: IndiaRaw = [
  "India",
  "IN",
  [
    /* ---------- Andhra Pradesh ---------- */
    [
      "Andhra Pradesh",
      [
        ["Visakhapatnam", [["Visakhapatnam", 17.6868, 83.2185], ["Gajuwaka", 17.68, 83.19], ["Bheemunipatnam", 17.79, 83.41]]],
        ["Krishna", [["Vijayawada", 16.5062, 80.648], ["Machilipatnam", 16.1875, 81.1375], ["Gudivada", 16.44, 80.99]]],
        ["Guntur", [["Guntur", 16.3067, 80.4365], ["Tenali", 16.24, 80.64], ["Narasaraopet", 16.23, 80.04]]],
        ["Chittoor", [["Tirupati", 13.6288, 79.4192], ["Chittoor", 13.2172, 79.1003], ["Palamaner", 13.2, 78.75]]],
        ["East Godavari", [["Rajahmundry", 17.0005, 81.804], ["Kakinada", 16.9891, 82.2475], ["Amalapuram", 16.58, 82.01]]],
        ["Anantapur", [["Anantapur", 14.6819, 77.6006], ["Hindupur", 13.83, 77.49], ["Tadipatri", 14.91, 78.26]]],
        ["Sri Potti Sriramulu Nellore", [["Nellore", 14.4426, 79.9865], ["Kavali", 14.92, 79.99], ["Naidupet", 14.11, 79.9]]],
        ["Kurnool", [["Kurnool", 15.8281, 78.0373], ["Nandyal", 15.48, 78.48], ["Adoni", 15.63, 77.28]]],
      ],
    ],

    /* ---------- Arunachal Pradesh ---------- */
    [
      "Arunachal Pradesh",
      [
        ["Papum Pare", [["Itanagar", 27.0844, 93.6053], ["Naharlagun", 27.1, 93.69], ["Doimukh", 27.14, 93.75]]],
        ["West Kameng", [["Bomdila", 27.26, 92.42], ["Dirang", 27.34, 92.23], ["Tawang", 27.58, 91.87]]],
        ["Changlang", [["Changlang", 27.53, 95.72], ["Nampong", 27.3, 95.96], ["Jairampur", 27.4, 95.9]]],
        ["Tirap", [["Khonsa", 27.02, 95.57], ["Deomali", 27.16, 95.34], ["Longding", 27.06, 95.34]]],
      ],
    ],

    /* ---------- Assam ---------- */
    [
      "Assam",
      [
        ["Kamrup Metropolitan", [["Guwahati", 26.1445, 91.7362], ["Dispur", 26.14, 91.79], ["North Guwahati", 26.19, 91.67]]],
        ["Dibrugarh", [["Dibrugarh", 27.4728, 94.912], ["Naharkatia", 27.36, 95.12], ["Duliajan", 27.38, 95.11]]],
        ["Cachar", [["Silchar", 24.8333, 92.7789], ["Lakhipur", 24.82, 93.0], ["Sonai", 24.95, 92.78]]],
        ["Jorhat", [["Jorhat", 26.7509, 94.2037], ["Mariani", 26.65, 94.33], ["Titabor", 26.6, 94.2]]],
        ["Sonitpur", [["Tezpur", 26.6333, 92.8], ["Rangapara", 26.82, 92.98], ["Dhekiajuli", 26.7, 92.9]]],
        ["Nagaon", [["Nagaon", 26.3464, 92.6836], ["Hojai", 26.11, 92.86], ["Kaliabor", 26.57, 92.57]]],
      ],
    ],

    /* ---------- Bihar ---------- */
    [
      "Bihar",
      [
        ["Patna", [["Patna", 25.5941, 85.1376], ["Danapur", 25.63, 85.05], ["Khagaul", 25.58, 85.05]]],
        ["Gaya", [["Gaya", 24.7914, 85.0002], ["Bodh Gaya", 24.6961, 84.9911], ["Sherghati", 24.28, 84.79]]],
        ["Muzaffarpur", [["Muzaffarpur", 26.1197, 85.391], ["Motihari", 26.65, 84.92], ["Sitamarhi", 26.59, 85.49]]],
        ["Bhagalpur", [["Bhagalpur", 25.2425, 86.9842], ["Naugachhia", 25.39, 87.1], ["Sultanganj", 25.24, 86.73]]],
        ["Darbhanga", [["Darbhanga", 26.1524, 85.9336], ["Madhubani", 26.35, 86.07], ["Jhanjharpur", 26.27, 86.28]]],
        ["Purnia", [["Purnia", 25.7786, 87.4744], ["Katihar", 25.54, 87.58], ["Kishanganj", 26.1, 87.95]]],
        ["Rohtas", [["Sasaram", 24.95, 84.03], ["Dehri", 24.9, 84.18], ["Bikramganj", 25.21, 84.25]]],
      ],
    ],

    /* ---------- Chhattisgarh ---------- */
    [
      "Chhattisgarh",
      [
        ["Raipur", [["Raipur", 21.2514, 81.6296], ["Dharsiva", 21.19, 81.66], ["Abhanpur", 21.04, 81.51]]],
        ["Durg", [["Bhilai", 21.2094, 81.4279], ["Durg", 21.1904, 81.2849], ["Patan", 21.05, 81.31]]],
        ["Bilaspur", [["Bilaspur", 22.0797, 82.1409], ["Korba", 22.35, 82.68], ["Ratanpur", 22.32, 82.16]]],
        ["Bastar", [["Jagdalpur", 19.08, 82.02], ["Bastar", 19.31, 81.96], ["Kondagaon", 19.6, 81.65]]],
        ["Surguja", [["Ambikapur", 23.12, 83.2], ["Surajpur", 23.22, 82.87], ["Baikunthpur", 23.72, 82.6]]],
        ["Raigarh", [["Raigarh", 21.9, 83.4], ["Kharsia", 22.07, 83.12], ["Sarangarh", 21.64, 83.13]]],
      ],
    ],

    /* ---------- Goa ---------- */
    [
      "Goa",
      [
        ["North Goa", [["Panaji", 15.4909, 73.8278], ["Mapusa", 15.59, 73.81], ["Calangute", 15.54, 73.76]]],
        ["South Goa", [["Margao", 15.2993, 74.124], ["Vasco da Gama", 15.39, 73.81], ["Quepem", 15.21, 74.1]]],
      ],
    ],

    /* ---------- Gujarat ---------- */
    [
      "Gujarat",
      [
        ["Ahmedabad", [["Ahmedabad", 23.0225, 72.5714], ["Sanand", 22.99, 72.38], ["Dholka", 22.72, 72.43]]],
        ["Gandhinagar", [["Gandhinagar", 23.2156, 72.6369], ["Kalol", 23.25, 72.5], ["Mansa", 23.43, 72.66]]],
        ["Surat", [["Surat", 21.1702, 72.8311], ["Bardoli", 21.12, 73.12], ["Vyara", 21.11, 73.4]]],
        ["Vadodara", [["Vadodara", 22.3072, 73.1812], ["Anand", 22.56, 72.95], ["Navsari", 20.95, 72.93]]],
        ["Rajkot", [["Rajkot", 22.3039, 70.8022], ["Morbi", 22.82, 70.84], ["Gondal", 21.96, 70.8]]],
        ["Kutch", [["Bhuj", 23.242, 69.6669], ["Mandvi", 22.84, 69.35], ["Anjar", 23.11, 70.02]]],
        ["Junagadh", [["Junagadh", 21.5222, 70.4579], ["Veraval", 20.91, 70.37], ["Somnath", 20.89, 70.4]]],
        ["Bhavnagar", [["Bhavnagar", 21.7645, 72.1519], ["Palitana", 21.52, 71.82], ["Sihor", 21.7, 71.96]]],
        ["Sabarkantha", [["Himatnagar", 23.6, 72.96], ["Idar", 23.84, 73.0], ["Prantij", 23.44, 72.86]]],
      ],
    ],

    /* ---------- Haryana ---------- */
    [
      "Haryana",
      [
        ["Gurugram", [["Gurugram", 28.4595, 77.0266], ["Sohna", 28.25, 77.06], ["Pataudi", 28.33, 76.78]]],
        ["Faridabad", [["Faridabad", 28.4089, 77.3178], ["Palwal", 28.14, 77.33], ["Ballabgarh", 28.34, 77.32]]],
        ["Hisar", [["Hisar", 29.1492, 75.7217], ["Fatehabad", 29.51, 75.3], ["Barwala", 29.38, 75.91]]],
        ["Rohtak", [["Rohtak", 28.8955, 76.6066], ["Jhajjar", 28.61, 76.65], ["Bahadurgarh", 28.69, 76.94]]],
        ["Ambala", [["Ambala", 30.3782, 76.7767], ["Naraingarh", 30.48, 77.14], ["Barara", 30.37, 76.98]]],
        ["Karnal", [["Karnal", 29.6857, 76.9905], ["Panipat", 29.3909, 76.9635], ["Kaithal", 29.8, 76.4]]],
      ],
    ],

    /* ---------- Himachal Pradesh ---------- */
    [
      "Himachal Pradesh",
      [
        ["Shimla", [["Shimla", 31.1048, 77.1734], ["Theog", 31.09, 77.39], ["Kufri", 31.1, 77.26]]],
        ["Kangra", [["Dharamshala", 32.219, 76.3234], ["Palampur", 32.11, 76.54], ["Mcleod Ganj", 32.24, 76.32]]],
        ["Kullu", [["Kullu", 31.9578, 77.1095], ["Manali", 32.2432, 77.1892], ["Naggar", 32.12, 77.17]]],
        ["Mandi", [["Mandi", 31.7085, 76.9314], ["Sundernagar", 31.53, 76.88], ["Jogindernagar", 31.98, 76.77]]],
        ["Solan", [["Solan", 30.9086, 77.1], ["Kasauli", 30.9, 76.96], ["Parwanoo", 30.86, 76.94]]],
      ],
    ],

    /* ---------- Jharkhand ---------- */
    [
      "Jharkhand",
      [
        ["Ranchi", [["Ranchi", 23.3441, 85.3096], ["Khunti", 23.04, 85.52], ["Bundu", 23.15, 85.59]]],
        ["Dhanbad", [["Dhanbad", 23.7957, 86.4304], ["Jharia", 23.76, 86.42], ["Nirsa", 23.7, 86.71]]],
        ["Bokaro", [["Bokaro Steel City", 23.67, 86.15], ["Chas", 23.64, 86.17], ["Phusro", 23.77, 85.99]]],
        ["East Singhbhum", [["Jamshedpur", 22.8046, 86.2029], ["Ghatshila", 22.61, 86.49], ["Patamda", 22.69, 86.27]]],
        ["Deoghar", [["Deoghar", 24.4799, 86.6969], ["Madhupur", 24.25, 86.65], ["Jasidih", 24.51, 86.65]]],
        ["Hazaribagh", [["Hazaribagh", 23.99, 85.36], ["Ramgarh", 23.63, 85.52], ["Chatra", 24.21, 84.87]]],
      ],
    ],

    /* ---------- Karnataka ---------- */
    [
      "Karnataka",
      [
        ["Bengaluru Urban", [["Bengaluru", 12.9716, 77.5946], ["Yelahanka", 13.1, 77.6], ["Electronic City", 12.85, 77.66]]],
        ["Mysuru", [["Mysuru", 12.2958, 76.6394], ["Nanjangud", 12.12, 76.69], ["Mandya", 12.52, 76.9]]],
        ["Dakshina Kannada", [["Mangaluru", 12.9141, 74.856], ["Ullal", 12.81, 74.85], ["Bantwal", 12.9, 75.03]]],
        ["Hubballi-Dharwad", [["Hubballi", 15.3647, 75.124], ["Dharwad", 15.4589, 75.0078], ["Gadag", 15.43, 75.63]]],
        ["Belagavi", [["Belagavi", 15.8497, 74.4977], ["Chikkodi", 16.42, 74.62], ["Gokak", 16.17, 74.82]]],
        ["Uttara Kannada", [["Karwar", 14.81, 74.13], ["Sirsi", 14.62, 74.85], ["Kumta", 14.42, 74.41]]],
        ["Kodagu", [["Madikeri", 12.42, 75.74], ["Virajpet", 12.2, 75.8], ["Kushalanagar", 12.47, 75.96]]],
        ["Hassan", [["Hassan", 13.0068, 76.0962], ["Chikkamagaluru", 13.32, 75.77], ["Arsikere", 13.31, 76.26]]],
      ],
    ],

    /* ---------- Kerala ---------- */
    [
      "Kerala",
      [
        ["Thiruvananthapuram", [["Thiruvananthapuram", 8.5241, 76.9366], ["Neyyattinkara", 8.4, 77.11], ["Attingal", 8.69, 76.82]]],
        ["Ernakulam", [["Kochi", 9.9312, 76.2673], ["Aluva", 10.1, 76.36], ["Muvattupuzha", 9.98, 76.58]]],
        ["Kozhikode", [["Kozhikode", 11.2588, 75.7804], ["Vadakara", 11.61, 75.59], ["Koyilandy", 11.43, 75.71]]],
        ["Thrissur", [["Thrissur", 10.5276, 76.2144], ["Guruvayur", 10.59, 76.04], ["Chavakkad", 10.53, 76.05]]],
        ["Idukki", [["Munnar", 10.0889, 77.0595], ["Thodupuzha", 9.9, 76.72], ["Painavu", 9.85, 76.93]]],
        ["Alappuzha", [["Alappuzha", 9.4981, 76.3388], ["Chengannur", 9.32, 76.61], ["Kayamkulam", 9.18, 76.5]]],
        ["Wayanad", [["Kalpetta", 11.61, 76.08], ["Sultan Bathery", 11.68, 76.24], ["Mananthavady", 11.8, 75.98]]],
      ],
    ],

    /* ---------- Madhya Pradesh ---------- */
    [
      "Madhya Pradesh",
      [
        ["Bhopal", [["Bhopal", 23.2599, 77.4126], ["Sehore", 23.2, 77.09], ["Vidisha", 23.52, 77.81]]],
        ["Indore", [["Indore", 22.7196, 75.8577], ["Dewas", 22.96, 76.05], ["Mhow", 22.55, 75.76]]],
        ["Ujjain", [["Ujjain", 23.1793, 75.7849], ["Ratlam", 23.33, 75.04], ["Nagda", 23.09, 75.41]]],
        ["Jabalpur", [["Jabalpur", 23.1815, 79.9864], ["Sihora", 23.48, 80.11], ["Patan", 23.29, 79.99]]],
        ["Gwalior", [["Gwalior", 26.2183, 78.1828], ["Shivpuri", 25.42, 77.66], ["Datia", 25.67, 78.46]]],
        ["Sagar", [["Sagar", 23.84, 78.74], ["Damoh", 23.83, 79.44], ["Khurai", 24.06, 78.31]]],
        ["Rewa", [["Rewa", 24.53, 81.3], ["Satna", 24.6, 80.83], ["Maihar", 24.27, 80.75]]],
        ["Chhindwara", [["Chhindwara", 22.06, 78.94], ["Seoni", 22.09, 79.54], ["Pandhurna", 21.61, 78.52]]],
      ],
    ],

    /* ---------- Maharashtra ---------- */
    [
      "Maharashtra",
      [
        ["Mumbai City", [["Mumbai", 19.076, 72.8777], ["Colaba", 18.9, 72.81], ["Dadar", 19.02, 72.84]]],
        ["Mumbai Suburban", [["Andheri", 19.11, 72.86], ["Borivali", 19.23, 72.86], ["Thane", 19.2183, 72.9781]]],
        ["Pune", [["Pune", 18.5204, 73.8567], ["Pimpri-Chinchwad", 18.63, 73.81], ["Lonavala", 18.75, 73.41]]],
        ["Nagpur", [["Nagpur", 21.1458, 79.0882], ["Kamptee", 21.23, 79.19], ["Wardha", 20.75, 78.6]]],
        ["Nashik", [["Nashik", 19.9975, 73.7898], ["Igatpuri", 19.7, 73.56], ["Sinnar", 19.84, 74.0]]],
        ["Chhatrapati Sambhajinagar", [["Aurangabad", 19.8762, 75.3433], ["Paithan", 19.48, 75.47], ["Khuldabad", 20.02, 75.19]]],
        ["Kolhapur", [["Kolhapur", 16.705, 74.2433], ["Ichalkaranji", 16.69, 74.46], ["Sangli", 16.85, 74.58]]],
        ["Solapur", [["Solapur", 17.6599, 75.9064], ["Pandharpur", 17.68, 75.33], ["Barshi", 18.23, 75.69]]],
        ["Ratnagiri", [["Ratnagiri", 16.99, 73.31], ["Chiplun", 17.53, 73.52], ["Guhagar", 17.49, 73.17]]],
      ],
    ],

    /* ---------- Manipur ---------- */
    [
      "Manipur",
      [
        ["Imphal East", [["Imphal", 24.817, 93.9368], ["Jiribam", 24.79, 93.12], ["Porompat", 24.81, 93.95]]],
        ["Imphal West", [["Mayang Imphal", 24.61, 93.89], ["Lamphelpat", 24.83, 93.9], ["Konthoujam", 24.67, 93.89]]],
        ["Bishnupur", [["Bishnupur", 24.63, 93.78], ["Moirang", 24.5, 93.78], ["Nambol", 24.6, 93.82]]],
        ["Churachandpur", [["Churachandpur", 24.33, 93.68], ["Thanlon", 23.9, 93.3], ["Henglep", 24.15, 93.5]]],
      ],
    ],

    /* ---------- Meghalaya ---------- */
    [
      "Meghalaya",
      [
        ["East Khasi Hills", [["Shillong", 25.5788, 91.8933], ["Cherrapunji", 25.28, 91.73], ["Mawlynnong", 25.2, 91.92]]],
        ["West Garo Hills", [["Tura", 25.51, 90.21], ["Phulbari", 25.68, 90.02], ["Garobadha", 25.44, 90.3]]],
        ["West Jaintia Hills", [["Jowai", 25.45, 92.2], ["Khliehriat", 25.37, 92.37], ["Amlarem", 25.35, 92.15]]],
      ],
    ],

    /* ---------- Mizoram ---------- */
    [
      "Mizoram",
      [
        ["Aizawl", [["Aizawl", 23.7271, 92.7176], ["Sairang", 23.8, 92.68], ["Lengpui", 23.84, 92.62]]],
        ["Lunglei", [["Lunglei", 22.88, 92.73], ["Hnahthial", 22.85, 92.92], ["Tlabung", 22.85, 92.6]]],
        ["Champhai", [["Champhai", 23.47, 93.33], ["Khawzawl", 23.38, 93.13], ["Ngopa", 23.62, 93.16]]],
      ],
    ],

    /* ---------- Nagaland ---------- */
    [
      "Nagaland",
      [
        ["Kohima", [["Kohima", 25.6751, 94.1086], ["Chumukedima", 25.78, 93.83], ["Dimapur", 25.9, 93.73]]],
        ["Mokokchung", [["Mokokchung", 26.32, 94.52], ["Tuli", 26.63, 94.62], ["Changtongya", 26.35, 94.62]]],
        ["Tuensang", [["Tuensang", 26.14, 94.84], ["Mon", 26.72, 95.12], ["Noklak", 26.1, 95.15]]],
      ],
    ],

    /* ---------- Odisha ---------- */
    [
      "Odisha",
      [
        ["Khordha", [["Bhubaneswar", 20.2961, 85.8245], ["Jatani", 20.16, 85.71], ["Khordha", 20.18, 85.62]]],
        ["Cuttack", [["Cuttack", 20.4625, 85.883], ["Choudwar", 20.53, 85.8], ["Banki", 20.38, 85.54]]],
        ["Ganjam", [["Berhampur", 19.3099, 84.794], ["Gopalpur", 19.32, 84.92], ["Chhatrapur", 19.35, 84.99]]],
        ["Sambalpur", [["Sambalpur", 21.4671, 83.9696], ["Hirakud", 21.52, 83.86], ["Burla", 21.5, 83.9]]],
        ["Puri", [["Puri", 19.8135, 85.8312], ["Konark", 19.89, 86.09], ["Nimapara", 20.07, 86.01]]],
        ["Sundargarh", [["Rourkela", 22.2604, 84.8536], ["Sundargarh", 22.11, 84.03], ["Rajgangpur", 22.2, 84.6]]],
        ["Koraput", [["Koraput", 18.81, 82.71], ["Jeypore", 18.86, 82.57], ["Sunabeda", 18.62, 82.85]]],
      ],
    ],

    /* ---------- Punjab ---------- */
    [
      "Punjab",
      [
        ["Ludhiana", [["Ludhiana", 30.901, 75.8573], ["Khanna", 30.7, 76.22], ["Jagraon", 30.78, 75.48]]],
        ["Amritsar", [["Amritsar", 31.634, 74.8723], ["Tarn Taran", 31.45, 74.93], ["Batala", 31.82, 75.2]]],
        ["Jalandhar", [["Jalandhar", 31.326, 75.5762], ["Phagwara", 31.22, 75.77], ["Hoshiarpur", 31.53, 75.91]]],
        ["Patiala", [["Patiala", 30.3398, 76.3869], ["Rajpura", 30.48, 76.59], ["Nabha", 30.37, 76.15]]],
        ["Bathinda", [["Bathinda", 30.211, 74.9455], ["Mansa", 29.98, 75.39], ["Rampura Phul", 30.14, 75.24]]],
        ["S.A.S. Nagar", [["Mohali", 30.7046, 76.7179], ["Zirakpur", 30.64, 76.82], ["Kharar", 30.74, 76.65]]],
      ],
    ],

    /* ---------- Rajasthan ---------- */
    [
      "Rajasthan",
      [
        ["Jaipur", [["Jaipur", 26.9124, 75.7873], ["Sanganer", 26.82, 75.79], ["Chomu", 27.17, 75.72]]],
        ["Jodhpur", [["Jodhpur", 26.2389, 73.0243], ["Phalodi", 27.13, 72.37], ["Pipar City", 26.41, 73.52]]],
        ["Udaipur", [["Udaipur", 24.5854, 73.7125], ["Nathdwara", 24.94, 73.82], ["Kherwara", 23.99, 73.59]]],
        ["Kota", [["Kota", 25.2138, 75.8648], ["Bundi", 25.44, 75.64], ["Baran", 25.1, 76.51]]],
        ["Jaisalmer", [["Jaisalmer", 26.9157, 70.9083], ["Pokaran", 27.1, 71.92], ["Sam", 26.75, 70.55]]],
        ["Bikaner", [["Bikaner", 28.0229, 73.3119], ["Nokha", 27.78, 73.48], ["Sri Dungargarh", 28.35, 73.85]]],
        ["Ajmer", [["Ajmer", 26.4499, 74.6399], ["Pushkar", 26.49, 74.55], ["Kishangarh", 26.59, 74.86]]],
        ["Alwar", [["Alwar", 27.553, 76.6342], ["Bhiwadi", 28.21, 76.86], ["Rajgarh", 27.93, 76.74]]],
      ],
    ],

    /* ---------- Sikkim ---------- */
    [
      "Sikkim",
      [
        ["Gangtok", [["Gangtok", 27.3389, 88.6065], ["Pakyong", 27.23, 88.66], ["Rangpo", 27.19, 88.72]]],
        ["Namchi", [["Namchi", 27.17, 88.36], ["Jorethang", 27.13, 88.28], ["Ravangla", 27.31, 88.36]]],
        ["Gyalshing", [["Gyalshing", 27.28, 88.26], ["Pelling", 27.3, 88.24], ["Yuksom", 27.37, 88.21]]],
        ["Mangan", [["Mangan", 27.51, 88.53], ["Lachung", 27.69, 88.74], ["Lachen", 27.7, 88.55]]],
      ],
    ],

    /* ---------- Tamil Nadu ---------- */
    [
      "Tamil Nadu",
      [
        ["Chennai", [["Chennai", 13.0827, 80.2707], ["Tambaram", 12.92, 80.12], ["Avadi", 13.11, 80.1]]],
        ["Coimbatore", [["Coimbatore", 11.0168, 76.9558], ["Pollachi", 10.66, 77.01], ["Mettupalayam", 11.3, 76.83]]],
        ["Madurai", [["Madurai", 9.9252, 78.1198], ["Thirumangalam", 9.83, 77.97], ["Usilampatti", 9.94, 77.79]]],
        ["The Nilgiris", [["Ooty", 11.4102, 76.695], ["Coonoor", 11.35, 76.8], ["Kotagiri", 11.42, 76.86]]],
        ["Tiruchirappalli", [["Tiruchirappalli", 10.7905, 78.7047], ["Srirangam", 10.86, 78.69], ["Manapparai", 10.61, 78.42]]],
        ["Tirunelveli", [["Tirunelveli", 8.7139, 77.7567], ["Palayamkottai", 8.72, 77.74], ["Tenkasi", 8.96, 77.32]]],
        ["Kanniyakumari", [["Nagercoil", 8.178, 77.428], ["Kanyakumari", 8.0883, 77.5385], ["Kulasekaram", 8.35, 77.35]]],
        ["Salem", [["Salem", 11.6643, 78.146], ["Mettur", 11.79, 77.8], ["Attur", 11.6, 78.6]]],
        ["Thanjavur", [["Thanjavur", 10.787, 79.1378], ["Kumbakonam", 10.96, 79.38], ["Pattukkottai", 10.42, 79.32]]],
      ],
    ],

    /* ---------- Telangana ---------- */
    [
      "Telangana",
      [
        ["Hyderabad", [["Hyderabad", 17.385, 78.4867], ["Secunderabad", 17.4399, 78.4983], ["Charminar", 17.3617, 78.4747]]],
        ["Rangareddy", [["Vikarabad", 17.34, 77.91], ["Tandur", 17.25, 77.58], ["Ibrahimpatnam", 17.19, 78.63]]],
        ["Warangal", [["Warangal", 17.9689, 79.5941], ["Hanamkonda", 17.98, 79.59], ["Jangaon", 17.72, 79.19]]],
        ["Nizamabad", [["Nizamabad", 18.6725, 78.0941], ["Kamareddy", 18.32, 78.33], ["Bodhan", 18.67, 77.9]]],
        ["Karimnagar", [["Karimnagar", 18.4386, 79.1288], ["Jagtial", 18.79, 78.91], ["Ramagundam", 18.76, 79.48]]],
        ["Khammam", [["Khammam", 17.2473, 80.1514], ["Palwancha", 17.59, 80.68], ["Kothagudem", 17.68, 80.83]]],
      ],
    ],

    /* ---------- Tripura ---------- */
    [
      "Tripura",
      [
        ["West Tripura", [["Agartala", 23.8315, 91.2868], ["Jirania", 23.8, 91.44], ["Mohanpur", 23.83, 91.53]]],
        ["South Tripura", [["Udaipur", 23.53, 91.48], ["Belonia", 23.25, 91.42], ["Amarpur", 23.53, 91.63]]],
        ["Dhalai", [["Ambassa", 23.92, 91.85], ["Kamalpur", 24.2, 91.84], ["Khowai", 23.97, 91.66]]],
      ],
    ],

    /* ---------- Uttar Pradesh ---------- */
    [
      "Uttar Pradesh",
      [
        ["Lucknow", [["Lucknow", 26.8467, 80.9462], ["Kakori", 26.86, 80.78], ["Malihabad", 26.92, 80.71]]],
        ["Gautam Buddha Nagar", [["Noida", 28.5355, 77.391], ["Greater Noida", 28.4744, 77.504], ["Dadri", 28.55, 77.55]]],
        ["Ghaziabad", [["Ghaziabad", 28.6692, 77.4538], ["Hapur", 28.73, 77.78], ["Modinagar", 28.83, 77.58]]],
        ["Kanpur Nagar", [["Kanpur", 26.4499, 80.3319], ["Akbarpur", 26.43, 80.28], ["Bithoor", 26.62, 80.27]]],
        ["Varanasi", [["Varanasi", 25.3176, 82.9739], ["Sarnath", 25.38, 83.02], ["Mirzapur", 25.15, 82.57]]],
        ["Agra", [["Agra", 27.1767, 78.0081], ["Fatehpur Sikri", 27.09, 77.66], ["Mathura", 27.4924, 77.6737]]],
        ["Prayagraj", [["Prayagraj", 25.4358, 81.8463], ["Phaphamau", 25.53, 81.86], ["Handia", 25.35, 82.14]]],
        ["Gorakhpur", [["Gorakhpur", 26.7606, 83.3732], ["Deoria", 26.5, 83.78], ["Kushinagar", 26.74, 83.89]]],
        ["Meerut", [["Meerut", 28.9845, 77.7064], ["Baghpat", 29.23, 77.23], ["Muzaffarnagar", 29.47, 77.7]]],
        ["Bareilly", [["Bareilly", 28.367, 79.4304], ["Rampur", 28.81, 79.03], ["Badaun", 28.04, 79.12]]],
        ["Jhansi", [["Jhansi", 25.4484, 78.5685], ["Orai", 25.99, 79.45], ["Lalitpur", 24.69, 78.41]]],
        ["Ayodhya", [["Ayodhya", 26.799, 82.2041], ["Faizabad", 26.78, 82.14], ["Rudauli", 26.76, 81.74]]],
        ["Aligarh", [["Aligarh", 27.8974, 78.088], ["Hathras", 27.6, 78.05], ["Khurja", 28.25, 77.86]]],
      ],
    ],

    /* ---------- Uttarakhand ---------- */
    [
      "Uttarakhand",
      [
        ["Dehradun", [["Dehradun", 30.3165, 78.0322], ["Mussoorie", 30.459, 78.0664], ["Rishikesh", 30.0869, 78.2676]]],
        ["Haridwar", [["Haridwar", 29.9457, 78.1642], ["Roorkee", 29.85, 77.89], ["Laksar", 29.75, 78.04]]],
        ["Nainital", [["Nainital", 29.3803, 79.4636], ["Haldwani", 29.22, 79.51], ["Bhimtal", 29.35, 79.56]]],
        ["Pauri Garhwal", [["Pauri", 30.15, 78.78], ["Kotdwar", 29.75, 78.52], ["Srinagar", 30.22, 78.78]]],
        ["Chamoli", [["Joshimath", 30.55, 79.56], ["Gopeshwar", 30.41, 79.33], ["Badrinath", 30.74, 79.49]]],
        ["Uttarkashi", [["Uttarkashi", 30.73, 78.44], ["Gangotri", 30.99, 78.94], ["Barkot", 30.84, 78.21]]],
        ["Rudraprayag", [["Rudraprayag", 30.28, 78.98], ["Agastyamuni", 30.36, 79.0], ["Ukhimath", 30.52, 79.16]]],
      ],
    ],

    /* ---------- West Bengal ---------- */
    [
      "West Bengal",
      [
        ["Kolkata", [["Kolkata", 22.5726, 88.3639], ["Howrah", 22.5958, 88.2636], ["Salt Lake", 22.58, 88.41]]],
        ["Darjeeling", [["Darjeeling", 27.041, 88.2663], ["Kalimpong", 27.06, 88.47], ["Kurseong", 26.88, 88.28]]],
        ["Jalpaiguri", [["Siliguri", 26.7271, 88.3953], ["Jalpaiguri", 26.52, 88.73], ["Malbazar", 26.86, 88.73]]],
        ["North 24 Parganas", [["Barasat", 22.72, 88.48], ["Barrackpore", 22.76, 88.37], ["Basirhat", 22.66, 88.87]]],
        ["Nadia", [["Krishnanagar", 23.4, 88.49], ["Kalyani", 22.98, 88.43], ["Ranaghat", 23.18, 88.58]]],
        ["Purba Medinipur", [["Tamluk", 22.3, 87.93], ["Haldia", 22.06, 88.11], ["Contai", 21.79, 87.75]]],
        ["Bankura", [["Bankura", 23.23, 87.07], ["Bishnupur", 23.07, 87.32], ["Sonamukhi", 23.3, 87.02]]],
        ["Paschim Medinipur", [["Midnapore", 22.42, 87.32], ["Kharagpur", 22.34, 87.23], ["Jhargram", 22.45, 86.98]]],
      ],
    ],

    /* ---------- Union territories ---------- */
    [
      "Delhi (NCT)",
      [
        ["New Delhi", [["New Delhi", 28.6139, 77.209], ["Connaught Place", 28.6315, 77.2167], ["Aerocity", 28.55, 77.12]]],
        ["South West Delhi", [["Dwarka", 28.62, 77.04], ["Vasant Kunj", 28.52, 77.16], ["Najafgarh", 28.57, 76.98]]],
        ["North West Delhi", [["Rohini", 28.75, 77.07], ["Pitampura", 28.7, 77.13], ["Narela", 28.82, 77.1]]],
        ["East Delhi", [["Shahdara", 28.68, 77.29], ["Mayur Vihar", 28.61, 77.29], ["Preet Vihar", 28.64, 77.3]]],
        ["South Delhi", [["Saket", 28.52, 77.2], ["Hauz Khas", 28.55, 77.2], ["Kalkaji", 28.54, 77.25]]],
      ],
    ],
    [
      "Jammu & Kashmir",
      [
        ["Srinagar", [["Srinagar", 34.0837, 74.7973], ["Gulmarg", 34.05, 74.38], ["Pahalgam", 34.02, 75.32]]],
        ["Jammu", [["Jammu", 32.7266, 74.857], ["Katra", 32.99, 74.93], ["Udhampur", 32.92, 75.13]]],
        ["Anantnag", [["Anantnag", 33.73, 75.15], ["Kulgam", 33.64, 75.02], ["Qazigund", 33.58, 75.15]]],
        ["Baramulla", [["Baramulla", 34.2, 74.34], ["Uri", 34.09, 74.03], ["Sopore", 34.3, 74.47]]],
      ],
    ],
    [
      "Ladakh",
      [
        ["Leh", [["Leh", 34.1526, 77.5771], ["Diskit", 34.64, 77.56], ["Hunder", 34.68, 77.54]]],
        ["Kargil", [["Kargil", 34.56, 76.13], ["Drass", 34.43, 75.76], ["Zanskar", 33.47, 77.15]]],
      ],
    ],
    [
      "Chandigarh",
      [
        ["Chandigarh", [["Chandigarh", 30.7333, 76.7794], ["Sector 17", 30.7405, 76.7825], ["Mani Majra", 30.74, 76.8]]],
      ],
    ],
    [
      "Puducherry",
      [
        ["Puducherry", [["Puducherry", 11.9416, 79.8083], ["Ozhukarai", 11.95, 79.8], ["Auroville", 12.01, 79.81]]],
        ["Karaikal", [["Karaikal", 10.92, 79.83], ["Nedungadu", 10.99, 79.79], ["Thirunallar", 10.93, 79.73]]],
      ],
    ],
    [
      "Andaman & Nicobar Islands",
      [
        ["South Andaman", [["Port Blair", 11.6234, 92.7265], ["Havelock Island", 12.02, 92.98], ["Wandoor", 11.58, 92.62]]],
        ["North & Middle Andaman", [["Diglipur", 13.25, 93.02], ["Rangat", 12.49, 92.93], ["Mayabunder", 12.93, 92.9]]],
      ],
    ],
    [
      "Lakshadweep",
      [
        ["Lakshadweep", [["Kavaratti", 10.5669, 72.642], ["Agatti", 10.85, 72.18], ["Minicoy", 8.28, 73.04]]],
      ],
    ],
    [
      "Dadra & Nagar Haveli and Daman & Diu",
      [
        ["Daman", [["Daman", 20.3974, 72.8328], ["Moti Daman", 20.41, 72.83]]],
        ["Diu", [["Diu", 20.71, 70.99], ["Fudam", 20.72, 70.99]]],
        ["Dadra & Nagar Haveli", [["Silvassa", 20.27, 73.02], ["Dadra", 20.32, 72.95], ["Amli", 20.28, 73.0]]],
      ],
    ],
  ],
];

/* ================================================================
   Other countries — one level shallower
================================================================ */

const WORLD: ShallowRaw[] = [
  [
    "United States",
    "US",
    [
      ["California", [["Los Angeles", 34.0522, -118.2437], ["San Francisco", 37.7749, -122.4194], ["San Diego", 32.7157, -117.1611], ["San Jose", 37.3382, -121.8863]]],
      ["New York", [["New York City", 40.7128, -74.006], ["Buffalo", 42.8864, -78.8784], ["Rochester", 43.1566, -77.6088]]],
      ["Texas", [["Houston", 29.7604, -95.3698], ["Austin", 30.2672, -97.7431], ["Dallas", 32.7767, -96.797]]],
      ["Florida", [["Miami", 25.7617, -80.1918], ["Orlando", 28.5383, -81.3792], ["Tampa", 27.9506, -82.4572]]],
      ["Illinois", [["Chicago", 41.8781, -87.6298], ["Springfield", 39.7817, -89.6501]]],
    ],
  ],
  [
    "United Kingdom",
    "GB",
    [
      ["England", [["London", 51.5072, -0.1276], ["Manchester", 53.4808, -2.2426], ["Birmingham", 52.4862, -1.8904], ["Liverpool", 53.4084, -2.9916]]],
      ["Scotland", [["Edinburgh", 55.9533, -3.1883], ["Glasgow", 55.8642, -4.2518], ["Aberdeen", 57.1497, -2.0943]]],
      ["Wales", [["Cardiff", 51.4816, -3.1791], ["Swansea", 51.6214, -3.9436]]],
      ["Northern Ireland", [["Belfast", 54.5973, -5.9301], ["Londonderry", 54.9966, -7.3086]]],
    ],
  ],
  [
    "United Arab Emirates",
    "AE",
    [
      ["Dubai", [["Dubai", 25.2048, 55.2708], ["Hatta", 24.79, 56.12], ["Jebel Ali", 24.99, 55.09]]],
      ["Abu Dhabi", [["Abu Dhabi", 24.4539, 54.3773], ["Al Ain", 24.2075, 55.7447]]],
      ["Sharjah", [["Sharjah", 25.3463, 55.4209], ["Al Dhaid", 25.29, 55.88]]],
    ],
  ],
  [
    "Australia",
    "AU",
    [
      ["New South Wales", [["Sydney", -33.8688, 151.2093], ["Newcastle", -32.9283, 151.7817]]],
      ["Victoria", [["Melbourne", -37.8136, 144.9631], ["Geelong", -38.1499, 144.3617]]],
      ["Queensland", [["Brisbane", -27.4698, 153.0251], ["Cairns", -16.9203, 145.771]]],
      ["Western Australia", [["Perth", -31.9505, 115.8605], ["Fremantle", -32.0569, 115.7439]]],
    ],
  ],
  [
    "Singapore",
    "SG",
    [["Central Region", [["Singapore", 1.3521, 103.8198], ["Jurong East", 1.3329, 103.7436], ["Tampines", 1.3496, 103.9568]]]],
  ],
  [
    "Canada",
    "CA",
    [
      ["Ontario", [["Toronto", 43.6532, -79.3832], ["Ottawa", 45.4215, -75.6972]]],
      ["British Columbia", [["Vancouver", 49.2827, -123.1207], ["Victoria", 48.4284, -123.3656]]],
      ["Quebec", [["Montreal", 45.5019, -73.5674], ["Quebec City", 46.8139, -71.208]]],
    ],
  ],
  [
    "Japan",
    "JP",
    [
      ["Kanto", [["Tokyo", 35.6762, 139.6503], ["Yokohama", 35.4437, 139.638], ["Chiba", 35.6073, 140.1064]]],
      ["Kansai", [["Osaka", 34.6937, 135.5023], ["Kyoto", 35.0116, 135.7681], ["Kobe", 34.6901, 135.198]]],
      ["Hokkaido", [["Sapporo", 43.0618, 141.3545], ["Hakodate", 41.7687, 140.7288]]],
    ],
  ],
  [
    "Germany",
    "DE",
    [
      ["Bavaria", [["Munich", 48.1351, 11.582], ["Nuremberg", 49.4521, 11.0767]]],
      ["North Rhine-Westphalia", [["Cologne", 50.9375, 6.9603], ["Dusseldorf", 51.2277, 6.7735]]],
      ["Berlin", [["Berlin", 52.52, 13.405]]],
    ],
  ],
];

/* ================================================================
   Public API
================================================================ */

export const COUNTRIES: GeoCountry[] = [buildIndia(INDIA), ...WORLD.map(buildShallow)];

export const INDIA_COUNTRY = COUNTRIES[0];

export const findCountry = (name: string): GeoCountry =>
  COUNTRIES.find((c) => c.name === name) ?? COUNTRIES[0];

/** Resolve a country's region list, tolerating both depth models. */
export const regionsOf = (country: GeoCountry): GeoRegion[] => country.regions;

/** Places for a region, whether it stores districts or flat locations. */
export const districtsOf = (region: GeoRegion): GeoDistrict[] =>
  region.districts ?? [{ name: region.name, locations: region.locations ?? [] }];

export const hasDistricts = (region: GeoRegion): boolean =>
  Array.isArray(region.districts) && region.districts.length > 0;

/** Flatten the whole tree — used by the search box. */
export const ALL_PLACES: {
  name: string;
  region: string;
  district: string;
  country: string;
  lat: number;
  lon: number;
}[] = COUNTRIES.flatMap((c) =>
  c.regions.flatMap((r) =>
    districtsOf(r).flatMap((d) =>
      d.locations.map((p) => ({
        name: p.name,
        region: r.name,
        district: d.name,
        country: c.name,
        lat: p.lat,
        lon: p.lon,
      })),
    ),
  ),
);

/** Authoritative counts, derived from the tree so they can never drift. */
export const GEO_STATS = {
  countries: COUNTRIES.length,
  /** regions that drill to district level (India's states and UTs) */
  deepRegions: COUNTRIES.reduce((n, c) => n + c.regions.filter(hasDistricts).length, 0),
  /** regions that only go region → place */
  shallowRegions: COUNTRIES.reduce((n, c) => n + c.regions.filter((r) => !hasDistricts(r)).length, 0),
  districts: ALL_PLACES.reduce((n, p, i) => (i === 0 || p.district !== ALL_PLACES[i - 1].district ? n + 1 : n), 0),
  places: ALL_PLACES.length,
};

/** Sensible opening location: New Delhi. */
export const DEFAULT_LOCATION = {
  name: "New Delhi",
  admin1: "New Delhi, Delhi (NCT)",
  country: "India",
  latitude: 28.6139,
  longitude: 77.209,
};
