import React, { useEffect, useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  MapPin,
  Users,
  IndianRupee,
  TrendingUp,
  X,
  Wallet,
  Clock,
  CheckCircle,
  PlusCircle,
} from "lucide-react";
import OpenLayersMap from "./components/OpenLayerMap";

interface MetricValues {
  beneficiaries: number;
  funds: number;
  registrations: number;
  funds_used?: number;
  beneficiaries_last_24h?: number;
  registrations_last_24h?: number;
}

type SchemeKey = "all" | "PMMKSS" | "PMMSY" | "KCC" | "NFDP";
type GenderKey = "all" | "male" | "female" | "transgender";
type YearKey = "all" | "2021" | "2022" | "2023" | "2024";

interface AreaMetricData {
  [key: string]: MetricValues;
}

interface GeoJSONFeature {
  properties: {
    shapeID: string;
    shapeName: string;
    level: "state" | "district" | "sub-district";
  };
  geometry: { type: string };
}

interface GeoJSONData {
  type: string;
  features: GeoJSONFeature[];
}

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
  const [polygonData, setPolygonData] = useState<GeoJSONData | null>(null);
  const [metricData, setMetricData] = useState<Record<
    string,
    AreaMetricData
  > | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<
    "beneficiaries" | "funds" | "registrations"
  >("beneficiaries");
  const [selectedScheme, setSelectedScheme] = useState<SchemeKey>("all");
  const [selectedGender, setSelectedGender] = useState<GenderKey>("all");
  const [selectedYear, setSelectedYear] = useState<YearKey>("all");
  const [error, setError] = useState<string | null>(null);
  const [selectedAreaDetails, setSelectedAreaDetails] = useState<any | null>(
    null
  );
  const [selectedBarChartCategory, setSelectedBarChartCategory] = useState<
    "scheme" | "gender" | "year"
  >("scheme");
  const [mapView, setMapView] = useState<"state" | "district" | "sub-district">(
    "state"
  );

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

  const generateMockData = (
    areas: GeoJSONFeature[]
  ): Record<string, AreaMetricData> => {
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
        const dataMap = generateMockData(filteredFeatures);
        setMetricData(dataMap);
      })
      .catch((err) => {
        console.error("GeoJSON load error:", err);
        setError(err.message);
      });
  }, []);

  const filteredGeoJsonData = useMemo(() => {
    if (!polygonData) return null;
    const stateFeatures = polygonData.features.filter(
      (f) => f.properties.level === "state"
    );
    const districtFeatures = polygonData.features.filter(
      (f) => f.properties.level === "district"
    );
    const subDistrictFeatures = polygonData.features.filter(
      (f) => f.properties.level === "sub-district"
    );

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
        features: [
          ...subDistrictFeatures,
          ...districtFeatures,
          ...stateFeatures,
        ],
      };
    }
  }, [polygonData, mapView]);

  const demographicKey = useMemo(() => {
    return `${selectedScheme}_${selectedGender}_${selectedYear}`;
  }, [selectedScheme, selectedGender, selectedYear]);

  const formatNumber = (num: number): string => {
    if (num >= 10000000) {
      return (num / 10000000).toFixed(2) + " Cr";
    }
    if (num >= 100000) {
      return (num / 100000).toFixed(2) + " L";
    }
    return num.toLocaleString();
  };

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
    }
    return "#6b7280";
  };

  const formatMetricValue = (metric: string, value: number): string => {
    if (
      metric === "beneficiaries_last_24h" ||
      metric === "registrations_last_24h"
    )
      return value.toLocaleString();
    if (metric === "funds" || metric === "funds_used")
      return `₹${formatNumber(value)}`;
    return formatNumber(value);
  };

  const getMetricDisplayName = (metric: string): string => {
    if (metric === "beneficiaries") return "Beneficiaries";
    if (metric === "funds") return "Funds Allocated";
    if (metric === "registrations") return "Total Registrations";
    return "Unknown Metric";
  };

  const getMetricIcon = (metric: string) => {
    if (metric === "beneficiaries") return <Users className="w-5 h-5" />;
    if (metric === "funds") return <IndianRupee className="w-5 h-5" />;
    if (metric === "registrations") return <PlusCircle className="w-5 h-5" />;
    return <TrendingUp className="w-5 h-5" />;
  };

  const getFullMetricName = () => {
    const metricName = getMetricDisplayName(selectedMetric);
    const filters = [];
    if (selectedScheme !== "all")
      filters.push(schemeDisplayNames[selectedScheme]);
    if (selectedGender !== "all")
      filters.push(genderDisplayNames[selectedGender]);
    if (selectedYear !== "all") filters.push(yearDisplayNames[selectedYear]);
    const demographicName = filters.length > 0 ? filters.join(", ") : "Overall";
    return `${metricName} (${demographicName})`;
  };

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

  const overallMetricDataForSorting = useMemo(() => {
    if (!metricData || !polygonData) return {};
    const overallKey = `all_all_all`;
    const data: Record<string, number> = {};
    polygonData.features.forEach((feature) => {
      data[feature.properties.shapeID] =
        metricData[feature.properties.shapeID]?.[overallKey]?.[
          selectedMetric
        ] ?? 0;
    });
    return data;
  }, [metricData, polygonData, selectedMetric]);

  const barData = useMemo(() => {
    if (!metricData || !polygonData)
      return { data: [], keys: [], displayNamesMap: {} };

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
        keys = ["PMMKSS", "PMMSY", "KCC", "NFDP"];
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
    polygonData,
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

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded p-2 shadow text-xs">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => {
            const categoryKey = entry.dataKey;
            const displayName =
              barChartDisplayNamesMap[categoryKey] || categoryKey;
            return (
              <div key={`tooltip-${index}`} className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      getColor(selectedMetric, categoryKey) || "#ccc",
                  }}
                />
                <span>{displayName}</span>:
                <span className="font-medium">
                  {formatMetricValue(selectedMetric, entry.value)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

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
            </div>
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
                  )
                }
                className="p-1 bg-gray-50 border border-gray-300 rounded-md text-xs sm:text-sm"
              >
                <option value="beneficiaries">Beneficiaries</option>
                <option value="funds">Funds Allocated</option>
                <option value="registrations">Total Registrations</option>
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
        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 mb-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Scheme
              </label>
              <select
                value={selectedScheme}
                onChange={(e) => setSelectedScheme(e.target.value as SchemeKey)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {Object.entries(schemeDisplayNames).map(([key, display]) => (
                  <option key={key} value={key}>
                    {display}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Gender
              </label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value as GenderKey)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {Object.entries(genderDisplayNames).map(([key, display]) => (
                  <option key={key} value={key}>
                    {display}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value as YearKey)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {Object.entries(yearDisplayNames).map(([key, display]) => (
                  <option key={key} value={key}>
                    {display}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPIs */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 px-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 ml-8">
                  <p className="text-xl font-medium text-gray-600">Average</p>
                  <p className="text-4xl font-bold text-blue-600">
                    {formatMetricValue(selectedMetric, kpis.average)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl">
                  {getMetricIcon(selectedMetric)}
                </div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 px-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 ml-8">
                  <p className="text-xl font-medium text-gray-600">Minimum</p>
                  <p className="text-4xl font-bold text-green-600">
                    {formatMetricValue(selectedMetric, kpis.min)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-white transform rotate-180" />
                </div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 px-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 ml-8">
                  <p className="text-xl font-medium text-gray-600">Maximum</p>
                  <p className="text-4xl font-bold text-purple-600">
                    {formatMetricValue(selectedMetric, kpis.max)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

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
              onAreaClick={setSelectedAreaDetails}
              mapView={mapView}
            />
            {/* Legend */}
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
          </div>
          <div
            className={`${
              selectedAreaDetails ? "col-span-2" : "col-span-2"
            } space-y-2 ${selectedAreaDetails ? "block" : "hidden"} lg:block`}
          >
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-4">
              <h3 className="text-lg font-semibold text-gray-900 pl-4">
                Distribution Overview
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-4">
              <div className="flex justify-between items-center mb-4 pl-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Top 10{" "}
                  {mapView === "state"
                    ? "States"
                    : mapView === "district"
                    ? "Districts"
                    : "Sub-Districts"}{" "}
                  by {getMetricDisplayName(selectedMetric)}
                </h2>
                <select
                  value={selectedBarChartCategory}
                  onChange={(e) =>
                    setSelectedBarChartCategory(
                      e.target.value as "scheme" | "gender" | "year"
                    )
                  }
                  className="p-1 bg-gray-50 border border-gray-300 rounded-md text-xs sm:text-sm"
                >
                  <option value="scheme">Scheme</option>
                  <option value="gender">Gender</option>
                  <option value="year">Year</option>
                </select>
              </div>
              <BarChart
                layout="horizontal"
                width={selectedAreaDetails ? 350 : 700}
                height={window.innerWidth < 640 ? 250 : 290}
                data={barChartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <YAxis
                  type="number"
                  tickFormatter={(value) =>
                    formatMetricValue(selectedMetric, value)
                  }
                  tick={{ fontSize: window.innerWidth < 640 ? 8 : 10 }}
                />
                <XAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: window.innerWidth < 640 ? 8 : 10 }}
                />
                <Tooltip content={<CustomBarTooltip />} />
                {barChartKeys.map((key) => (
                  <Bar key={key} dataKey={key} stackId="a">
                    {barChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${key}-${index}`}
                        fill={getColor(selectedMetric, key)}
                      />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            </div>
          </div>
        </div>
      </main>

      {/* Area Details Popup */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white/95 backdrop-blur-lg shadow-2xl z-50 transform transition-transform duration-300 ${
          selectedAreaDetails ? "translate-x-0" : "translate-x-full"
        } flex flex-col p-2 px-4 border-l border-white/20 overflow-y-auto`}
      >
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-2xl font-bold text-gray-800">
            {selectedAreaDetails?.name || "Area Details"}
          </h2>
          <button
            onClick={() => setSelectedAreaDetails(null)}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {selectedAreaDetails && (
          <div className="space-y-2 text-gray-700">
            <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <strong className="font-semibold">Officer:</strong>{" "}
              <span className="font-medium">{selectedAreaDetails.officer}</span>
              <MapPin className="w-4 h-4 text-blue-600 ml-4" />
              <strong className="font-semibold">Region Type:</strong>{" "}
              <span className="font-medium">
                {selectedAreaDetails.level === "state"
                  ? "State"
                  : selectedAreaDetails.level === "district"
                  ? "District"
                  : "Sub-District"}
              </span>
            </div>
            <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Key Performance Indicators
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-full">
                      <IndianRupee className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Funds Allocated
                      </p>
                      <p className="text-xl font-bold text-gray-800">
                        {selectedAreaDetails.metrics
                          ? formatMetricValue(
                              "funds",
                              selectedAreaDetails.metrics.funds
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Wallet className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Funds Utilized
                      </p>
                      <p className="text-xl font-bold text-gray-800">
                        {selectedAreaDetails.metrics
                          ? formatMetricValue(
                              "funds_used",
                              selectedAreaDetails.metrics.funds_used
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-100 rounded-full">
                      <Users className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Beneficiaries
                      </p>
                      <p className="text-xl font-bold text-gray-800">
                        {selectedAreaDetails.metrics
                          ? formatMetricValue(
                              "beneficiaries",
                              selectedAreaDetails.metrics.beneficiaries
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-full">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        New Beneficiaries (Last 24h)
                      </p>
                      <p className="text-xl font-bold text-gray-800">
                        {selectedAreaDetails.metrics
                          ? formatMetricValue(
                              "beneficiaries_last_24h",
                              selectedAreaDetails.metrics.beneficiaries_last_24h
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <PlusCircle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Registrations
                      </p>
                      <p className="text-xl font-bold text-gray-800">
                        {selectedAreaDetails.metrics
                          ? formatMetricValue(
                              "registrations",
                              selectedAreaDetails.metrics.registrations
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <CheckCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        New Registrations (Last 24h)
                      </p>
                      <p className="text-xl font-bold text-gray-800">
                        {selectedAreaDetails.metrics
                          ? formatMetricValue(
                              "registrations_last_24h",
                              selectedAreaDetails.metrics.registrations_last_24h
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

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
