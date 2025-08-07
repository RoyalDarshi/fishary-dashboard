import React, { useEffect, useState, useMemo, useCallback } from "react";
import { MapPin, Users, IndianRupee, TrendingUp, Fish } from "lucide-react";
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

// Interface for metric values
interface MetricValues {
  beneficiaries?: number;
  funds?: number;
  registrations?: number;
  totalProjects?: number;
  totalInvestment?: number;
  fishOutput?: number;
  funds_used?: number;
  beneficiaries_last_24h?: number;
  registrations_last_24h?: number;
}

// Type definitions for scheme, gender, year, and PMMSY metric filters
export type SchemeKey = "all" | "PMMKSS" | "PMMSY" | "KCC" | "NFDP";
export type GenderKey = "all" | "male" | "female" | "transgender";
export type YearKey = "all" | "2021" | "2022" | "2023" | "2024";
export type PMMSYMetricKey = "totalProjects" | "totalInvestment" | "fishOutput";

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

// Interface for aggregated PMMSY data (for charts)
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

// Display name mappings
const schemeDisplayNames: Record<SchemeKey, string> = {
  all: "All Schemes",
  PMMKSS: "PMMKSS",
  PMMSY: "PMMSY",
  KCC: "KCC",
  NFDP: "NFDP",
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
  const [selectedMetric, setSelectedMetric] = useState<"beneficiaries" | "funds" | "registrations" | PMMSYMetricKey>("beneficiaries");
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
  const [selectedSectorPMMSY, setSelectedSectorPMMSY] = useState<string>("all");
  const [selectedFinancialYearPMMSY, setSelectedFinancialYearPMMSY] = useState<string>("all");
  const [mockPMMSYData, setMockPMMSYData] = useState<Record<string, AreaMetricData> | null>(null);
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

  // Generate mock data for schemes other than PMMSY
  const generateMockData = (areas: GeoJSONFeature[]): Record<string, AreaMetricData> => {
    const dataMap: Record<string, AreaMetricData> = {};
    const schemes: SchemeKey[] = ["all", "PMMKSS", "KCC", "NFDP"];
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

  // Generate mock PMMSY data, aligned with other schemes
  const generateMockPMMSYData = useCallback((areas: GeoJSONFeature[]): Record<string, AreaMetricData> => {
    const dataMap: Record<string, AreaMetricData> = {};
    const genders: GenderKey[] = ["all", "male", "female", "transgender"];
    const years: YearKey[] = ["all", "2021", "2022", "2023", "2024"];
    const sectors = ["all", "Inland", "Marine"];

    areas.forEach((area) => {
      const areaId = area.properties.shapeID;
      const areaData: AreaMetricData = {};
      const regionalBias = area.properties.level === "state" ? 1.0 + Math.random() * 0.1 : 0.9 + Math.random() * 0.2;

      genders.forEach((gender) => {
        years.forEach((year) => {
          sectors.forEach((sector) => {
            const key = `PMMSY_${gender}_${year}_${sector}`;
            const genderMod = gender === "all" ? 1 : gender === "male" ? 1.2 : gender === "female" ? 0.9 : 0.8;
            const yearMod = year === "all" ? 1 : year === "2021" ? 0.8 : year === "2022" ? 0.9 : year === "2023" ? 1.0 : 1.1;
            const sectorMod = sector === "all" ? 1 : sector === "Inland" ? 1.1 : 0.9;
            const weight = genderMod * yearMod * sectorMod * regionalBias;

            const totalProjects = Math.floor(weight * (10 + Math.random() * 90));
            const totalInvestment = Math.floor(weight * (500000 + Math.random() * 4500000));
            const fishOutput = Math.floor(weight * (20 + Math.random() * 180));

            areaData[key] = {
              totalProjects,
              totalInvestment,
              fishOutput,
            };
          });
        });
      });
      dataMap[areaId] = areaData;
    });
    return dataMap;
  }, []);

  // Generate mock data for all schemes
  useEffect(() => {
    if (polygonData && !mockNonPMMSYData && !mockPMMSYData) {
      const nonPMMSYData = generateMockData(polygonData.features);
      const pmmsyData = generateMockPMMSYData(polygonData.features);
      setMockNonPMMSYData(nonPMMSYData);
      setMockPMMSYData(pmmsyData);
    }
  }, [polygonData, mockNonPMMSYData, mockPMMSYData, generateMockPMMSYData]);

  // Combine metric data based on scheme
  const combinedMetricData = useMemo(() => {
    if (!mockNonPMMSYData || !mockPMMSYData) return null;
    if (selectedScheme === "PMMSY") {
      const filteredData: Record<string, AreaMetricData> = {};
      Object.entries(mockPMMSYData).forEach(([areaId, areaData]) => {
        filteredData[areaId] = {};
        Object.entries(areaData).forEach(([key, metrics]) => {
          const [, gender, year, sector] = key.split("_");
          if (
            (selectedSectorPMMSY === "all" || sector === selectedSectorPMMSY) &&
            (selectedFinancialYearPMMSY === "all" || year === selectedFinancialYearPMMSY)
          ) {
            filteredData[areaId][`PMMSY_${gender}_${year}`] = metrics;
          }
        });
      });
      return filteredData;
    }
    return mockNonPMMSYData;
  }, [
    mockNonPMMSYData,
    mockPMMSYData,
    selectedScheme,
    selectedSectorPMMSY,
    selectedFinancialYearPMMSY,
  ]);

  // Aggregate PMMSY data for charts
  const aggregatePMMSYChartData = useCallback(() => {
    if (!mockPMMSYData) return;
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

    const projectsByStateUTMap = new Map<string, number>();
    const sectorDistributionMap = new Map<string, number>();

    Object.entries(mockPMMSYData).forEach(([areaId, areaData]) => {
      const feature = polygonData?.features.find((f) => f.properties.shapeID === areaId);
      const stateName = feature?.properties.state_name || "Unknown";

      Object.entries(areaData).forEach(([key, metrics]) => {
        const [, , year, sector] = key.split("_");
        if (
          (selectedSectorPMMSY === "all" || sector === selectedSectorPMMSY) &&
          (selectedFinancialYearPMMSY === "all" || year === selectedFinancialYearPMMSY)
        ) {
          globalMetrics.totalProjects += metrics.totalProjects || 0;
          globalMetrics.totalInvestment += metrics.totalInvestment || 0;
          globalMetrics.fishOutput += metrics.fishOutput || 0;
          projectsByStateUTMap.set(stateName, (projectsByStateUTMap.get(stateName) || 0) + (metrics.totalProjects || 0));
          if (sector !== "all") {
            sectorDistributionMap.set(sector, (sectorDistributionMap.get(sector) || 0) + (metrics.totalProjects || 0));
          }
        }
      });
    });

    // Mock employment data for charts
    globalMetrics.totalEmploymentGenerated = Math.floor(globalMetrics.totalProjects * (5 + Math.random() * 10));
    globalMetrics.directEmploymentMen = Math.floor(globalMetrics.totalEmploymentGenerated * 0.4);
    globalMetrics.directEmploymentWomen = Math.floor(globalMetrics.totalEmploymentGenerated * 0.3);
    globalMetrics.indirectEmploymentMen = Math.floor(globalMetrics.totalEmploymentGenerated * 0.2);
    globalMetrics.indirectEmploymentWomen = Math.floor(globalMetrics.totalEmploymentGenerated * 0.1);

    globalMetrics.projectsByStateUT = Array.from(projectsByStateUTMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    globalMetrics.sectorDistribution = Array.from(sectorDistributionMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    setGlobalPMMSYMetrics(globalMetrics);
  }, [mockPMMSYData, selectedSectorPMMSY, selectedFinancialYearPMMSY, polygonData]);

  // Update PMMSY chart data when filters change
  useEffect(() => {
    if (selectedScheme === "PMMSY") {
      aggregatePMMSYChartData();
    }
  }, [selectedScheme, selectedSectorPMMSY, selectedFinancialYearPMMSY, aggregatePMMSYChartData]);

  // Debounced state updates for PMMSY filters
  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const debouncedSetSelectedSectorPMMSY = useCallback(debounce(setSelectedSectorPMMSY, 300), []);
  const debouncedSetSelectedFinancialYearPMMSY = useCallback(debounce(setSelectedFinancialYearPMMSY, 300), []);

  // PMMSY filter options
  const pmmsySectors = useMemo(() => ["all", "Inland", "Marine"], []);
  const pmmsyFinancialYears = useMemo(() => ["all", "2021", "2022", "2023", "2024"], []);

  // Fetch GeoJSON and set metric data
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
        setMetricData(combinedMetricData);
      })
      .catch((err) => {
        console.error("GeoJSON load error:", err);
        setError(err.message);
      });
  }, [combinedMetricData]);

  // Update selectedMetric when scheme changes
  useEffect(() => {
    if (selectedScheme === "PMMSY") {
      setSelectedMetric("totalProjects");
    } else {
      setSelectedMetric("beneficiaries");
    }
  }, [selectedScheme]);

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

  // KPIs for all metrics
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

  // Color function for all metrics
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
    } else if (metric === "totalProjects") {
      if (typeof value === "number" && value >= 80) return "#6366f1";
      if (typeof value === "number" && value >= 50) return "#8b5cf6";
      if (typeof value === "number" && value >= 30) return "#a78bfa";
      return "#c4b5fd";
    } else if (metric === "totalInvestment") {
      if (typeof value === "number" && value >= 4000000) return "#059669";
      if (typeof value === "number" && value >= 2500000) return "#10b981";
      if (typeof value === "number" && value >= 1000000) return "#34d399";
      return "#6ee7b7";
    } else if (metric === "fishOutput") {
      if (typeof value === "number" && value >= 150) return "#f97316";
      if (typeof value === "number" && value >= 100) return "#fb923c";
      if (typeof value === "number" && value >= 50) return "#fdba74";
      return "#fed7aa";
    }
    return "#6b7280";
  };

  // Format metric value
  const formatMetricValue = (metric: string, value: number): string => {
    if (metric === "beneficiaries_last_24h" || metric === "registrations_last_24h" || metric === "totalProjects") {
      return value.toLocaleString();
    }
    if (metric === "funds" || metric === "funds_used" || metric === "totalInvestment") {
      return `₹${formatNumber(value)}`;
    }
    if (metric === "fishOutput") {
      return `${value.toFixed(2)} Tonnes`;
    }
    return formatNumber(value);
  };

  // Metric display name
  const getMetricDisplayName = (metric: string): string => {
    return {
      beneficiaries: "Beneficiaries",
      funds: "Funds Allocated",
      registrations: "Total Registrations",
      totalProjects: "Total Projects",
      totalInvestment: "Total Investment",
      fishOutput: "Fish Output",
    }[metric] || "Unknown Metric";
  };

  // Metric icon
  const getMetricIcon = (metric: string) => {
    if (metric === "beneficiaries") return <Users className="w-5 h-5" />;
    if (metric === "funds") return <IndianRupee className="w-5 h-5" />;
    if (metric === "registrations") return <TrendingUp className="w-5 h-5" />;
    if (metric === "totalProjects") return <TrendingUp className="w-5 h-5" />;
    if (metric === "totalInvestment") return <IndianRupee className="w-5 h-5" />;
    if (metric === "fishOutput") return <Fish className="w-5 h-5" />;
    return <TrendingUp className="w-5 h-5" />;
  };

  // Full metric name
  const getFullMetricName = () => {
    const metricName = getMetricDisplayName(selectedMetric);
    const filters = [];
    if (selectedScheme !== "all") filters.push(schemeDisplayNames[selectedScheme]);
    if (selectedGender !== "all") filters.push(genderDisplayNames[selectedGender]);
    if (selectedYear !== "all") filters.push(yearDisplayNames[selectedYear]);
    if (selectedScheme === "PMMSY") {
      if (selectedSectorPMMSY !== "all") filters.push(selectedSectorPMMSY);
      if (selectedFinancialYearPMMSY !== "all") filters.push(selectedFinancialYearPMMSY);
    }
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
    totalProjects: [
      { label: "<30", min: 0, max: 30, color: "#c4b5fd" },
      { label: "30-50", min: 30, max: 50, color: "#a78bfa" },
      { label: "50-80", min: 50, max: 80, color: "#8b5cf6" },
      { label: ">=80", min: 80, max: Infinity, color: "#6366f1" },
    ],
    totalInvestment: [
      { label: "<10L", min: 0, max: 1000000, color: "#6ee7b7" },
      { label: "10L-25L", min: 1000000, max: 2500000, color: "#34d399" },
      { label: "25L-40L", min: 2500000, max: 4000000, color: "#10b981" },
      { label: ">=40L", min: 4000000, max: Infinity, color: "#059669" },
    ],
    fishOutput: [
      { label: "<50T", min: 0, max: 50, color: "#fed7aa" },
      { label: "50-100T", min: 50, max: 100, color: "#fdba74" },
      { label: "100-150T", min: 100, max: 150, color: "#fb923c" },
      { label: ">=150T", min: 150, max: Infinity, color: "#f97316" },
    ],
  };

  // Pie chart data
  const pieData = useMemo(() => {
    if (!metricData || !filteredGeoJsonData) return [];
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
  }, [metricData, filteredGeoJsonData, selectedMetric, demographicKey, mapView]);

  // Bar chart data
  const overallMetricDataForSorting = useMemo(() => {
    if (!metricData || !polygonData) return {};
    const overallKey = selectedScheme === "PMMSY" ? `PMMSY_all_all` : `all_all_all`;
    const data: Record<string, number> = {};
    polygonData.features.forEach((feature) => {
      data[feature.properties.shapeID] = metricData[feature.properties.shapeID]?.[overallKey]?.[selectedMetric] ?? 0;
    });
    return data;
  }, [metricData, polygonData, selectedMetric, selectedScheme]);

  const barData = useMemo(() => {
    if (!metricData || !polygonData) return { data: [], keys: [], displayNamesMap: {} };

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
      .sort((a, b) => b.overallValue - a.value)
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
    if (selectedScheme === "PMMSY") {
      const metrics = metricData[areaDetails.id]?.[demographicKey] || {
        totalProjects: 0,
        totalInvestment: 0,
        fishOutput: 0,
      };
      // Compute employment metrics for the selected area
      const totalEmploymentGenerated = Math.floor(metrics.totalProjects * (5 + Math.random() * 10));
      const pmmsyMetrics: PMMSYAggregatedData = {
        totalProjects: metrics.totalProjects || 0,
        totalInvestment: metrics.totalInvestment || 0,
        fishOutput: metrics.fishOutput || 0,
        totalEmploymentGenerated,
        directEmploymentMen: Math.floor(totalEmploymentGenerated * 0.4),
        directEmploymentWomen: Math.floor(totalEmploymentGenerated * 0.3),
        indirectEmploymentMen: Math.floor(totalEmploymentGenerated * 0.2),
        indirectEmploymentWomen: Math.floor(totalEmploymentGenerated * 0.1),
        projectsByStateUT: [],
        sectorDistribution: [],
      };
      setSelectedAreaDetails({
        ...areaDetails,
        name: areaDetails.name || "Unknown Area",
        officer: officerNames[areaDetails.id] || "Unknown Officer",
        level: areaDetails.level || "Unknown",
        pmmsyMetrics,
      });
    } else {
      const metrics = metricData[areaDetails.id]?.[demographicKey] || {
        beneficiaries: 0,
        funds: 0,
        registrations: 0,
        funds_used: 0,
        beneficiaries_last_24h: 0,
        registrations_last_24h: 0,
      };
      setSelectedAreaDetails({
        ...areaDetails,
        name: areaDetails.name || "Unknown Area",
        officer: officerNames[areaDetails.id] || "Unknown Officer",
        level: areaDetails.level || "Unknown",
        metrics,
      });
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
              <label htmlFor="metric-select" className="font-semibold text-xs sm:text-sm">
                Metric
              </label>
              <select
                id="metric-select"
                value={selectedMetric}
                onChange={(e) =>
                  setSelectedMetric(e.target.value as "beneficiaries" | "funds" | "registrations" | PMMSYMetricKey)
                }
                className="p-1 bg-gray-50 border border-gray-300 rounded-md text-xs sm:text-sm"
              >
                {selectedScheme === "PMMSY" ? (
                  <>
                    <option value="totalProjects">Total Projects</option>
                    <option value="totalInvestment">Total Investment</option>
                    <option value="fishOutput">Fish Output</option>
                  </>
                ) : (
                  <>
                    <option value="beneficiaries">Beneficiaries</option>
                    <option value="funds">Funds Allocated</option>
                    <option value="registrations">Total Registrations</option>
                  </>
                )}
              </select>
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
          selectedFinancialYearPMMSY={selectedFinancialYearPMMSY}
          setSelectedFinancialYearPMMSY={debouncedSetSelectedFinancialYearPMMSY}
          pmmsySectors={pmmsySectors}
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