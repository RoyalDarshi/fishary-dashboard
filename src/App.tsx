import React, { useEffect, useState, useMemo, useCallback } from "react";
import { MapPin, Users, IndianRupee, TrendingUp } from "lucide-react";
import OpenLayersMap from "./components/OpenLayerMap";
import AreaDetailsPopup from "./components/AreaDetailsPopup";
import FiltersAndKPIs from "./components/FiltersAndKPIs";
import {
  SectorDistributionPieChart,
  ProjectsBarChart,
  DistributionPieChart,
  TopAreasBarChart,
} from "./components/Charts";
import pmmsyData from "./data/pmmsyData.json";

// Interface for generic metric values
interface MetricValues {
  beneficiaries: number;
  funds: number;
  registrations: number;
  funds_used?: number;
  beneficiaries_last_24h?: number;
  registrations_last_24h?: number;
}

// Type definitions for scheme, gender, and year filters
export type SchemeKey = "all" | "PMMKSS" | "PMMSY" | "KCC" | "NFDP";
export type GenderKey = "all" | "male" | "female" | "transgender";
export type YearKey = "all" | "2021" | "2022" | "2023" | "2024";

// Interface for area-specific metric data
interface AreaMetricData {
  [key: string]: MetricValues;
}

// GeoJSON interfaces
interface GeoJSONFeature {
  properties: {
    shapeID: string;
    shapeName: string;
    level: "state" | "district" | "sub-district";
    state_name?: string;
    district_name?: string;
    subdistrict_name?: string;
  };
  geometry: { type: string };
}

interface GeoJSONData {
  type: string;
  features: GeoJSONFeature[];
}

// Interface for raw PMMSY data entries
interface PMMSYRawEntry {
  UNIQUE_ID: string;
  "NAME_OF_THE_STATE/UT": string;
  "FISHERIES_SECTOR_OF_THE_STATE/UT": string;
  FINANCIAL_YEAR: string;
  COMPONENT: string;
  NAME_OF_THE_ACTIVITY: string;
  "NAME_OF_THE_SUB-ACTIVITY": string;
  PMMSY_UNIT_COST: number;
  TYPE_OF_BENEFICIARY: string;
  "NAME_OF_THE_BENEFICIARY_/_GROUP_LEADER_/_ENTERPRISE_(OR)_COMPANY_AUTHORISED": string;
  BENEFICIARY_PHOTO: string;
  "FATHER’S_(OR)_HUSBAND’S_NAME": string;
  BENEFICIARY_DISTRICT: string;
  "BENEFICIARY_TALUK_/_MANDAL": string;
  BENEFICIARY_VILLAGE: string;
  PIN_CODE: number;
  "ADDRESS_OF_THE_BENEFICIARY_/_GROUP_LEADER_/_ENTREPRENEUR_/_ENTERPRISE_FIRM": string;
  "SUM_OF_TOTAL_COST_(CENTRAL_SHARE+_STATE_SHARE+_BENEFICIARY_CONTRIBUTION)": number;
  "SUM_OF_ADDITIONAL_STATE_SHARE_RELEASED_(IN_RS.)"?: number;
  OUTPUT?: string;
  TOTAL_OUTPUT?: string;
  "TOTAL_EMPLOYMENT_GENERATED_(WOMEN)"?: string;
  "TOTAL_EMPLOYMENT_GENERATED_(MEN)"?: string;
  "DIRECT_EMPLOYMENT_GENERATED_(WOMEN)"?: string;
  "DIRECT_EMPLOYMENT_GENERATED_(MEN)"?: string;
  "INDIRECT_EMPLOYMENT_GENERATED_(WOMEN)"?: string;
  "INDIRECT_EMPLOYMENT_GENERATED_(MEN)"?: string;
  GENDER?: string;
}

// Interface for aggregated PMMSY data
export interface PMMSYAggregatedData {
  totalProjects: number;
  totalInvestment: number;
  fishOutput: number;
  totalEmploymentGenerated: number;
  directEmploymentMen: number;
  directEmploymentWomen: number;
  indirectEmploymentMen: number;
  indirectEmploymentWomen: number;
  projectsByStateUT: { name: string; value: number }[];
  sectorDistribution: { name: string; value: number }[];
}

// Display names for filters
const schemeDisplayNames: Record<SchemeKey, string> = {
  all: "All Schemes",
  PMMKSS: "Pradhan Mantri Matsya Kisaan Samridhi Sah-Yojana",
  PMMSY: "Pradhan Mantri Matsya Sampada Yojana",
  KCC: "Kishan Credit Card",
  NFDP: "National Fisheries Digital Platform",
};

const genderDisplayNames: Record<GenderKey, string> = {
  all: "All Genders",
  male: "Male",
  female: "Female",
  transgender: "Transgender",
};

const yearDisplayNames: Record<YearKey, string> = {
  all: "All Years",
  2021: "2021",
  2022: "2022",
  2023: "2023",
  2024: "2024",
};

const App: React.FC = () => {
  // State variables
  const [polygonData, setPolygonData] = useState<GeoJSONData | null>(null);
  const [metricData, setMetricData] = useState<Record<string, AreaMetricData> | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<"beneficiaries" | "funds" | "registrations">("beneficiaries");
  const [selectedScheme, setSelectedScheme] = useState<SchemeKey>("all");
  const [selectedGender, setSelectedGender] = useState<GenderKey>("all");
  const [selectedYear, setSelectedYear] = useState<YearKey>("all");
  const [error, setError] = useState<string | null>(null);
  const [selectedAreaDetails, setSelectedAreaDetails] = useState<any | null>(null);
  const [selectedBarChartCategory, setSelectedBarChartCategory] = useState<"scheme" | "gender" | "year">("scheme");
  const [mapView, setMapView] = useState<"state" | "district" | "sub-district">("state");
  const [globalPMMSYMetrics, setGlobalPMMSYMetrics] = useState<PMMSYAggregatedData>({
    totalProjects: 0,
    totalInvestment: 0,
    fishOutput: 0,
    totalEmploymentGenerated: 0,
    directEmploymentMen: 0,
    directEmploymentWomen: 0,
    indirectEmploymentMen: 0,
    indirectEmploymentWomen: 0,
    projectsByStateUT: [],
    sectorDistribution: [],
  });
  const [pmmsyAreaSpecificMetrics, setPmmsyAreaSpecificMetrics] = useState<Record<string, PMMSYAggregatedData>>({});
  const [selectedSectorPMMSY, setSelectedSectorPMMSY] = useState<string>("all");
  const [selectedActivityPMMSY, setSelectedActivityPMMSY] = useState<string>("all");
  const [selectedFinancialYearPMMSY, setSelectedFinancialYearPMMSY] = useState<string>("all");
  const [mockPMMSYData, setMockPMMSYData] = useState<PMMSYRawEntry[]>([]);
  const [mockNonPMMSYData, setMockNonPMMSYData] = useState<Record<string, AreaMetricData> | null>(null);

  // Memoized officer names
  const officerNames = useMemo(() => {
    const names = [
      "Amit Kumar",
      "Priya Sharma",
      "Rajesh Singh",
      "Anjali Devi",
      "Sanjay Yadav",
      "Neha Gupta",
      "Vikram Rathore",
      "Pooja Kumari",
      "Rahul Verma",
      "Deepa Singh",
    ];
    const officerMap: Record<string, string> = {};
    if (polygonData) {
      polygonData.features.forEach((feature, index) => {
        officerMap[feature.properties.shapeID] = names[index % names.length];
      });
    }
    return officerMap;
  }, [polygonData]);

  // Pre-compute shapeIdMap for PMMSY aggregation
  const shapeIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (polygonData) {
      polygonData.features.forEach((feature) => {
        const { state_name, district_name, subdistrict_name, level, shapeID } = feature.properties;
        if (level === "sub-district" && state_name && district_name && subdistrict_name) {
          map[`${state_name}_${district_name}_${subdistrict_name}`] = shapeID;
        } else if (level === "district" && state_name && district_name) {
          map[`${state_name}_${district_name}`] = shapeID;
        } else if (level === "state" && state_name) {
          map[state_name] = shapeID;
        }
      });
    }
    return map;
  }, [polygonData]);

  // Generate mock data for schemes other than PMMSY
  const generateMockData = (areas: GeoJSONFeature[]): Record<string, AreaMetricData> => {
    const dataMap: Record<string, AreaMetricData> = {};
    const schemes: SchemeKey[] = ["all", "PMMKSS", "PMMSY", "KCC", "NFDP"];
    const genders: GenderKey[] = ["all", "male", "female", "transgender"];
    const years: YearKey[] = ["all", "2021", "2022", "2023", "2024"];

    const schemeModifiers: Record<SchemeKey, number> = {
      all: 1,
      PMMKSS: 0.9,
      PMMSY: 1.1,
      KCC: 0.85,
      NFDP: 0.95,
    };
    const genderModifiers: Record<GenderKey, number> = {
      all: 1,
      male: 1.2,
      female: 0.9,
      transgender: 0.8,
    };
    const yearModifiers: Record<YearKey, number> = {
      all: 1,
      2021: 0.8,
      2022: 0.9,
      2023: 1.0,
      2024: 1.1,
    };

    areas.forEach((area) => {
      const areaId = area.properties.shapeID;
      const areaData: AreaMetricData = {};
      const regionalBias = area.properties.level === "state" ? 1.0 + Math.random() * 0.1 : 0.9 + Math.random() * 0.2;

      schemes.forEach((scheme) => {
        genders.forEach((gender) => {
          years.forEach((year) => {
            const key = `${scheme}_${gender}_${year}`;
            const schemeMod = schemeModifiers[scheme];
            const genderMod = genderModifiers[gender];
            const yearMod = yearModifiers[year];
            const weight = schemeMod * genderMod * yearMod * regionalBias;

            const beneficiaries = Math.floor(weight * (500 + Math.random() * 4500));
            const funds = Math.floor(weight * (1000000 + Math.random() * 9000000));
            const registrations = Math.floor(weight * (2000 + Math.random() * 8000));

            const funds_used = Math.floor(funds * (0.6 + Math.random() * 0.35));
            const beneficiaries_last_24h = Math.floor(beneficiaries * (0.01 + Math.random() * 0.05));
            const registrations_last_24h = Math.floor(registrations * (0.005 + Math.random() * 0.02));

            areaData[key] = {
              beneficiaries,
              funds,
              registrations,
              funds_used,
              beneficiaries_last_24h,
              registrations_last_24h,
            };
          });
        });
      });
      dataMap[areaId] = areaData;
    });
    return dataMap;
  };

  // Optimized PMMSY data generation
  const generateMockPMMSYData = useCallback((features: GeoJSONFeature[]): PMMSYRawEntry[] => {
    const sectors = ["Inland", "Marine"];
    const activities = [
      "Infrastructure and Post-harvest Management",
      "Fisheries Management and Regulatory Framework",
      "Enhancement of Production and Productivity",
    ];
    const years = ["2021-22", "2022-23", "2023-24"];
    const genders = ["male", "female", "transgender"];
    const names = ["Ram", "Sita", "Mohan", "Rita", "Amit"];
    const entries: PMMSYRawEntry[] = [];

    // Limit the number of entries to a reasonable size to prevent performance issues
    const entryCount = Math.min(features.length * 2, 1000); // Generate up to 2 entries per feature, capped at 1000
    const featureCount = features.length;

    for (let i = 0; i < entryCount; i++) {
      const feature = features[i % featureCount]; // Distribute entries across features
      const state = feature.properties.state_name || "Uttarakhand";
      const district = feature.properties.district_name || "Dehradun";
      const subdistrict = feature.properties.subdistrict_name || "Raipur";
      const sector = sectors[Math.floor(Math.random() * sectors.length)];
      const activity = activities[Math.floor(Math.random() * activities.length)];
      const year = years[Math.floor(Math.random() * years.length)];
      const gender = genders[Math.floor(Math.random() * genders.length)];
      const name = names[Math.floor(Math.random() * names.length)];

      const cost = Math.floor(100000 + Math.random() * 1000000);
      const output = (Math.random() * 50).toFixed(2);
      const empWomen = Math.floor(Math.random() * 10);
      const empMen = Math.floor(Math.random() * 15);

      entries.push({
        UNIQUE_ID: `${i}-${Date.now()}`,
        "NAME_OF_THE_STATE/UT": state,
        "FISHERIES_SECTOR_OF_THE_STATE/UT": sector,
        FINANCIAL_YEAR: year,
        COMPONENT: "Infrastructure",
        NAME_OF_THE_ACTIVITY: activity,
        "NAME_OF_THE_SUB-ACTIVITY": "Sub-Infra",
        PMMSY_UNIT_COST: cost,
        TYPE_OF_BENEFICIARY: "Individual",
        "NAME_OF_THE_BENEFICIARY_/_GROUP_LEADER_/_ENTERPRISE_(OR)_COMPANY_AUTHORISED": name,
        BENEFICIARY_PHOTO: "",
        "FATHER’S_(OR)_HUSBAND’S_NAME": "Sharma",
        BENEFICIARY_DISTRICT: district,
        "BENEFICIARY_TALUK_/_MANDAL": subdistrict,
        BENEFICIARY_VILLAGE: "Test Village",
        PIN_CODE: 123456,
        "ADDRESS_OF_THE_BENEFICIARY_/_GROUP_LEADER_/_ENTREPRENEUR_/_ENTERPRISE_FIRM": "Test Address",
        "SUM_OF_TOTAL_COST_(CENTRAL_SHARE+_STATE_SHARE+_BENEFICIARY_CONTRIBUTION)": cost,
        "SUM_OF_ADDITIONAL_STATE_SHARE_RELEASED_(IN_RS.)": Math.floor(cost * 0.1),
        OUTPUT: output,
        TOTAL_OUTPUT: output,
        "TOTAL_EMPLOYMENT_GENERATED_(WOMEN)": empWomen.toString(),
        "TOTAL_EMPLOYMENT_GENERATED_(MEN)": empMen.toString(),
        "DIRECT_EMPLOYMENT_GENERATED_(WOMEN)": Math.floor(empWomen * 0.6).toString(),
        "DIRECT_EMPLOYMENT_GENERATED_(MEN)": Math.floor(empMen * 0.6).toString(),
        "INDIRECT_EMPLOYMENT_GENERATED_(WOMEN)": Math.floor(empWomen * 0.4).toString(),
        "INDIRECT_EMPLOYMENT_GENERATED_(MEN)": Math.floor(empMen * 0.4).toString(),
        GENDER: gender,
      });
    }

    return entries;
  }, []);

  // Generate mock PMMSY data only once when polygonData is set
  useEffect(() => {
    if (polygonData && mockPMMSYData.length === 0) {
      const entries = generateMockPMMSYData(polygonData.features);
      setMockPMMSYData(entries);
    }
  }, [polygonData, mockPMMSYData.length, generateMockPMMSYData]);

  // Generate mock non-PMMSY data only once when polygonData is set
  useEffect(() => {
    if (polygonData && !mockNonPMMSYData) {
      const data = generateMockData(polygonData.features);
      setMockNonPMMSYData(data);
    }
  }, [polygonData, mockNonPMMSYData]);

  // Pre-index PMMSY data for faster filtering
  const pmmsyDataIndex = useMemo(() => {
    const index: Record<string, PMMSYRawEntry[]> = {};
    mockPMMSYData.forEach((entry) => {
      const sector = entry["FISHERIES_SECTOR_OF_THE_STATE/UT"]?.toLowerCase() || "unknown";
      const activity = entry["NAME_OF_THE_ACTIVITY"]?.toLowerCase() || "unknown";
      const year = entry["FINANCIAL_YEAR"]?.toLowerCase() || "unknown";
      const key = `${sector}_${activity}_${year}`;
      if (!index[key]) index[key] = [];
      index[key].push(entry);
    });
    return index;
  }, [mockPMMSYData]);

  // Optimized PMMSY dashboard data aggregation
  const aggregatePMMSYDashboardData = useCallback((
    selectedSector: string,
    selectedActivity: string,
    selectedFinancialYear: string
  ): {
    global: PMMSYAggregatedData;
    areaSpecific: Record<string, PMMSYAggregatedData>;
  } => {
    const globalMetrics: PMMSYAggregatedData = {
      totalProjects: 0,
      totalInvestment: 0,
      fishOutput: 0,
      totalEmploymentGenerated: 0,
      directEmploymentMen: 0,
      directEmploymentWomen: 0,
      indirectEmploymentMen: 0,
      indirectEmploymentWomen: 0,
      projectsByStateUT: [],
      sectorDistribution: [],
    };

    const areaSpecificMetrics: Record<string, PMMSYAggregatedData> = {};
    const projectsByStateUTMap = new Map<string, number>();
    const sectorDistributionMap = new Map<string, number>();

    // Construct index key for filtering
    const sectorKey = selectedSector === "all" ? ".*" : selectedSector.toLowerCase();
    const activityKey = selectedActivity === "all" ? ".*" : selectedActivity.toLowerCase();
    const yearKey = selectedFinancialYear === "all" ? ".*" : selectedFinancialYear.toLowerCase();
    const indexKeyPattern = new RegExp(`^${sectorKey}_${activityKey}_${yearKey}$`);

    // Aggregate data from indexed entries
    Object.keys(pmmsyDataIndex).forEach((key) => {
      if (!indexKeyPattern.test(key)) return;
      const entries = pmmsyDataIndex[key];

      entries.forEach((entry) => {
        const investment = parseFloat(entry["SUM_OF_TOTAL_COST_(CENTRAL_SHARE+_STATE_SHARE+_BENEFICIARY_CONTRIBUTION)"]?.toString()) || 0;
        const fishOutput = parseFloat(entry["TOTAL_OUTPUT"]?.toString()) || 0;
        const totalEmpWomen = parseInt(entry["TOTAL_EMPLOYMENT_GENERATED_(WOMEN)"]?.toString()) || 0;
        const totalEmpMen = parseInt(entry["TOTAL_EMPLOYMENT_GENERATED_(MEN)"]?.toString()) || 0;
        const directEmpWomen = parseInt(entry["DIRECT_EMPLOYMENT_GENERATED_(WOMEN)"]?.toString()) || 0;
        const directEmpMen = parseInt(entry["DIRECT_EMPLOYMENT_GENERATED_(MEN)"]?.toString()) || 0;
        const indirectEmpWomen = parseInt(entry["INDIRECT_EMPLOYMENT_GENERATED_(WOMEN)"]?.toString()) || 0;
        const indirectEmpMen = parseInt(entry["INDIRECT_EMPLOYMENT_GENERATED_(MEN)"]?.toString()) || 0;

        // Global aggregation
        globalMetrics.totalProjects += 1;
        globalMetrics.totalInvestment += investment;
        globalMetrics.fishOutput += fishOutput;
        globalMetrics.totalEmploymentGenerated += totalEmpWomen + totalEmpMen;
        globalMetrics.directEmploymentWomen += directEmpWomen;
        globalMetrics.directEmploymentMen += directEmpMen;
        globalMetrics.indirectEmploymentWomen += indirectEmpWomen;
        globalMetrics.indirectEmploymentMen += indirectEmpMen;

        // Aggregation for Projects by State/UT
        const stateName = entry["NAME_OF_THE_STATE/UT"];
        projectsByStateUTMap.set(stateName, (projectsByStateUTMap.get(stateName) || 0) + 1);

        // Aggregation for Sector Distribution
        const sector = entry["FISHERIES_SECTOR_OF_THE_STATE/UT"];
        sectorDistributionMap.set(sector, (sectorDistributionMap.get(sector) || 0) + 1);

        // Area-specific aggregation
        const areaShapeID =
          shapeIdMap[`${stateName}_${entry["BENEFICIARY_DISTRICT"]}_${entry["BENEFICIARY_TALUK_/_MANDAL"]}`] ||
          shapeIdMap[`${stateName}_${entry["BENEFICIARY_DISTRICT"]}`] ||
          shapeIdMap[stateName];
        if (areaShapeID) {
          if (!areaSpecificMetrics[areaShapeID]) {
            areaSpecificMetrics[areaShapeID] = {
              totalProjects: 0,
              totalInvestment: 0,
              fishOutput: 0,
              totalEmploymentGenerated: 0,
              directEmploymentMen: 0,
              directEmploymentWomen: 0,
              indirectEmploymentMen: 0,
              indirectEmploymentWomen: 0,
              projectsByStateUT: [],
              sectorDistribution: [],
            };
          }
          areaSpecificMetrics[areaShapeID].totalProjects += 1;
          areaSpecificMetrics[areaShapeID].totalInvestment += investment;
          areaSpecificMetrics[areaShapeID].fishOutput += fishOutput;
          areaSpecificMetrics[areaShapeID].totalEmploymentGenerated += totalEmpWomen + totalEmpMen;
          areaSpecificMetrics[areaShapeID].directEmploymentWomen += directEmpWomen;
          areaSpecificMetrics[areaShapeID].directEmploymentMen += directEmpMen;
          areaSpecificMetrics[areaShapeID].indirectEmploymentWomen += indirectEmpWomen;
          areaSpecificMetrics[areaShapeID].indirectEmploymentMen += indirectEmpMen;
        }
      });
    });

    globalMetrics.projectsByStateUT = Array.from(projectsByStateUTMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    globalMetrics.sectorDistribution = Array.from(sectorDistributionMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    return { global: globalMetrics, areaSpecific: areaSpecificMetrics };
  }, [pmmsyDataIndex, shapeIdMap]);

  // Debounced state updates for PMMSY filters
  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const debouncedSetSelectedSectorPMMSY = useCallback(debounce(setSelectedSectorPMMSY, 300), []);
  const debouncedSetSelectedActivityPMMSY = useCallback(debounce(setSelectedActivityPMMSY, 300), []);
  const debouncedSetSelectedFinancialYearPMMSY = useCallback(debounce(setSelectedFinancialYearPMMSY, 300), []);

  // PMMSY filter options
  const pmmsySectors = useMemo(() => {
    const sectors = new Set<string>();
    mockPMMSYData.forEach((entry: PMMSYRawEntry) => {
      if (entry["FISHERIES_SECTOR_OF_THE_STATE/UT"]) {
        sectors.add(entry["FISHERIES_SECTOR_OF_THE_STATE/UT"]);
      }
    });
    return ["all", ...Array.from(sectors).sort()];
  }, [mockPMMSYData]);

  const pmmsyActivityTypes = useMemo(() => {
    const activities = new Set<string>();
    mockPMMSYData.forEach((entry: PMMSYRawEntry) => {
      if (entry["NAME_OF_THE_ACTIVITY"]) {
        activities.add(entry["NAME_OF_THE_ACTIVITY"]);
      }
    });
    return ["all", ...Array.from(activities).sort()];
  }, [mockPMMSYData]);

  const pmmsyFinancialYears = useMemo(() => {
    const years = new Set<string>();
    mockPMMSYData.forEach((entry: PMMSYRawEntry) => {
      if (entry["FINANCIAL_YEAR"]) {
        years.add(entry["FINANCIAL_YEAR"]);
      }
    });
    return ["all", ...Array.from(years).sort()];
  }, [mockPMMSYData]);

  // Fetch GeoJSON and aggregate data
  useEffect(() => {
    fetch("/indianmap.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch GeoJSON");
        return res.json();
      })
      .then((data: GeoJSONData) => {
        const filteredFeatures = data.features.filter((f) => {
          const type = f.geometry.type;
          return type === "Polygon" || type === "MultiPolygon";
        });
        const filteredGeoJsonData: GeoJSONData = {
          ...data,
          features: filteredFeatures,
        };
        setPolygonData(filteredGeoJsonData);

        // Set the metric data to the generated mock data
        setMetricData(mockNonPMMSYData);

        // Aggregate PMMSY dashboard data only if PMMSY is selected
        if (selectedScheme === "PMMSY") {
          const { global, areaSpecific } = aggregatePMMSYDashboardData(
            selectedSectorPMMSY,
            selectedActivityPMMSY,
            selectedFinancialYearPMMSY
          );
          setGlobalPMMSYMetrics(global);
          setPmmsyAreaSpecificMetrics(areaSpecific);
        }
      })
      .catch((err) => {
        console.error("GeoJSON load error:", err);
        setError(err.message);
      });
  }, [
    selectedScheme,
    selectedSectorPMMSY,
    selectedActivityPMMSY,
    selectedFinancialYearPMMSY,
    aggregatePMMSYDashboardData,
    mockNonPMMSYData,
  ]);

  // Filtered GeoJSON data
  const filteredGeoJsonData = useMemo(() => {
    if (!polygonData) return null;
    const stateFeatures = polygonData.features.filter((f) => f.properties.level === "state");
    const districtFeatures = polygonData.features.filter((f) => f.properties.level === "district");
    const subDistrictFeatures = polygonData.features.filter((f) => f.properties.level === "sub-district");

    if (mapView === "state") {
      return { ...polygonData, features: stateFeatures };
    } else if (mapView === "district") {
      return {
        ...polygonData,
        features: [...districtFeatures, ...stateFeatures],
      };
    } else {
      return {
        ...polygonData,
        features: [...subDistrictFeatures, ...districtFeatures, ...stateFeatures],
      };
    }
  }, [polygonData, mapView]);

  // Memoized demographic key
  const demographicKey = useMemo(() => {
    return `${selectedScheme}_${selectedGender}_${selectedYear}`;
  }, [selectedScheme, selectedGender, selectedYear]);

  // Format number
  const formatNumber = (num: number): string => {
    if (num >= 10000000) {
      return (num / 10000000).toFixed(2) + " Cr";
    }
    if (num >= 100000) {
      return (num / 100000).toFixed(2) + " L";
    }
    return num.toLocaleString();
  };

  // KPIs for generic metrics
  const kpis = useMemo(() => {
    if (!metricData || !filteredGeoJsonData) return null;
    const relevantFeatureIds = filteredGeoJsonData.features
      .filter(
        (f) =>
          (mapView === "state" && f.properties.level === "state") ||
          (mapView === "district" && f.properties.level === "district") ||
          (mapView === "sub-district" && f.properties.level === "sub-district")
      )
      .map((f) => f.properties.shapeID);

    const values = relevantFeatureIds
      .map((id) => metricData[id]?.[demographicKey]?.[selectedMetric])
      .filter((value) => value !== undefined);

    if (values.length === 0) return { average: 0, min: 0, max: 0 };
    let average = values.reduce((sum, val) => sum + val, 0) / values.length;
    average = Math.floor(average);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { average, min, max };
  }, [metricData, selectedMetric, demographicKey, filteredGeoJsonData, mapView]);

  // Color function
  const getColor = (metric: string, value: number | string): string => {
    const categoryColors: Record<string, string> = {
      PMMKSS: "#6366f1",
      PMMSY: "#10b981",
      KCC: "#f97316",
      NFDP: "#a855f7",
      male: "#3b82f6",
      female: "#ec4899",
      transgender: "#a855f7",
      2021: "#c4b5fd",
      2022: "#a78bfa",
      2023: "#8b5cf6",
      2024: "#6366f1",
      Inland: "#10b981",
      Marine: "#6366f1",
    };

    if (typeof value === "string" && categoryColors[value]) return categoryColors[value];

    if (metric === "beneficiaries") {
      if (typeof value === "number" && value >= 4000) return "#6366f1";
      if (typeof value === "number" && value >= 3000) return "#8b5cf6";
      if (typeof value === "number" && value >= 2000) return "#a78bfa";
      return "#c4b5fd";
    } else if (metric === "funds") {
      if (typeof value === "number" && value >= 8000000) return "#059669";
      if (typeof value === "number" && value >= 5000000) return "#10b981";
      if (typeof value === "number" && value >= 3000000) return "#34d399";
      return "#6ee7b7";
    } else if (metric === "registrations") {
      if (typeof value === "number" && value >= 8000) return "#f97316";
      if (typeof value === "number" && value >= 6000) return "#fb923c";
      if (typeof value === "number" && value >= 4000) return "#fdba74";
      return "#fed7aa";
    }
    return "#6b7280";
  };

  // Format metric value
  const formatMetricValue = (metric: string, value: number): string => {
    if (metric === "beneficiaries_last_24h" || metric === "registrations_last_24h") {
      return value.toLocaleString();
    }
    if (metric === "funds" || metric === "funds_used") {
      return `₹${formatNumber(value)}`;
    }
    return formatNumber(value);
  };

  // Metric display name
  const getMetricDisplayName = (metric: string): string => {
    if (metric === "beneficiaries") return "Beneficiaries";
    if (metric === "funds") return "Funds Allocated";
    if (metric === "registrations") return "Total Registrations";
    return "Unknown Metric";
  };

  // Metric icon
  const getMetricIcon = (metric: string) => {
    if (metric === "beneficiaries") return <Users className="w-5 h-5" />;
    if (metric === "funds") return <IndianRupee className="w-5 h-5" />;
    if (metric === "registrations") return <TrendingUp className="w-5 h-5" />;
    return <TrendingUp className="w-5 h-5" />;
  };

  // Full metric name
  const getFullMetricName = () => {
    const metricName = getMetricDisplayName(selectedMetric);
    const filters = [];
    if (selectedScheme !== "all") filters.push(schemeDisplayNames[selectedScheme]);
    if (selectedGender !== "all") filters.push(genderDisplayNames[selectedGender]);
    if (selectedYear !== "all") filters.push(yearDisplayNames[selectedYear]);
    const demographicName = filters.length > 0 ? filters.join(", ") : "Overall";
    return `${metricName} (${demographicName})`;
  };

  // Brackets for pie chart legend
  const brackets = {
    beneficiaries: [
      { label: "<2K", min: 0, max: 2000, color: "#c4b5fd" },
      { label: "2K-3K", min: 2000, max: 3000, color: "#a78bfa" },
      { label: "3K-4K", min: 3000, max: 4000, color: "#8b5cf6" },
      { label: ">=4K", min: 4000, max: Infinity, color: "#6366f1" },
    ],
    funds: [
      { label: "<30L", min: 0, max: 3000000, color: "#6ee7b7" },
      { label: "30L-50L", min: 3000000, max: 5000000, color: "#34d399" },
      { label: "50L-80L", min: 5000000, max: 8000000, color: "#10b981" },
      { label: ">=80L", min: 8000000, max: Infinity, color: "#059669" },
    ],
    registrations: [
      { label: "<4K", min: 0, max: 4000, color: "#fed7aa" },
      { label: "4K-6K", min: 4000, max: 6000, color: "#fdba74" },
      { label: "6K-8K", min: 6000, max: 8000, color: "#fb923c" },
      { label: ">=8K", min: 8000, max: Infinity, color: "#f97316" },
    ],
  };

  // Pie chart data
  const pieData = useMemo(() => {
    if (!metricData || !filteredGeoJsonData || selectedScheme === "PMMSY") return [];
    const currentBrackets = brackets[selectedMetric];
    const counts = currentBrackets.map((bracket) => ({ ...bracket, count: 0 }));

    filteredGeoJsonData.features
      .filter(
        (f) =>
          (mapView === "state" && f.properties.level === "state") ||
          (mapView === "district" && f.properties.level === "district") ||
          (mapView === "sub-district" && f.properties.level === "sub-district")
      )
      .forEach((feature) => {
        const id = feature.properties.shapeID;
        const value = metricData[id]?.[demographicKey]?.[selectedMetric];
        if (value !== undefined) {
          const bracket = currentBrackets.find((b) => value >= b.min && (b.max === Infinity ? true : value < b.max));
          if (bracket) counts[currentBrackets.indexOf(bracket)].count++;
        }
      });

    return counts.map((c) => ({
      name: c.label,
      value: c.count,
      color: c.color,
    }));
  }, [metricData, filteredGeoJsonData, selectedMetric, demographicKey, mapView, selectedScheme]);

  // Bar chart data
  const overallMetricDataForSorting = useMemo(() => {
    if (!metricData || !polygonData || selectedScheme === "PMMSY") return {};
    const overallKey = `all_all_all`;
    const data: Record<string, number> = {};
    polygonData.features.forEach((feature) => {
      data[feature.properties.shapeID] = metricData[feature.properties.shapeID]?.[overallKey]?.[selectedMetric] ?? 0;
    });
    return data;
  }, [metricData, polygonData, selectedMetric, selectedScheme]);

  const barData = useMemo(() => {
    if (!metricData || !polygonData || selectedScheme === "PMMSY") return { data: [], keys: [], displayNamesMap: {} };

    const featuresForBarChart = polygonData.features.filter(
      (f) =>
        (mapView === "state" && f.properties.level === "state") ||
        (mapView === "district" && f.properties.level === "district") ||
        (mapView === "sub-district" && f.properties.level === "sub-district")
    );

    const sortedAreas = featuresForBarChart
      .map((feature) => ({
        id: feature.properties.shapeID,
        name: feature.properties.shapeName || "Unknown Area",
        overallValue: overallMetricDataForSorting[feature.properties.shapeID] || 0,
      }))
      .sort((a, b) => b.overallValue - a.overallValue)
      .slice(0, 10);

    let keys: string[] = [];
    let getDemographicKey: (areaId: string, key: string) => string;
    let displayNamesMap: Record<string, string> = {};

    switch (selectedBarChartCategory) {
      case "scheme":
        keys = ["PMMKSS", "PMMSY", "KCC", "NFDP"];
        getDemographicKey = (areaId, key) => `${key}_${selectedGender}_${selectedYear}`;
        displayNamesMap = schemeDisplayNames;
        break;
      case "gender":
        keys = ["male", "female", "transgender"];
        getDemographicKey = (areaId, key) => `${selectedScheme}_${key}_${selectedYear}`;
        displayNamesMap = genderDisplayNames;
        break;
      case "year":
        keys = ["2021", "2022", "2023", "2024"];
        getDemographicKey = (areaId, key) => `${selectedScheme}_${selectedGender}_${key}`;
        displayNamesMap = yearDisplayNames;
        break;
      default:
        return { data: [], keys: [], displayNamesMap: {} };
    }

    const rawData = sortedAreas.map((area) => {
      const categoryValues: Record<string, number> = {};
      keys.forEach((key) => {
        const fullKey = getDemographicKey(area.id, key);
        const value = metricData[area.id]?.[fullKey]?.[selectedMetric];
        categoryValues[key] = value ?? 0;
      });
      return { name: area.name, ...categoryValues };
    });

    return { data: rawData, keys, displayNamesMap };
  }, [
    metricData,
    polygonData,
    selectedMetric,
    selectedScheme,
    selectedGender,
    selectedYear,
    selectedBarChartCategory,
    overallMetricDataForSorting,
    mapView,
  ]);

  const { data: barChartData, keys: barChartKeys, displayNamesMap: barChartDisplayNamesMap } = barData;

  // Handle area click
  const handleAreaClick = (areaDetails: any) => {
    if (selectedScheme === "PMMSY" && pmmsyAreaSpecificMetrics) {
      const pmmsySpecificData = pmmsyAreaSpecificMetrics[areaDetails.id] || {
        totalProjects: 0,
        totalInvestment: 0,
        fishOutput: 0,
        totalEmploymentGenerated: 0,
        directEmploymentMen: 0,
        directEmploymentWomen: 0,
        indirectEmploymentMen: 0,
        indirectEmploymentWomen: 0,
        projectsByStateUT: [],
        sectorDistribution: [],
      };
      setSelectedAreaDetails({ ...areaDetails, pmmsyMetrics: pmmsySpecificData });
    } else {
      setSelectedAreaDetails(areaDetails);
    }
  };

  // Loading and error states
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-red-500">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Dashboard</h2>
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!polygonData || !metricData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-lg font-medium text-gray-900">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Fisheries Dashboard
              </h1>
            </div>
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-x-2">
              {selectedScheme !== "PMMSY" && (
                <>
                  <label htmlFor="metric-select" className="font-semibold text-xs sm:text-sm">
                    Metric
                  </label>
                  <select
                    id="metric-select"
                    value={selectedMetric}
                    onChange={(e) =>
                      setSelectedMetric(e.target.value as "beneficiaries" | "funds" | "registrations")
                    }
                    className="p-1 bg-gray-50 border border-gray-300 rounded-md text-xs sm:text-sm"
                  >
                    <option value="beneficiaries">Beneficiaries</option>
                    <option value="funds">Funds Allocated</option>
                    <option value="registrations">Total Registrations</option>
                  </select>
                </>
              )}
            </div>
            <div className="flex items-center gap-x-2">
              <button
                onClick={() => setMapView("state")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  mapView === "state"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                State View
              </button>
              <button
                onClick={() => setMapView("district")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  mapView === "district"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                District View
              </button>
              <button
                onClick={() => setMapView("sub-district")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  mapView === "sub-district"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Sub-District View
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto px-2 py-2">
        {/* Filters and KPIs */}
        <FiltersAndKPIs
          selectedMetric={selectedMetric}
          setSelectedMetric={setSelectedMetric}
          selectedScheme={selectedScheme}
          setSelectedScheme={setSelectedScheme}
          selectedGender={selectedGender}
          setSelectedGender={setSelectedGender}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedSectorPMMSY={selectedSectorPMMSY}
          setSelectedSectorPMMSY={debouncedSetSelectedSectorPMMSY}
          selectedActivityPMMSY={selectedActivityPMMSY}
          setSelectedActivityPMMSY={debouncedSetSelectedActivityPMMSY}
          selectedFinancialYearPMMSY={selectedFinancialYearPMMSY}
          setSelectedFinancialYearPMMSY={debouncedSetSelectedFinancialYearPMMSY}
          pmmsySectors={pmmsySectors}
          pmmsyActivityTypes={pmmsyActivityTypes}
          pmmsyFinancialYears={pmmsyFinancialYears}
          globalPMMSYMetrics={globalPMMSYMetrics}
          kpis={kpis}
          formatMetricValue={formatMetricValue}
          getMetricIcon={getMetricIcon}
        />

        {/* Main Content */}
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 transition-all duration-300 relative">
            <OpenLayersMap
              geoJsonData={filteredGeoJsonData}
              metricData={metricData}
              selectedMetric={selectedMetric}
              demographicKey={demographicKey}
              getColor={getColor}
              formatMetricValue={formatMetricValue}
              getFullMetricName={getFullMetricName}
              officerNames={officerNames}
              onAreaClick={handleAreaClick}
              mapView={mapView}
            />
            {selectedScheme !== "PMMSY" && (
              <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded-lg shadow-md border border-gray-200">
                <h4 className="text-sm font-semibold mb-2 text-gray-800">
                  {getMetricDisplayName(selectedMetric)} Legend
                </h4>
                <div className="space-y-1">
                  {brackets[selectedMetric].map((bracket, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: bracket.color }}></div>
                      <span className="text-xs text-gray-700">{bracket.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className={`${selectedAreaDetails ? "col-span-2" : "col-span-2"} space-y-2 ${selectedAreaDetails ? "block" : "hidden"} lg:block`}>
            {selectedScheme === "PMMSY" ? (
              <>
                <SectorDistributionPieChart
                  sectorDistribution={globalPMMSYMetrics.sectorDistribution}
                  getColor={getColor}
                />
                <ProjectsBarChart projectsByStateUT={globalPMMSYMetrics.projectsByStateUT} />
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2">
                  <h4 className="text-md font-semibold text-gray-800 mt-4 pl-4">Employment Generation</h4>
                  <div className="grid grid-cols-2 gap-3 p-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-600">Direct (Women)</p>
                      <p className="text-lg font-bold text-gray-800">{globalPMMSYMetrics.directEmploymentWomen.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-600">Direct (Men)</p>
                      <p className="text-lg font-bold text-gray-800">{globalPMMSYMetrics.directEmploymentMen.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-600">Indirect (Women)</p>
                      <p className="text-lg font-bold text-gray-800">{globalPMMSYMetrics.indirectEmploymentWomen.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-600">Indirect (Men)</p>
                      <p className="text-lg font-bold text-gray-800">{globalPMMSYMetrics.indirectEmploymentMen.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <DistributionPieChart pieData={pieData} />
                <TopAreasBarChart
                  barChartData={barChartData}
                  barChartKeys={barChartKeys}
                  barChartDisplayNamesMap={barChartDisplayNamesMap}
                  selectedMetric={selectedMetric}
                  getColor={getColor}
                  formatMetricValue={formatMetricValue}
                  mapView={mapView}
                  selectedBarChartCategory={selectedBarChartCategory}
                />
              </>
            )}
          </div>
        </div>

        {/* Area Details Popup */}
        <AreaDetailsPopup
          selectedAreaDetails={selectedAreaDetails}
          selectedScheme={selectedScheme}
          formatMetricValue={formatMetricValue}
          setSelectedAreaDetails={setSelectedAreaDetails}
        />
      </main>

      <footer className="bg-white/80 backdrop-blur-md border-t border-white/20 mt-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-600">
            <p>© 2025 Department of Fisheries Dashboard. All rights reserved.</p>
            <p className="text-sm mt-2">Supporting sustainable fisheries development</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;