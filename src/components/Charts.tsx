import React from "react";
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
import type { PMMSYAggregatedData, SchemeKey } from "../App";

// Props interface for SectorDistributionPieChart
interface SectorDistributionPieChartProps {
  sectorDistribution: PMMSYAggregatedData["sectorDistribution"];
  getColor: (metric: string, value: string) => string;
}

// Props interface for DistributionPieChart
interface DistributionPieChartProps {
  pieData: Array<{ name: string; value: number; color: string }>;
  selectedMetric: string;
}

// Props interface for TopAreasBarChart
interface TopAreasBarChartProps {
  barChartData: Array<Record<string, any>>;
  barChartKeys: string[];
  barChartDisplayNamesMap: Record<string, string>;
  selectedMetric: string;
  getColor: (metric: string, value: string) => string;
  formatMetricValue: (metric: string, value: number) => string;
  mapView: "state" | "district" | "sub-district";
  selectedBarChartCategory: "scheme" | "gender" | "year";
  setSelectedBarChartCategory: (category: "scheme" | "gender" | "year") => void;
  selectedScheme: SchemeKey;
}

// Props interface for EmploymentBarChart
interface EmploymentBarChartProps {
  employmentData: {
    directEmploymentMen: number;
    directEmploymentWomen: number;
    indirectEmploymentMen: number;
    indirectEmploymentWomen: number;
  };
  getColor: (metric: string, value: string) => string;
}

function getMetricDisplayName(metric: string): string {
    return {
      beneficiaries: "Beneficiaries",
      funds: "Funds Allocated",
      registrations: "Total Registrations",
      totalProjects: "Total Projects",
      totalInvestment: "Total Investment",
      fishOutput: "Fish Output",
    }[metric] || "Unknown Metric";
  }

// Sector Distribution Pie Chart for PMMSY
export const SectorDistributionPieChart: React.FC<SectorDistributionPieChartProps> = ({
  sectorDistribution,
  getColor,
}) => {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2">
      <h3 className="text-lg font-semibold text-gray-900 pl-4">Sector Distribution</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={sectorDistribution}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, value }) => `${name}: ${value}`}
          >
            {sectorDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor("sector", entry.name)} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Distribution Pie Chart for non-PMMSY data
export const DistributionPieChart: React.FC<DistributionPieChartProps> = ({ pieData,selectedMetric }) => {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-4">
      <h3 className="text-lg font-semibold text-gray-900 pl-4">Distribution Overview by {getMetricDisplayName(selectedMetric)}</h3>
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
  );
};

// Employment Bar Chart for PMMSY
export const EmploymentBarChart: React.FC<EmploymentBarChartProps> = ({ employmentData, getColor }) => {
  const data = [
    {
      name: "Direct Employment",
      Men: employmentData.directEmploymentMen,
      Women: employmentData.directEmploymentWomen,
    },
    {
      name: "Indirect Employment",
      Men: employmentData.indirectEmploymentMen,
      Women: employmentData.indirectEmploymentWomen,
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded p-2 shadow text-xs">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}</span>:
              <span className="font-medium">{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2">
      <h3 className="text-lg font-semibold text-gray-900 pl-4">Employment Generation</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          layout="horizontal"
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <YAxis
            type="number"
            tickFormatter={(value) => value.toLocaleString()}
            tick={{ fontSize: window.innerWidth < 640 ? 8 : 10 }}
          />
          <XAxis type="category" dataKey="name" tick={{ fontSize: window.innerWidth < 640 ? 8 : 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="Men" fill={getColor("gender", "male")} stackId="a" />
          <Bar dataKey="Women" fill={getColor("gender", "female")} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Top Areas Bar Chart for all data
export const TopAreasBarChart: React.FC<TopAreasBarChartProps> = ({
  barChartData,
  barChartKeys,
  barChartDisplayNamesMap,
  selectedMetric,
  getColor,
  formatMetricValue,
  mapView,
  selectedBarChartCategory,
  setSelectedBarChartCategory,
  selectedScheme,
}) => {
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded p-2 shadow text-xs">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => {
            const categoryKey = entry.dataKey;
            const displayName = barChartDisplayNamesMap[categoryKey] || categoryKey;
            return (
              <div key={`tooltip-${index}`} className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: getColor(selectedMetric, categoryKey) || "#ccc" }}
                />
                <span>{displayName}</span>:
                <span className="font-medium">{formatMetricValue(selectedMetric, entry.value)}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-4">
      <div className="flex justify-between items-center mb-4 pl-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Top 10{" "}
          {mapView === "state" ? "States" : mapView === "district" ? "Districts" : "Sub-Districts"}{" "}
          by {getMetricDisplayName(selectedMetric)}
        </h2>
        <select
          value={selectedBarChartCategory}
          onChange={(e) => setSelectedBarChartCategory(e.target.value as "scheme" | "gender" | "year")}
          className="p-1 bg-gray-50 border border-gray-300 rounded-md text-xs sm:text-sm"
        >
          <option value="scheme">{selectedScheme === "PMMSY" ? "Sector" : "Scheme"}</option>
          <option value="gender">Gender</option>
          <option value="year">Year</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 250 : 290}>
        <BarChart
          layout="horizontal"
          data={barChartData}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <YAxis
            type="number"
            tickFormatter={(value) => formatMetricValue(selectedMetric, value)}
            tick={{ fontSize: window.innerWidth < 640 ? 8 : 10 }}
          />
          <XAxis type="category" dataKey="name" tick={{ fontSize: window.innerWidth < 640 ? 8 : 10 }} />
          <Tooltip content={<CustomBarTooltip />} />
          {barChartKeys.map((key) => (
            <Bar key={key} dataKey={key} stackId="a">
              {barChartData.map((entry, index) => (
                <Cell key={`cell-${key}-${index}`} fill={getColor(selectedMetric, key)} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

};

// Production vs Fish Sale Chart
interface ProductionSaleChartProps {
  production: number;
  fishSale: number;
}

export const ProductionSaleChart: React.FC<ProductionSaleChartProps> = ({
  production,
  fishSale,
}) => {
  const data = [
    { name: "Production (MT/Year)", value: production },
    { name: "Fish Sale (MT/Year)", value: fishSale },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2">
      <h3 className="text-lg font-semibold text-gray-900 pl-4">
        Production & Fish Sale
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#10b981">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? "#3b82f6" : "#f97316"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface CentralShareChartProps {
  allocated: number;
  released: number;
}

export const CentralShareChart: React.FC<CentralShareChartProps> = ({
  allocated,
  released,
}) => {
  const data = [
    { name: "Central Share Allocated", value: allocated },
    { name: "Central Share Released", value: released },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-4">
      <h3 className="text-lg font-semibold text-gray-900 pl-4">
        Central Share (Allocated vs Released)
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#2563eb">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? "#3b82f6" : "#10b981"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
