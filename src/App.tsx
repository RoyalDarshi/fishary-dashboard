import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  MapPin,
  Users,
  IndianRupee,
  TrendingUp,
  Fish,
  ArrowLeft,
  Undo2,
} from "lucide-react";
import OpenLayersMap from "./components/OpenLayerMap";
import AreaDetailsPopup from "./components/AreaDetailsPopup";
import FiltersAndKPIs from "./components/FiltersAndKPIs";
import BiharFullTable from "./components/BiharFullTable";
import {
  SectorDistributionPieChart,
  DistributionPieChart,
  TopAreasBarChart,
  EmploymentBarChart,
} from "./components/Charts";

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
    st_nm?: string;
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
  PMMKSS: "Pradhan Mantri Matsya Kisaan Samridhi Sah-Yojana",
  PMMSY: "Pradhan Mantri Matsya Sampada Yojana",
  KCC: "Kisan Credit Card",
  NFDP: "The National Fisheries Digital Platform",
};

const genderDisplayNames: Record<GenderKey, string> = {
  all: "All Genders",
  male: "Male",
  female: "Female",
  transgender: "Transgender",
};

const categoryColors: Record<SchemeKey, string> = {
  PMMKSS: "#2563eb", // Blue
  PMMSY: "#10b981", // Green
  KCC: "#f97316", // Orange
  NFDP: "#9333ea", // Purple
  all: "#6b7280", // Default gray
};

const schemeIcons: Record<SchemeKey, JSX.Element> = {
  PMMKSS: <Users className="w-6 h-6 text-white" />,
  PMMSY: <Fish className="w-6 h-6 text-white" />,
  KCC: <IndianRupee className="w-6 h-6 text-white" />,
  NFDP: <TrendingUp className="w-6 h-6 text-white" />,
  all: <MapPin className="w-6 h-6 text-white" />,
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
  const [metricData, setMetricData] = useState<Record<
    string,
    AreaMetricData
  > | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<
    "beneficiaries" | "funds" | "registrations" | PMMSYMetricKey
  >("beneficiaries");
  const [selectedScheme, setSelectedScheme] = useState<SchemeKey | null>(null);
  const [selectedGender, setSelectedGender] = useState<GenderKey>("all");
  const [schemeTotals, setSchemeTotals] = useState<Record<
    SchemeKey,
    number
  > | null>(null);
  const [selectedYear, setSelectedYear] = useState<YearKey>("all");
  const [error, setError] = useState<string | null>(null);
  const [selectedAreaDetails, setSelectedAreaDetails] = useState<any | null>(
    null
  );
  const [drilledAreaDetails, setDrilledAreaDetails] = useState<any | null>(
    null
  );
  const [selectedBarChartCategory, setSelectedBarChartCategory] = useState<
    "scheme" | "gender" | "year"
  >("scheme");
  const [mapView, setMapView] = useState<"state" | "district" | "sub-district">(
    "state"
  );
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [biharGeoJson, setBiharGeoJson] = useState<any | null>(null);
  const [globalPMMSYMetrics, setGlobalPMMSYMetrics] =
    useState<PMMSYAggregatedData>({
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
  const [selectedFinancialYearPMMSY, setSelectedFinancialYearPMMSY] =
    useState<string>("all");
  const [mockPMMSYData, setMockPMMSYData] = useState<Record<
    string,
    AreaMetricData
  > | null>(null);
  const [mockNonPMMSYData, setMockNonPMMSYData] = useState<Record<
    string,
    AreaMetricData
  > | null>(null);

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
  const generateMockData = (
    areas: GeoJSONFeature[]
  ): Record<string, AreaMetricData> => {
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
      const regionalBias =
        area.properties.level === "state"
          ? 1.0 + Math.random() * 0.1
          : 0.9 + Math.random() * 0.2;

      schemes.forEach((scheme) => {
        genders.forEach((gender) => {
          years.forEach((year) => {
            const key = `${scheme}_${gender}_${year}`;
            const schemeMod = schemeModifiers[scheme];
            const genderMod = genderModifiers[gender];
            const yearMod = yearModifiers[year];
            const weight = schemeMod * genderMod * yearMod * regionalBias;

            const beneficiaries = Math.floor(
              weight * (500 + Math.random() * 4500)
            );
            const funds = Math.floor(
              weight * (1000000 + Math.random() * 9000000)
            );
            const registrations = Math.floor(
              weight * (2000 + Math.random() * 8000)
            );

            const funds_used = Math.floor(funds * (0.6 + Math.random() * 0.35));
            const beneficiaries_last_24h = Math.floor(
              beneficiaries * (0.01 + Math.random() * 0.05)
            );
            const registrations_last_24h = Math.floor(
              registrations * (0.005 + Math.random() * 0.02)
            );

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
  const generateMockPMMSYData = useCallback(
    (areas: GeoJSONFeature[]): Record<string, AreaMetricData> => {
      const dataMap: Record<string, AreaMetricData> = {};
      const genders: GenderKey[] = ["male", "female", "transgender"];
      const years: YearKey[] = ["2021", "2022", "2023", "2024"];
      const sectors = ["Inland", "Marine"];

      areas.forEach((area) => {
        const areaId = area.properties.shapeID;
        const areaData: AreaMetricData = {};
        const regionalBias = 0.1 + Math.random() * 1.9;

        // Precompute aggregated data for common filter combinations
        const aggregated: Record<string, MetricValues> = {
          PMMSY_all_all_all: {
            totalProjects: 0,
            totalInvestment: 0,
            fishOutput: 0,
          },
        };

        genders.forEach((gender) => {
          years.forEach((year) => {
            sectors.forEach((sector) => {
              const key = `PMMSY_${gender}_${year}_${sector}`;
              const genderMod =
                gender === "male" ? 1.2 : gender === "female" ? 0.9 : 0.8;
              const yearMod =
                year === "2021"
                  ? 0.8
                  : year === "2022"
                  ? 0.9
                  : year === "2023"
                  ? 1.0
                  : 1.1;
              const sectorMod = sector === "Inland" ? 1.1 : 0.9;
              const weight = genderMod * yearMod * sectorMod * regionalBias;

              const totalProjects = Math.floor(
                weight * (3 + Math.random() * 1)
              );
              const totalInvestment = Math.floor(
                weight * (50000 + Math.random() * 450000)
              );
              const fishOutput = Math.floor(weight * (5 + Math.random() * 1));

              areaData[key] = {
                totalProjects,
                totalInvestment,
                fishOutput,
              };

              // Update aggregated data
              aggregated["PMMSY_all_all_all"].totalProjects! += totalProjects;
              aggregated["PMMSY_all_all_all"].totalInvestment! +=
                totalInvestment;
              aggregated["PMMSY_all_all_all"].fishOutput! += fishOutput;

              // Add aggregations for specific filters
              const genderKey = `PMMSY_${gender}_all_all`;
              const yearKey = `PMMSY_all_${year}_all`;
              const sectorKey = `PMMSY_all_all_${sector}`;
              if (!aggregated[genderKey]) {
                aggregated[genderKey] = {
                  totalProjects: 0,
                  totalInvestment: 0,
                  fishOutput: 0,
                };
              }
              if (!aggregated[yearKey]) {
                aggregated[yearKey] = {
                  totalProjects: 0,
                  totalInvestment: 0,
                  fishOutput: 0,
                };
              }
              if (!aggregated[sectorKey]) {
                aggregated[sectorKey] = {
                  totalProjects: 0,
                  totalInvestment: 0,
                  fishOutput: 0,
                };
              }
              aggregated[genderKey].totalProjects! += totalProjects;
              aggregated[genderKey].totalInvestment! += totalInvestment;
              aggregated[genderKey].fishOutput! += fishOutput;
              aggregated[yearKey].totalProjects! += totalProjects;
              aggregated[yearKey].totalInvestment! += totalInvestment;
              aggregated[yearKey].fishOutput! += fishOutput;
              aggregated[sectorKey].totalProjects! += totalProjects;
              aggregated[sectorKey].totalInvestment! += totalInvestment;
              aggregated[sectorKey].fishOutput! += fishOutput;
            });
          });
        });

        // Store aggregated data
        Object.assign(areaData, aggregated);
        dataMap[areaId] = areaData;
      });

      return dataMap;
    },
    []
  );

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
      const filterKey = `PMMSY_${selectedGender}_${selectedFinancialYearPMMSY}_${selectedSectorPMMSY}`;
      const filteredData: Record<string, AreaMetricData> = {};
      Object.entries(mockPMMSYData).forEach(([areaId, areaData]) => {
        // Use precomputed aggregated data if available
        const metrics = areaData[filterKey] || {
          totalProjects: 0,
          totalInvestment: 0,
          fishOutput: 0,
        };
        filteredData[areaId] = { PMMSY_aggregated: metrics };
      });
      return filteredData;
    }
    return mockNonPMMSYData;
  }, [
    mockNonPMMSYData,
    mockPMMSYData,
    selectedScheme,
    selectedGender,
    selectedSectorPMMSY,
    selectedFinancialYearPMMSY,
  ]);

  // Debounced state updates for PMMSY filters
  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  useEffect(() => {
    if (!mockNonPMMSYData || !mockPMMSYData) return;

    const totals: Record<SchemeKey, number> = {
      all: 0,
      PMMKSS: 0,
      PMMSY: 0,
      KCC: 0,
      NFDP: 0,
    };

    // Calculate for non-PMMSY schemes
    const nonPMMSYSchemes: SchemeKey[] = ["PMMKSS", "KCC", "NFDP"];
    nonPMMSYSchemes.forEach((scheme) => {
      Object.values(mockNonPMMSYData).forEach((areaData) => {
        const key = `${scheme}_all_all`;
        totals[scheme] += areaData[key]?.funds || 0;
      });
    });

    // Calculate for PMMSY
    Object.values(mockPMMSYData).forEach((areaData) => {
      console.log(areaData);
      const key = "PMMSY_all_all_all";
      totals.PMMSY += areaData[key]?.totalInvestment || 0;
    });

    setSchemeTotals(totals);
  }, [mockNonPMMSYData, mockPMMSYData]);

  const debouncedSetSelectedSectorPMMSY = useCallback(
    debounce(setSelectedSectorPMMSY, 0),
    []
  );
  const debouncedSetSelectedFinancialYearPMMSY = useCallback(
    debounce(setSelectedFinancialYearPMMSY, 0),
    []
  );

  // PMMSY filter options
  const pmmsySectors = useMemo(() => ["all", "Inland", "Marine"], []);
  const pmmsyFinancialYears = useMemo(
    () => ["all", "2021", "2022", "2023", "2024"],
    []
  );

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

  useEffect(() => {
    fetch("/bihar1.geojson")
      .then((res) => res.json())
      .then((data) => {
        const normalized = {
          ...data,
          features: data.features.map((f: any, idx: number) => ({
            ...f,
            properties: {
              ...f.properties,
              shapeID: f.properties.Dist_Code?.toString() || `bihar_${idx}`,
              shapeName: f.properties.Dist_Name,
              st_nm: f.properties.State_Name || "Bihar",
              district_name: f.properties.Dist_Name,
              level: "district",
            },
          })),
        };

        setBiharGeoJson(normalized);

        // ✅ Generate Bihar district metrics based on Bihar state data
        setMetricData((prev: any) => {
          if (!prev) return prev;

          // Find Bihar state metrics from India map
          const biharStateId = Object.keys(prev).find((id) =>
            polygonData?.features.some(
              (f) =>
                f.properties.shapeID === id &&
                f.properties.shapeName === "Bihar"
            )
          );

          if (!biharStateId) return prev;

          const biharStateMetrics = prev[biharStateId];

          // Distribute Bihar totals randomly across districts
          const biharMetrics = distributeBiharMetrics(
            biharStateMetrics,
            normalized.features
          );

          return { ...prev, ...biharMetrics };
        });
      })
      .catch((err) => console.error("Failed to load Bihar GeoJSON:", err));
  }, [polygonData]);

  // Distribute Bihar state metrics randomly across its districts
  // Distribute Bihar state metrics randomly across its districts
  const distributeBiharMetrics = (
    biharStateMetrics: AreaMetricData,
    districts: GeoJSONFeature[]
  ): Record<string, AreaMetricData> => {
    const districtMetrics: Record<string, AreaMetricData> = {};

    Object.entries(biharStateMetrics).forEach(([key, metrics]: any) => {
      Object.entries(metrics).forEach(([mKey, mVal]) => {
        if (typeof mVal !== "number") return;

        // 1. Random weights for districts
        const weights = districts.map(() => Math.random());
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const normalizedWeights = weights.map((w) => w / totalWeight);

        // 2. Assign values with random distribution
        const tempValues = normalizedWeights.map((w) => mVal * w);

        // 3. Rescale so sum matches Bihar state total
        const sumTemp = tempValues.reduce((a, b) => a + b, 0);
        const scale = mVal / sumTemp;

        districts.forEach((dist, idx) => {
          const distId = dist.properties.shapeID;
          if (!districtMetrics[distId]) districtMetrics[distId] = {};
          if (!districtMetrics[distId][key]) districtMetrics[distId][key] = {};

          districtMetrics[distId][key][mKey] = Math.floor(
            tempValues[idx] * scale
          );
        });
      });
    });

    return districtMetrics;
  };

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

    let stateFeaturesToShow = polygonData.features.filter(
      (f) => f.properties.level === "state"
    );
    let districtFeaturesToShow = polygonData.features.filter(
      (f) => f.properties.level === "district"
    );
    let subDistrictFeaturesToShow = polygonData.features.filter(
      (f) => f.properties.level === "sub-district"
    );

    if (selectedState) {
      stateFeaturesToShow = stateFeaturesToShow.filter(
        (f) => f.properties.shapeName === selectedState
      );
      districtFeaturesToShow = districtFeaturesToShow.filter(
        (f) => f.properties.st_nm === selectedState
      );
      subDistrictFeaturesToShow = subDistrictFeaturesToShow.filter(
        (f) => f.properties.st_nm === selectedState
      );
    }

    if (mapView === "state") {
      return { ...polygonData, features: stateFeaturesToShow };
    } else if (mapView === "district") {
      return {
        ...polygonData,
        features: [...districtFeaturesToShow, ...stateFeaturesToShow],
      };
    } else {
      return {
        ...polygonData,
        features: [
          ...subDistrictFeaturesToShow,
          ...districtFeaturesToShow,
          ...stateFeaturesToShow,
        ],
      };
    }
  }, [polygonData, mapView, selectedState]);

  // Aggregate PMMSY data for charts
  const aggregatePMMSYChartData = useCallback(() => {
    if (!mockPMMSYData || !filteredGeoJsonData) return;

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

    const projectsByAreaMap = new Map<string, number>();
    const sectorDistributionMap = new Map<string, number>();

    const featuresForChart = filteredGeoJsonData.features.filter(
      (f) => f.properties.level === mapView
    );

    featuresForChart.forEach((feature) => {
      const areaId = feature.properties.shapeID;
      const areaData = mockPMMSYData[areaId];
      if (!areaData) return;

      let areaName = feature.properties.shapeName || "Unknown";
      if (mapView === "district" && feature.properties.district_name) {
        areaName = feature.properties.district_name;
      }
      if (mapView === "sub-district" && feature.properties.subdistrict_name) {
        areaName = feature.properties.subdistrict_name;
      }

      Object.entries(areaData).forEach(([key, metrics]) => {
        const [, gender, year, sector] = key.split("_");
        const genderMatch =
          selectedGender === "all" || gender === selectedGender;
        const yearMatch =
          selectedFinancialYearPMMSY === "all" ||
          year === selectedFinancialYearPMMSY;
        const sectorMatch =
          selectedSectorPMMSY === "all" || sector === selectedSectorPMMSY;

        if (genderMatch && yearMatch && sectorMatch) {
          globalMetrics.totalProjects += metrics.totalProjects || 0;
          globalMetrics.totalInvestment += metrics.totalInvestment || 0;
          globalMetrics.fishOutput += metrics.fishOutput || 0;

          const metricValue = metrics[selectedMetric] || 0;
          projectsByAreaMap.set(
            areaName,
            (projectsByAreaMap.get(areaName) || 0) + metricValue
          );

          if (sector !== "all") {
            sectorDistributionMap.set(
              sector,
              (sectorDistributionMap.get(sector) || 0) +
                (metrics.totalProjects || 0)
            );
          }
        }
      });
    });

    globalMetrics.totalEmploymentGenerated = Math.floor(
      globalMetrics.totalProjects * (5 + Math.random() * 10)
    );
    globalMetrics.directEmploymentMen = Math.floor(
      globalMetrics.totalEmploymentGenerated * 0.4
    );
    globalMetrics.directEmploymentWomen = Math.floor(
      globalMetrics.totalEmploymentGenerated * 0.3
    );
    globalMetrics.indirectEmploymentMen = Math.floor(
      globalMetrics.totalEmploymentGenerated * 0.2
    );
    globalMetrics.indirectEmploymentWomen = Math.floor(
      globalMetrics.totalEmploymentGenerated * 0.1
    );

    globalMetrics.projectsByStateUT = Array.from(projectsByAreaMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    globalMetrics.sectorDistribution = Array.from(
      sectorDistributionMap.entries()
    ).map(([name, value]) => ({
      name,
      value,
    }));

    setGlobalPMMSYMetrics(globalMetrics);
  }, [
    mockPMMSYData,
    filteredGeoJsonData,
    mapView,
    selectedGender,
    selectedSectorPMMSY,
    selectedFinancialYearPMMSY,
    selectedMetric,
  ]);

  // Update PMMSY chart data when filters change
  useEffect(() => {
    if (selectedScheme === "PMMSY") {
      aggregatePMMSYChartData();
    }
  }, [
    selectedScheme,
    selectedGender,
    selectedSectorPMMSY,
    selectedFinancialYearPMMSY,
    aggregatePMMSYChartData,
  ]);

  // Memoized demographic key
  const demographicKey = useMemo(() => {
    if (selectedScheme === "PMMSY") {
      return "PMMSY_aggregated";
    }
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
  }, [
    metricData,
    selectedMetric,
    demographicKey,
    filteredGeoJsonData,
    mapView,
  ]);

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

    if (typeof value === "string" && categoryColors[value])
      return categoryColors[value];

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
    if (
      metric === "beneficiaries_last_24h" ||
      metric === "registrations_last_24h" ||
      metric === "totalProjects"
    ) {
      return value.toLocaleString();
    }
    if (
      metric === "funds" ||
      metric === "funds_used" ||
      metric === "totalInvestment"
    ) {
      if (mapView === "district" && selectedScheme === "PMMSY")
        return `₹${formatNumber(value / 20)}`;
      else if (mapView === "sub-district" && selectedScheme === "PMMSY")
        return `₹${formatNumber(value / 200)}`;
      return `₹${formatNumber(value)}`;
    }
    if (metric === "fishOutput") {
      if (mapView === "district") return `${(value / 20).toFixed(2)} Tonnes`;
      if (mapView === "sub-district")
        return `${(value / 200).toFixed(2)} Tonnes`;
      return `${value.toFixed(2)} Tonnes`;
    }
    return formatNumber(value);
  };

  // Metric display name
  const getMetricDisplayName = (metric: string): string => {
    return (
      {
        beneficiaries: "Beneficiaries",
        funds: "Funds Allocated",
        registrations: "Total Registrations",
        totalProjects: "Total Projects",
        totalInvestment: "Total Investment",
        fishOutput: "Fish Output",
      }[metric] || "Unknown Metric"
    );
  };

  // Metric icon
  const getMetricIcon = (metric: string) => {
    if (metric === "beneficiaries") return <Users className="w-5 h-5" />;
    if (metric === "funds") return <IndianRupee className="w-5 h-5" />;
    if (metric === "registrations") return <TrendingUp className="w-5 h-5" />;
    if (metric === "totalProjects") return <TrendingUp className="w-5 h-5" />;
    if (metric === "totalInvestment")
      return <IndianRupee className="w-5 h-5" />;
    if (metric === "fishOutput") return <Fish className="w-5 h-5" />;
    return <TrendingUp className="w-5 h-5" />;
  };

  // Full metric name
  const getFullMetricName = (): string => {
    return getMetricDisplayName(selectedMetric);
  };

  // Brackets for pie chart (distribution by metric range)
  const brackets = {
    beneficiaries: [
      { min: 4000, max: Infinity, label: "4000+", color: "#6366f1" },
      { min: 3000, max: 4000, label: "3000-4000", color: "#8b5cf6" },
      { min: 2000, max: 3000, label: "2000-3000", color: "#a78bfa" },
      { min: 0, max: 2000, label: "0-2000", color: "#c4b5fd" },
    ],
    funds: [
      { min: 8000000, max: Infinity, label: "80L+", color: "#059669" },
      { min: 5000000, max: 8000000, label: "50L-80L", color: "#10b981" },
      { min: 3000000, max: 5000000, label: "30L-50L", color: "#34d399" },
      { min: 0, max: 3000000, label: "0-30L", color: "#6ee7b7" },
    ],
    registrations: [
      { min: 8000, max: Infinity, label: "8000+", color: "#f97316" },
      { min: 6000, max: 8000, label: "6000-8000", color: "#fb923c" },
      { min: 4000, max: 6000, label: "4000-6000", color: "#fdba74" },
      { min: 0, max: 4000, label: "0-4000", color: "#fed7aa" },
    ],
    totalProjects: [
      { min: 80, max: Infinity, label: "80+", color: "#6366f1" },
      { min: 50, max: 80, label: "50-80", color: "#8b5cf6" },
      { min: 30, max: 50, label: "30-50", color: "#a78bfa" },
      { min: 0, max: 30, label: "0-30", color: "#c4b5fd" },
    ],
    totalInvestment: [
      { min: 4000000, max: Infinity, label: "40L+", color: "#059669" },
      { min: 2500000, max: 4000000, label: "25L-40L", color: "#10b981" },
      { min: 1000000, max: 2500000, label: "10L-25L", color: "#34d399" },
      { min: 0, max: 1000000, label: "0-10L", color: "#6ee7b7" },
    ],
    fishOutput: [
      { min: 150, max: Infinity, label: "150+", color: "#f97316" },
      { min: 100, max: 150, label: "100-150", color: "#fb923c" },
      { min: 50, max: 100, label: "50-100", color: "#fdba74" },
      { min: 0, max: 50, label: "0-50", color: "#fed7aa" },
    ],
  };

  // Pie chart data (distribution by metric range)
  const pieData = useMemo(() => {
    if (!metricData || !filteredGeoJsonData || !brackets[selectedMetric])
      return [];
    const currentBrackets = brackets[selectedMetric];
    const counts = currentBrackets.map(() => ({
      count: 0,
      label: "",
      color: "",
    }));
    currentBrackets.forEach((bracket, index) => {
      counts[index].label = bracket.label;
      counts[index].color = bracket.color;
    });
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
          const bracket = currentBrackets.find(
            (b) => value >= b.min && (b.max === Infinity ? true : value < b.max)
          );
          if (bracket) counts[currentBrackets.indexOf(bracket)].count++;
        }
      });

    return counts.map((c) => ({
      name: c.label,
      value: c.count,
      color: c.color,
    }));
  }, [
    metricData,
    filteredGeoJsonData,
    selectedMetric,
    demographicKey,
    mapView,
  ]);

  // Bar chart data for PMMSY
  const pmmsyBarData = useMemo(() => {
    if (!mockPMMSYData || !filteredGeoJsonData)
      return { data: [], keys: [], displayNamesMap: {} };

    const featuresForBarChart = filteredGeoJsonData.features.filter(
      (f) => f.properties.level === mapView
    );

    const overallMetricDataForSorting: Record<string, number> = {};
    featuresForBarChart.forEach((feature) => {
      const areaId = feature.properties.shapeID;
      const areaData = mockPMMSYData[areaId];
      if (!areaData) return;
      let totalValue = 0;
      Object.entries(areaData).forEach(([key, metrics]) => {
        const [, gender, year, sector] = key.split("_");
        const genderMatch =
          selectedGender === "all" || gender === selectedGender;
        const yearMatch =
          selectedFinancialYearPMMSY === "all" ||
          year === selectedFinancialYearPMMSY;
        const sectorMatch =
          selectedSectorPMMSY === "all" || sector === selectedSectorPMMSY;
        if (genderMatch && yearMatch && sectorMatch) {
          totalValue += metrics[selectedMetric] || 0;
        }
      });
      overallMetricDataForSorting[areaId] = totalValue;
    });

    const sortedAreas = featuresForBarChart
      .map((feature) => ({
        id: feature.properties.shapeID,
        name: feature.properties.shapeName || "Unknown Area",
        overallValue:
          overallMetricDataForSorting[feature.properties.shapeID] || 0,
      }))
      .sort((a, b) => b.overallValue - a.overallValue)
      .slice(0, 10);

    let keys: string[] = [];
    let getDemographicKey: (areaId: string, key: string) => string;
    let displayNamesMap: Record<string, string> = {};

    switch (selectedBarChartCategory) {
      case "gender":
        keys = ["male", "female", "transgender"];
        getDemographicKey = (areaId, key) =>
          `PMMSY_${key}_${
            selectedFinancialYearPMMSY === "all"
              ? "2024"
              : selectedFinancialYearPMMSY
          }_${selectedSectorPMMSY === "all" ? "Inland" : selectedSectorPMMSY}`;
        displayNamesMap = genderDisplayNames;
        break;
      case "year":
        keys = ["2021", "2022", "2023", "2024"];
        getDemographicKey = (areaId, key) =>
          `PMMSY_${selectedGender === "all" ? "male" : selectedGender}_${key}_${
            selectedSectorPMMSY === "all" ? "Inland" : selectedSectorPMMSY
          }`;
        displayNamesMap = yearDisplayNames;
        break;
      case "scheme":
        keys = ["Inland", "Marine"];
        getDemographicKey = (areaId, key) =>
          `PMMSY_${selectedGender === "all" ? "male" : selectedGender}_${
            selectedFinancialYearPMMSY === "all"
              ? "2024"
              : selectedFinancialYearPMMSY
          }_${key}`;
        displayNamesMap = { Inland: "Inland", Marine: "Marine" };
        break;
      default:
        return { data: [], keys: [], displayNamesMap: {} };
    }

    const data = sortedAreas.map((area) => {
      const categoryValues: Record<string, number> = {};
      keys.forEach((key) => {
        const fullKey = getDemographicKey(area.id, key);
        const value = mockPMMSYData[area.id]?.[fullKey]?.[selectedMetric] || 0;
        categoryValues[key] = value;
      });
      return { name: area.name, ...categoryValues };
    });

    return { data, keys, displayNamesMap };
  }, [
    mockPMMSYData,
    filteredGeoJsonData,
    selectedMetric,
    selectedGender,
    selectedFinancialYearPMMSY,
    selectedSectorPMMSY,
    selectedBarChartCategory,
    mapView,
  ]);

  // Bar chart data for non-PMMSY
  const overallMetricDataForSorting = useMemo(() => {
    if (!metricData || !filteredGeoJsonData) return {};
    const overallKey =
      selectedScheme === "PMMSY" ? "PMMSY_aggregated" : `all_all_all`;
    const data: Record<string, number> = {};
    filteredGeoJsonData.features.forEach((feature) => {
      data[feature.properties.shapeID] =
        metricData[feature.properties.shapeID]?.[overallKey]?.[
          selectedMetric
        ] ?? 0;
    });
    return data;
  }, [metricData, filteredGeoJsonData, selectedMetric, selectedScheme]);

  const barData = useMemo(() => {
    if (!metricData || !filteredGeoJsonData)
      return { data: [], keys: [], displayNamesMap: {} };

    const featuresForBarChart = filteredGeoJsonData.features.filter(
      (f) => f.properties.level === mapView
    );

    const sortedAreas = featuresForBarChart
      .map((feature) => ({
        id: feature.properties.shapeID,
        name: feature.properties.shapeName || "Unknown Area",
        overallValue:
          overallMetricDataForSorting[feature.properties.shapeID] || 0,
      }))
      .sort((a, b) => b.overallValue - a.overallValue)
      .slice(0, 10);

    let keys: string[] = [];
    let getDemographicKey: (areaId: string, key: string) => string;
    let displayNamesMap: Record<string, string> = {};

    switch (selectedBarChartCategory) {
      case "scheme":
        keys = ["PMMKSS", "KCC", "NFDP"]; // Removed PMMSY to fix bug
        getDemographicKey = (areaId, key) =>
          `${key}_${selectedGender}_${selectedYear}`;
        displayNamesMap = schemeDisplayNames;
        break;
      case "gender":
        keys = ["male", "female", "transgender"];
        getDemographicKey = (areaId, key) =>
          `${selectedScheme}_${key}_${selectedYear}`;
        displayNamesMap = genderDisplayNames;
        break;
      case "year":
        keys = ["2021", "2022", "2023", "2024"];
        getDemographicKey = (areaId, key) =>
          `${selectedScheme}_${selectedGender}_${key}`;
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
    filteredGeoJsonData,
    selectedMetric,
    selectedScheme,
    selectedGender,
    selectedYear,
    selectedBarChartCategory,
    overallMetricDataForSorting,
    mapView,
  ]);

  const {
    data: barChartData,
    keys: barChartKeys,
    displayNamesMap: barChartDisplayNamesMap,
  } = barData;

  const handleSelectedScheme = (scheme: SchemeKey) => {
    setSelectedScheme(scheme);
    setSelectedState(null);
  };

  const isBiharView = selectedState === "Bihar";

  // Handle area click
  const handleAreaClick = (areaDetails: any) => {
    if (!polygonData || !metricData) return;

    // Determine the group for averaging based on area type
    const getAverageGroup = (level: string, properties: any) => {
      if (level === "state") {
        return polygonData.features.filter(
          (f) => f.properties.level === "state"
        );
      } else if (level === "district") {
        return polygonData.features.filter(
          (f) =>
            f.properties.level === "district" &&
            f.properties.st_nm === properties.st_nm
        );
      } else if (level === "sub-district") {
        return polygonData.features.filter(
          (f) =>
            f.properties.level === "sub-district" &&
            f.properties.district_name === properties.district_name
        );
      }
      return [];
    };

    const group = getAverageGroup(areaDetails.level, areaDetails);
    const metricSums: { [key: string]: number } = {};
    const count = group.length;

    group.forEach((feature) => {
      const areaMetrics =
        metricData[feature.properties.shapeID]?.[demographicKey];
      if (areaMetrics) {
        Object.keys(areaMetrics).forEach((key) => {
          metricSums[key] = (metricSums[key] || 0) + (areaMetrics[key] || 0);
        });
      }
    });

    const averages: { [key: string]: number } = {};
    Object.keys(metricSums).forEach((key) => {
      averages[key] = count > 0 ? metricSums[key] / count : 0;
    });

    if (selectedScheme === "PMMSY") {
      const metrics = metricData[areaDetails.id]?.[demographicKey] || {
        totalProjects: 0,
        totalInvestment: 0,
        fishOutput: 0,
      };
      const totalEmploymentGenerated = Math.floor(
        metrics.totalProjects * (5 + Math.random() * 10)
      );
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
      const averageTotalEmploymentGenerated = Math.floor(
        averages.totalProjects * (5 + Math.random() * 10)
      );
      const pmmsyAverages: PMMSYAggregatedData = {
        totalProjects: averages.totalProjects || 0,
        totalInvestment: averages.totalInvestment || 0,
        fishOutput: averages.fishOutput || 0,
        totalEmploymentGenerated: averageTotalEmploymentGenerated,
        directEmploymentMen: Math.floor(averageTotalEmploymentGenerated * 0.4),
        directEmploymentWomen: Math.floor(
          averageTotalEmploymentGenerated * 0.3
        ),
        indirectEmploymentMen: Math.floor(
          averageTotalEmploymentGenerated * 0.2
        ),
        indirectEmploymentWomen: Math.floor(
          averageTotalEmploymentGenerated * 0.1
        ),
        projectsByStateUT: [],
        sectorDistribution: [],
      };
      setSelectedAreaDetails({
        ...areaDetails,
        name: areaDetails.name || "Unknown Area",
        officer: officerNames[areaDetails.id] || "Unknown Officer",
        level: areaDetails.level || "Unknown",
        pmmsyMetrics,
        pmmsyAverages,
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
        averages,
      });
    }
  };

  // Handle drill down
  const handleDrillDown = (areaDetails: any) => {
    if (!polygonData || !metricData) return;

    // Determine the group for averaging based on area type
    const getAverageGroup = (level: string, properties: any) => {
      if (level === "state") {
        return polygonData.features.filter(
          (f) => f.properties.level === "state"
        );
      } else if (level === "district") {
        return polygonData.features.filter(
          (f) =>
            f.properties.level === "district" &&
            f.properties.st_nm === properties.st_nm
        );
      } else if (level === "sub-district") {
        return polygonData.features.filter(
          (f) =>
            f.properties.level === "sub-district" &&
            f.properties.district_name === properties.district_name
        );
      }
      return [];
    };

    const group = getAverageGroup(areaDetails.level, areaDetails);
    const metricSums: { [key: string]: number } = {};
    const count = group.length;

    group.forEach((feature) => {
      const areaMetrics =
        metricData[feature.properties.shapeID]?.[demographicKey];
      if (areaMetrics) {
        Object.keys(areaMetrics).forEach((key) => {
          metricSums[key] = (metricSums[key] || 0) + (areaMetrics[key] || 0);
        });
      }
    });

    const averages: { [key: string]: number } = {};
    Object.keys(metricSums).forEach((key) => {
      averages[key] = count > 0 ? metricSums[key] / count : 0;
    });

    if (selectedScheme === "PMMSY") {
      const metrics = metricData[areaDetails.id]?.[demographicKey] || {
        totalProjects: 0,
        totalInvestment: 0,
        fishOutput: 0,
      };
      const totalEmploymentGenerated = Math.floor(
        metrics.totalProjects * (5 + Math.random() * 10)
      );
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
      const averageTotalEmploymentGenerated = Math.floor(
        averages.totalProjects * (5 + Math.random() * 10)
      );
      const pmmsyAverages: PMMSYAggregatedData = {
        totalProjects: averages.totalProjects || 0,
        totalInvestment: averages.totalInvestment || 0,
        fishOutput: averages.fishOutput || 0,
        totalEmploymentGenerated: averageTotalEmploymentGenerated,
        directEmploymentMen: Math.floor(averageTotalEmploymentGenerated * 0.4),
        directEmploymentWomen: Math.floor(
          averageTotalEmploymentGenerated * 0.3
        ),
        indirectEmploymentMen: Math.floor(
          averageTotalEmploymentGenerated * 0.2
        ),
        indirectEmploymentWomen: Math.floor(
          averageTotalEmploymentGenerated * 0.1
        ),
        projectsByStateUT: [],
        sectorDistribution: [],
      };
      setSelectedState(areaDetails.name || "Unknown Area");
      setDrilledAreaDetails({
        ...areaDetails,
        name: areaDetails.name || "Unknown Area",
        officer: officerNames[areaDetails.id] || "Unknown Officer",
        level: areaDetails.level || "Unknown",
        pmmsyMetrics,
        pmmsyAverages,
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
      setSelectedState(areaDetails.name || "Unknown Area");
      setDrilledAreaDetails({
        ...areaDetails,
        name: areaDetails.name || "Unknown Area",
        officer: officerNames[areaDetails.id] || "Unknown Officer",
        level: areaDetails.level || "Unknown",
        metrics,
        averages,
      });
    }
  };

  // Handle back to national view
  const handleBack = () => {
    setSelectedState(null);
    setMapView("state");
  };

  // Data for state category breakdown table
  const categoryBreakdownData = useMemo(() => {
    if (
      !selectedState ||
      !filteredGeoJsonData ||
      !combinedMetricData ||
      !mockNonPMMSYData ||
      !mockPMMSYData
    )
      return [];

    const districtFeatures = filteredGeoJsonData.features.filter(
      (f) => f.properties.level === "district"
    );

    const districtIds = districtFeatures.map((f) => f.properties.shapeID);

    let categories: string[] = [];
    let displayNames: Record<string, string> = {};
    let getDemographicKey: (key: string) => string;
    let dataSource: Record<string, AreaMetricData> | null = null;

    if (selectedScheme === "PMMSY") {
      dataSource = mockPMMSYData;
      if (selectedBarChartCategory === "gender") {
        categories = ["male", "female", "transgender"];
        displayNames = genderDisplayNames;
        getDemographicKey = (key) =>
          `PMMSY_${key}_${selectedFinancialYearPMMSY}_${selectedSectorPMMSY}`;
      } else if (selectedBarChartCategory === "year") {
        categories = ["2021", "2022", "2023", "2024"];
        displayNames = yearDisplayNames;
        getDemographicKey = (key) =>
          `PMMSY_${selectedGender}_${key}_${selectedSectorPMMSY}`;
      } else {
        // scheme (sectors for PMMSY)
        categories = ["Inland", "Marine"];
        displayNames = { Inland: "Inland", Marine: "Marine" };
        getDemographicKey = (key) =>
          `PMMSY_${selectedGender}_${selectedFinancialYearPMMSY}_${key}`;
      }
    } else {
      dataSource = mockNonPMMSYData;
      if (selectedBarChartCategory === "gender") {
        categories = ["male", "female", "transgender"];
        displayNames = genderDisplayNames;
        getDemographicKey = (key) => `${selectedScheme}_${key}_${selectedYear}`;
      } else if (selectedBarChartCategory === "year") {
        categories = ["2021", "2022", "2023", "2024"];
        displayNames = yearDisplayNames;
        getDemographicKey = (key) =>
          `${selectedScheme}_${selectedGender}_${key}`;
      } else {
        // scheme
        categories = ["PMMKSS", "KCC", "NFDP"];
        displayNames = schemeDisplayNames;
        getDemographicKey = (key) => `${key}_${selectedGender}_${selectedYear}`;
      }
    }

    if (!dataSource) return [];

    const totals: Record<string, number> = {};

    categories.forEach((cat) => {
      const fullKey = getDemographicKey(cat);
      let total = 0;
      districtIds.forEach((id) => {
        total +=
          dataSource?.[id]?.[fullKey]?.[selectedMetric as keyof MetricValues] ||
          0;
      });
      totals[cat] = total;
    });

    return categories.map((cat) => ({
      category: displayNames[cat] || cat,
      value: totals[cat],
    }));
  }, [
    selectedState,
    filteredGeoJsonData,
    combinedMetricData,
    mockNonPMMSYData,
    mockPMMSYData,
    selectedScheme,
    selectedBarChartCategory,
    selectedGender,
    selectedYear,
    selectedSectorPMMSY,
    selectedFinancialYearPMMSY,
    selectedMetric,
  ]);

  // Scheme Selection View
  const SchemeSelectionView = () => {
    if (!schemeTotals) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div>Loading scheme data...</div>
        </div>
      );
    }

    const schemes: SchemeKey[] = ["PMMKSS", "PMMSY", "KCC", "NFDP"];

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-4xl w-full px-4">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            Select a Scheme
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schemes.map((scheme) => (
              <div
                key={scheme}
                className="backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl transition-transform hover:scale-105"
                onClick={() => setSelectedScheme(scheme)}
                style={{ backgroundColor: categoryColors[scheme] }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {schemeDisplayNames[scheme]}
                    </h2>
                    {scheme === "PMMSY" ? (
                      <>
                        <p className="text-2xl font-bold text-white mt-2">
                          {formatMetricValue(
                            "totalInvestment",
                            globalPMMSYMetrics.totalInvestment
                          )}
                        </p>
                        <p className="text-sm text-white/80 mt-1">
                          Total Investment
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-white mt-2">
                          {formatMetricValue(
                            "funds",
                            schemeTotals[scheme] / 10
                          )}
                        </p>
                        <p className="text-sm text-white/80 mt-1">
                          Total Funds Allocated
                        </p>
                      </>
                    )}
                  </div>

                  <div className="p-3 bg-white/20 rounded-xl">
                    {schemeIcons[scheme]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Loading and error states
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-red-500">
          <h2 className="text-xl font-bold text-red-600 mb-2">
            Error Loading Dashboard
          </h2>
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
            <p className="text-lg font-medium text-gray-900">
              Loading dashboard...
            </p>
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
              {selectedScheme && (
                <button
                  onClick={() => setSelectedScheme(null)}
                  className="ml-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded-full text-sm"
                >
                  Back to Schemes
                </button>
              )}
            </div>
            {selectedScheme && (
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-x-2">
                <label
                  htmlFor="metric-select"
                  className="font-semibold text-xs sm:text-sm"
                >
                  Metric
                </label>
                <select
                  id="metric-select"
                  value={selectedMetric}
                  onChange={(e) =>
                    setSelectedMetric(
                      e.target.value as
                        | "beneficiaries"
                        | "funds"
                        | "registrations"
                        | PMMSYMetricKey
                    )
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
            )}
            {selectedScheme && (
              <div className="flex items-center gap-x-2">
                <button
                  onClick={() => {
                    setMapView("state");
                    setSelectedState(null);
                  }}
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
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto px-2 py-2">
        {selectedScheme === null ? (
          <SchemeSelectionView />
        ) : (
          <>
            {/* Filters and KPIs */}
            <FiltersAndKPIs
              selectedMetric={selectedMetric}
              setSelectedMetric={setSelectedMetric}
              selectedScheme={selectedScheme}
              selectedGender={selectedGender}
              setSelectedGender={setSelectedGender}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              selectedSectorPMMSY={selectedSectorPMMSY}
              setSelectedSectorPMMSY={setSelectedSectorPMMSY}
              selectedFinancialYearPMMSY={selectedFinancialYearPMMSY}
              setSelectedFinancialYearPMMSY={setSelectedFinancialYearPMMSY}
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
                {selectedState ? (
                  <div className="p-2 space-y-2">
                    <div className="relative flex justify-center items-center w-full">
                      <button
                        onClick={handleBack}
                        className="absolute left-0 top--5 m-4 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition transform duration-200 ease-in-out flex items-center justify-center"
                      >
                        <Undo2 className="h-5 w-5" />
                        <span className="sr-only">Back to National View</span>
                      </button>
                      <h2 className="text-6xl font-bold text-gray-600 bg-clip-text ">
                        {drilledAreaDetails.name}
                      </h2>
                    </div>
                    {drilledAreaDetails && (
                      <div className="flex gap-2">
                        {/* Left side: Data */}
                        <div className="flex-1 bg-white p-2 rounded-2xl shadow-lg border border-gray-100">
                          {selectedScheme === "PMMSY" ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {[
                                {
                                  label: "Total Projects",
                                  value:
                                    drilledAreaDetails.pmmsyMetrics
                                      .totalProjects,
                                  key: "totalProjects",
                                },
                                {
                                  label: "Total Investment",
                                  value:
                                    drilledAreaDetails.pmmsyMetrics
                                      .totalInvestment,
                                  key: "totalInvestment",
                                },
                                {
                                  label: "Fish Output",
                                  value:
                                    drilledAreaDetails.pmmsyMetrics.fishOutput,
                                  key: "fishOutput",
                                },
                                {
                                  label: "Total Employment Generated",
                                  value:
                                    drilledAreaDetails.pmmsyMetrics
                                      .totalEmploymentGenerated,
                                  key: "totalProjects",
                                },
                                {
                                  label: "Direct Employment (Men)",
                                  value:
                                    drilledAreaDetails.pmmsyMetrics
                                      .directEmploymentMen,
                                  key: "totalProjects",
                                },
                                {
                                  label: "Direct Employment (Women)",
                                  value:
                                    drilledAreaDetails.pmmsyMetrics
                                      .directEmploymentWomen,
                                  key: "totalProjects",
                                },
                                {
                                  label: "Indirect Employment (Men)",
                                  value:
                                    drilledAreaDetails.pmmsyMetrics
                                      .indirectEmploymentMen,
                                  key: "totalProjects",
                                },
                                {
                                  label: "Indirect Employment (Women)",
                                  value:
                                    drilledAreaDetails.pmmsyMetrics
                                      .indirectEmploymentWomen,
                                  key: "totalProjects",
                                },
                              ].map((item, idx) => (
                                <div
                                  key={idx}
                                  className="bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-xl p-4 shadow-sm hover:shadow-md transition"
                                >
                                  <p className="text-sm font-medium text-gray-600">
                                    {item.label}
                                  </p>
                                  <p className="mt-1 text-lg font-semibold text-gray-900">
                                    {formatMetricValue(item.key, item.value)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                              {[
                                {
                                  label: "Total Funds Allocated",
                                  value: drilledAreaDetails.metrics.funds,
                                  key: "funds",
                                },
                                {
                                  label: "Funds Utilized",
                                  value: drilledAreaDetails.metrics.funds_used,
                                  key: "funds_used",
                                },
                                {
                                  label: "Total Beneficiaries",
                                  value:
                                    drilledAreaDetails.metrics.beneficiaries,
                                  key: "beneficiaries",
                                },
                                {
                                  label: "New Beneficiaries (Last 24h)",
                                  value:
                                    drilledAreaDetails.metrics
                                      .beneficiaries_last_24h,
                                  key: "beneficiaries_last_24h",
                                },
                                {
                                  label: "Total Registrations",
                                  value:
                                    drilledAreaDetails.metrics.registrations,
                                  key: "registrations",
                                },
                                {
                                  label: "New Registrations (Last 24h)",
                                  value:
                                    drilledAreaDetails.metrics
                                      .registrations_last_24h,
                                  key: "registrations_last_24h",
                                },
                              ].map((item, idx) => (
                                <div
                                  key={idx}
                                  className="bg-gradient-to-tr from-green-50 to-emerald-50 rounded-xl p-4 shadow-sm hover:shadow-md transition"
                                >
                                  <p className="text-sm font-medium text-gray-600">
                                    {item.label}
                                  </p>
                                  <p className="mt-1 text-lg font-semibold text-gray-900">
                                    {formatMetricValue(item.key, item.value)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Right side: Bihar Map if Bihar selected */}
                        {selectedState === "Bihār" && biharGeoJson && (
                          <div className="flex-1 bg-white shadow rounded-lg">
                            <OpenLayersMap
                              geoJsonData={
                                selectedState === "Bihār" && biharGeoJson
                                  ? biharGeoJson
                                  : filteredGeoJsonData
                              }
                              metricData={metricData}
                              selectedMetric={selectedMetric}
                              demographicKey={demographicKey}
                              getColor={getColor}
                              formatMetricValue={formatMetricValue}
                              getFullMetricName={getFullMetricName}
                              officerNames={officerNames}
                              onAreaClick={handleAreaClick}
                              onDrillDown={handleDrillDown}
                              mapView={
                                selectedState === "Bihār" ? "district" : mapView
                              }
                              isDrilledDown={!!selectedState}
                              center={[85.5, 25.5]} // longitude, latitude (center of Bihar)
                              zoom={12}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {selectedState === "Bihār" && biharGeoJson && (
                      <div>
                        <BiharFullTable
                          biharGeoJson={biharGeoJson}
                          metricData={metricData}
                          demographicKey={demographicKey}
                          formatMetricValue={formatMetricValue}
                        />
                      </div>
                    )}
                  </div>
                ) : (
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
                    onDrillDown={handleDrillDown}
                    mapView={mapView}
                    isDrilledDown={!!selectedState}
                  />
                )}
                {!selectedState && (
                  <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded-lg shadow-md border border-gray-200">
                    <h4 className="text-sm font-semibold mb-2 text-gray-800">
                      {getMetricDisplayName(selectedMetric)} Legend
                    </h4>
                    <div className="space-y-1">
                      {brackets[selectedMetric].map((bracket, index) => (
                        <div key={index} className="flex items-center">
                          <div
                            className="w-4 h-4 mr-2 rounded-sm"
                            style={{ backgroundColor: bracket.color }}
                          ></div>
                          <span className="text-xs text-gray-700">
                            {bracket.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div
                className={`${
                  selectedAreaDetails ? "col-span-2" : "col-span-2"
                } space-y-2 ${
                  selectedAreaDetails ? "block" : "hidden"
                } lg:block`}
              >
                {selectedScheme === "PMMSY" ? (
                  <>
                    <div className="flex flex-row gap-2">
                      <div className="flex-1">
                        <SectorDistributionPieChart
                          sectorDistribution={
                            globalPMMSYMetrics.sectorDistribution
                          }
                          getColor={getColor}
                        />
                      </div>
                      <div className="flex-1">
                        <EmploymentBarChart
                          employmentData={{
                            directEmploymentMen:
                              globalPMMSYMetrics.directEmploymentMen,
                            directEmploymentWomen:
                              globalPMMSYMetrics.directEmploymentWomen,
                            indirectEmploymentMen:
                              globalPMMSYMetrics.indirectEmploymentMen,
                            indirectEmploymentWomen:
                              globalPMMSYMetrics.indirectEmploymentWomen,
                          }}
                          getColor={getColor}
                        />
                      </div>
                    </div>
                    <TopAreasBarChart
                      barChartData={pmmsyBarData.data}
                      barChartKeys={pmmsyBarData.keys}
                      barChartDisplayNamesMap={pmmsyBarData.displayNamesMap}
                      selectedMetric={selectedMetric}
                      getColor={getColor}
                      formatMetricValue={formatMetricValue}
                      mapView={mapView}
                      selectedBarChartCategory={selectedBarChartCategory}
                      setSelectedBarChartCategory={setSelectedBarChartCategory}
                      selectedScheme={selectedScheme}
                    />
                  </>
                ) : (
                  <>
                    <DistributionPieChart
                      pieData={pieData}
                      selectedMetric={selectedMetric}
                    />
                    <TopAreasBarChart
                      barChartData={barChartData}
                      barChartKeys={barChartKeys}
                      barChartDisplayNamesMap={barChartDisplayNamesMap}
                      selectedMetric={selectedMetric}
                      getColor={getColor}
                      formatMetricValue={formatMetricValue}
                      mapView={mapView}
                      selectedBarChartCategory={selectedBarChartCategory}
                      setSelectedBarChartCategory={setSelectedBarChartCategory}
                      selectedScheme={selectedScheme}
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
          </>
        )}
      </main>

      <footer className="bg-white/80 backdrop-blur-md border-t border-white/20 mt-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-600">
            <p>
              © 2025 Department of Fisheries Dashboard. All rights reserved.
            </p>
            <p className="text-sm mt-2">
              Supporting sustainable fisheries development
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
