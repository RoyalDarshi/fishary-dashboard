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
      activityName: f.properties.activityName || "N/A",
      subActivityName: f.properties.subActivityName || "N/A",
      beneficiaryType: f.properties.beneficiaryTypes || "N/A",
      centralShare: f.properties.centralShare || 0,
      stateShare: f.properties.stateShare || 0,
      beneficiaryShare: f.properties.beneficiaryShare || 0,
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
      k !== "endDate" &&
      k !== "activityName" &&
      k !== "subActivityName" &&
      k !== "beneficiaryType" &&
      k !== "centralShare" &&
      k !== "stateShare" &&
      k !== "beneficiaryShare" &&
      k !== "totalProjects" &&
      k !== "totalInvestment" &&
      k !== "fishOutput" &&
      k !== "fishSale" &&
      k !== "centralShareAllocated" &&
      k !== "centralShareReleased"
  );

  return (
    <div className="mt-2 bg-white rounded-lg shadow-lg p-4 py-0 overflow-x-auto overflow-y-scroll max-h-[300px]">
      <table className="min-w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 border">District</th>
            <th className="px-3 py-2 border">Name of the Activity</th>
            <th className="px-3 py-2 border">Name of the Sub-Activity</th>
            <th className="px-3 py-2 border">Date of Commencement of Work</th>
            <th className="px-3 py-2 border">
              Expected Date of Project Completion
            </th>
            <th className="px-3 py-2 border">Type of Beneficiary</th>
            <th className="px-3 py-2 border text-right">Central Share</th>
            <th className="px-3 py-2 border text-right">State Share</th>
            <th className="px-3 py-2 border text-right">Beneficiary Share</th>
            <th className="px-3 py-2 border text-right">Total Projects</th>
            <th className="px-3 py-2 border text-right">Total Investment</th>
            <th className="px-3 py-2 border text-right">Fish Output</th>
            <th className="px-3 py-2 border text-right">Fish Sale</th>
            <th className="px-3 py-2 border text-right">
              Central Share Allocated
            </th>
            <th className="px-3 py-2 border text-right">
              Central Share Released
            </th>
            {metricKeys.map((key) => (
              <th key={key} className="px-3 py-2 border text-right">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(
            (row) => (
              console.log(row),
              (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border font-medium">{row.name}</td>
                  <td className="px-3 py-2 border">{row.activityName}</td>
                  <td className="px-3 py-2 border">{row.subActivityName}</td>
                  <td className="px-3 py-2 border">{row.startDate}</td>
                  <td className="px-3 py-2 border">{row.endDate}</td>
                  <td className="px-3 py-2 border">
                    {row.beneficiaryType[row.id % row.beneficiaryType.length]}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {formatMetricValue("funds", row.centralShare)}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {formatMetricValue("funds", row.stateShare)}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {formatMetricValue("funds", row.beneficiaryShare)}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {row.totalProjects || 0}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {row.totalInvestment
                      ? formatMetricValue(
                          "totalInvestment",
                          row.totalInvestment
                        )
                      : 0}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {row.fishOutput
                      ? formatMetricValue("fishOutput", row.fishOutput)
                      : 0}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {row.fishSale ? row.fishSale + " Tonnes" : 0}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {row.centralShareAllocated
                      ? formatMetricValue(
                          "centralInvestment",
                          row.centralShareAllocated
                        )
                      : 0}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {row.centralShareReleased
                      ? formatMetricValue(
                          "centralInvestment",
                          row.centralShareReleased
                        )
                      : 0}
                  </td>
                  {metricKeys.map((key) => (
                    <td key={key} className="px-3 py-2 border text-right">
                      {typeof row[key] === "number"
                        ? formatMetricValue(key, row[key])
                        : row[key] || "-"}
                    </td>
                  ))}
                </tr>
              )
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BiharFullTable;
