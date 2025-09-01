interface BiharFullTableProps {
  biharGeoJson: any;
  metricData: Record<string, AreaMetricData> | null;
  demographicKey: string;
  formatMetricValue: (metric: string, value: number) => string;
}

const BiharFullTable: React.FC<BiharFullTableProps> = ({
  biharGeoJson,
  metricData,
  demographicKey,
  formatMetricValue,
}) => {
  if (!biharGeoJson || !metricData) return null;

  // Collect all district rows
  const rows = biharGeoJson.features.map((f: any) => {
    const distId = f.properties.shapeID;
    const distName = f.properties.shapeName;
    const distMetrics = metricData[distId]?.[demographicKey] || {};

    return {
      id: distId,
      name: distName,
      projectName: f.properties.projectName || "N/A",
      startDate: f.properties.startDate || "N/A",
      endDate: f.properties.endDate || "N/A",
      ...distMetrics,
    };
  });

  // Extract all metric keys available
  const metricKeys = Object.keys(rows[0] || {}).filter(
    (k) =>
      k !== "id" &&
      k !== "name" &&
      k !== "projectName" &&
      k !== "startDate" &&
      k !== "endDate"
  );

  return (
    <div className="mt-2 bg-white rounded-lg shadow-lg p-4 py-0 overflow-x-auto overflow-y-scroll max-h-[300px]">
      <table className="min-w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 border">District</th>
            <th className="px-3 py-2 border">Project Name</th>
            <th className="px-3 py-2 border">Start Date</th>
            <th className="px-3 py-2 border">End Date</th>
            {metricKeys.map((key) => (
              <th key={key} className="px-3 py-2 border text-right">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 border font-medium">{row.name}</td>
              <td className="px-3 py-2 border">{row.projectName}</td>
              <td className="px-3 py-2 border">{row.startDate}</td>
              <td className="px-3 py-2 border">{row.endDate}</td>
              {metricKeys.map((key) => (
                <td key={key} className="px-3 py-2 border text-right">
                  {typeof row[key] === "number"
                    ? formatMetricValue(key, row[key])
                    : row[key] || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BiharFullTable;
