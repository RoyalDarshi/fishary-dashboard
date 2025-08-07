import React from "react";
import {
  X,
  Users,
  MapPin,
  TrendingUp,
  IndianRupee,
  Wallet,
  Clock,
  CheckCircle,
  PlusCircle,
} from "lucide-react";
import type { PMMSYAggregatedData } from "../App"; // Assuming types are exported from App.tsx

interface AreaDetailsPopupProps {
  selectedAreaDetails: {
    name: string;
    officer: string;
    level: string;
    metrics?: {
      funds: number;
      funds_used: number;
      beneficiaries: number;
      beneficiaries_last_24h: number;
      registrations: number;
      registrations_last_24h: number;
    };
    pmmsyMetrics?: PMMSYAggregatedData;
  } | null;
  selectedScheme: string;
  formatMetricValue: (metric: string, value: number) => string;
  setSelectedAreaDetails: (details: any | null) => void;
}

const AreaDetailsPopup: React.FC<AreaDetailsPopupProps> = ({
  selectedAreaDetails,
  selectedScheme,
  formatMetricValue,
  setSelectedAreaDetails,
}) => {
  return (
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
        <>
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
          {selectedScheme === "PMMSY" && selectedAreaDetails.pmmsyMetrics ? (
            // PMMSY specific details
            <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                PMMSY Scheme Details
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Projects
                      </p>
                      <p className="text-xl font-bold text-gray-800">
                        {selectedAreaDetails.pmmsyMetrics.totalProjects.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <IndianRupee className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Investment
                      </p>
                      <p className="text-xl font-bold text-gray-800">
                        ₹
                        {formatMetricValue(
                          "funds",
                          selectedAreaDetails.pmmsyMetrics.totalInvestment
                        )}
                      </p>
                    </div>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Fish Output (MT)
                      </p>
                      <p className="text-xl font-bold text-gray-800">
                        {selectedAreaDetails.pmmsyMetrics.fishOutput.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <Users className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Employment Generated
                      </p>
                      <p className="text-xl font-bold text-gray-800">
                        {selectedAreaDetails.pmmsyMetrics.totalEmploymentGenerated.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </li>
              </ul>
              <h4 className="text-md font-semibold text-gray-800 mt-4">
                Employment Generation
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">
                    Direct (Women)
                  </p>
                  <p className="text-lg font-bold text-gray-800">
                    {selectedAreaDetails.pmmsyMetrics.directEmploymentWomen.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">
                    Direct (Men)
                  </p>
                  <p className="text-lg font-bold text-gray-800">
                    {selectedAreaDetails.pmmsyMetrics.directEmploymentMen.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">
                    Indirect (Women)
                  </p>
                  <p className="text-lg font-bold text-gray-800">
                    {selectedAreaDetails.pmmsyMetrics.indirectEmploymentWomen.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">
                    Indirect (Men)
                  </p>
                  <p className="text-lg font-bold text-gray-800">
                    {selectedAreaDetails.pmmsyMetrics.indirectEmploymentMen.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Generic metrics display
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
          )}
        </>
      )}
    </div>
  );
};

export default AreaDetailsPopup;
