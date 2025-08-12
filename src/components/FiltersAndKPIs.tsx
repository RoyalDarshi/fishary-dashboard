import React from 'react';
import { IndianRupee, MapPin, TrendingUp, Users, CheckCircle } from "lucide-react";
import type { PMMSYAggregatedData, SchemeKey, GenderKey, YearKey } from '../App';

// Props interface for the FiltersAndKPIs component
interface FiltersAndKPIsProps {
  selectedMetric: "beneficiaries" | "funds" | "registrations";
  setSelectedMetric: (value: "beneficiaries" | "funds" | "registrations") => void;
  selectedScheme: SchemeKey;
  setSelectedScheme: (value: SchemeKey) => void;
  selectedGender: GenderKey;
  setSelectedGender: (value: GenderKey) => void;
  selectedYear: YearKey;
  setSelectedYear: (value: YearKey) => void;
  selectedSectorPMMSY: string;
  setSelectedSectorPMMSY: (value: string) => void;
  selectedFinancialYearPMMSY: string;
  setSelectedFinancialYearPMMSY: (value: string) => void;
  pmmsySectors: string[];
  pmmsyFinancialYears: string[];
  globalPMMSYMetrics: PMMSYAggregatedData;
  kpis: { average: number; min: number; max: number } | null;
  formatMetricValue: (metric: string, value: number) => string;
  getMetricIcon: (metric: string) => JSX.Element;
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

const FiltersAndKPIs: React.FC<FiltersAndKPIsProps> = ({
  selectedMetric,
  setSelectedMetric,
  selectedScheme,
  setSelectedScheme,
  selectedGender,
  setSelectedGender,
  selectedYear,
  setSelectedYear,
  selectedSectorPMMSY,
  setSelectedSectorPMMSY,
  selectedFinancialYearPMMSY,
  setSelectedFinancialYearPMMSY,
  pmmsySectors,
  pmmsyFinancialYears,
  globalPMMSYMetrics,
  kpis,
  formatMetricValue,
  getMetricIcon,
}) => {
  return (
    <>
      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 mb-2">
        <div
          className={`grid grid-cols-3 gap-4`}
        >
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
          {selectedScheme === "PMMSY" ? (
            <>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Sector
                </label>
                <select
                  value={selectedSectorPMMSY}
                  onChange={(e) => setSelectedSectorPMMSY(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  {pmmsySectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector === "all" ? "All Sectors" : sector}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Financial Year
                </label>
                <select
                  value={selectedFinancialYearPMMSY}
                  onChange={(e) => setSelectedFinancialYearPMMSY(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  {pmmsyFinancialYears.map((year) => (
                    <option key={year} value={year}>
                      {year === "all" ? "All Years" : year}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      {selectedScheme === "PMMSY" ? (
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 px-4 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <p className="text-xl font-medium text-gray-600">Total Projects</p>
                <p className="text-4xl font-bold text-blue-600">
                  {globalPMMSYMetrics.totalProjects.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 px-4 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <p className="text-xl font-medium text-gray-600">Total Investment</p>
                <p className="text-4xl font-bold text-green-600">
                  {formatMetricValue("funds", globalPMMSYMetrics.totalInvestment)}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                <IndianRupee className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 px-4 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <p className="text-xl font-medium text-gray-600">Fish Output (MT)</p>
                <p className="text-4xl font-bold text-purple-600">
                  {globalPMMSYMetrics.fishOutput.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 px-4 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <p className="text-xl font-medium text-gray-600">Employment Generated</p>
                <p className="text-4xl font-bold text-orange-600">
                  {globalPMMSYMetrics.totalEmploymentGenerated.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        kpis && (
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
        )
      )}
    </>
  );
};

export default FiltersAndKPIs;