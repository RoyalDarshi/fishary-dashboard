
import React, { useEffect, useRef, useState } from "react";
import { Map, View } from "ol";
import { Vector as VectorSource } from "ol/source";
import { Vector as VectorLayer } from "ol/layer";
import { GeoJSON } from "ol/format";
import { Style, Fill, Stroke } from "ol/style";
import { fromLonLat } from "ol/proj";
import { Overlay } from "ol"; // Import Overlay for tooltip
import { Zoom } from "ol/control";
import {
  defaults as defaultInteractions,
  MouseWheelZoom,
} from "ol/interaction";
import "ol/ol.css";
import "./OpenLayersMap.css"; // Import custom styles for the map and tooltip

interface OpenLayersMapProps {
  geoJsonData: any; // This will now contain filtered data based on mapView from App.tsx
  metricData: Record<string, any> | null;
  selectedMetric: string;
  demographicKey: string;
  getColor: (metric: string, value: number) => string;
  formatMetricValue: (metric: string, value: number) => string;
  getFullMetricName: () => string;
  officerNames: Record<string, string>;
  onAreaClick: (details: any | null) => void; // New prop for click handler
  onDrillDown: (stateName: string) => void;
  mapView: "state" | "sub-district" | "district"; // Updated prop to control map view
  isDrilledDown: boolean;
}

const OpenLayersMap: React.FC<OpenLayersMapProps> = ({
  geoJsonData,
  metricData,
  selectedMetric,
  demographicKey,
  getColor,
  formatMetricValue,
  getFullMetricName,
  officerNames,
  onAreaClick,
  onDrillDown,
  mapView, // Destructure the new mapView prop
  isDrilledDown,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [vectorSource, setVectorSource] = useState<VectorSource | null>(null);
  const [vectorLayer, setVectorLayer] = useState<VectorLayer | null>(null);
  const [tooltip, setTooltip] = useState<Overlay | null>(null); // State for tooltip overlay
  // Refs to store the latest prop/state values for use in event listeners
  const metricDataRef = useRef(metricData);
  const selectedMetricRef = useRef(selectedMetric);
  const demographicKeyRef = useRef(demographicKey);
  const mapViewRef = useRef(mapView);
  const formatMetricValueRef = useRef(formatMetricValue);
  const getFullMetricNameRef = useRef(getFullMetricName);
  const officerNamesRef = useRef(officerNames);
  const onAreaClickRef = useRef(onAreaClick);
  const onDrillDownRef = useRef(onDrillDown);

  // Update refs whenever the corresponding prop/state changes
  useEffect(() => {
    metricDataRef.current = metricData;
    selectedMetricRef.current = selectedMetric;
    demographicKeyRef.current = demographicKey;
    mapViewRef.current = mapView;
    formatMetricValueRef.current = formatMetricValue;
    getFullMetricNameRef.current = getFullMetricName;
    officerNamesRef.current = officerNames;
    onAreaClickRef.current = onAreaClick;
    onDrillDownRef.current = onDrillDown;
  }, [
    metricData,
    selectedMetric,
    demographicKey,
    mapView,
    formatMetricValue,
    getFullMetricName,
    officerNames,
    onAreaClick,
    onDrillDown,
  ]);

  // Initialize map and layers only once
  useEffect(() => {
    if (!mapRef.current) return;

    const vectorSrc = new VectorSource();
    setVectorSource(vectorSrc);

    const initialVectorLayer = new VectorLayer({
      source: vectorSrc,
    });
    setVectorLayer(initialVectorLayer);

    const newMap = new Map({
      target: mapRef.current,
      layers: [initialVectorLayer],
      view: new View({
        center: fromLonLat([78.9628, 23.5937]),
        zoom: 4.9,
        minZoom: 4.5,
        maxZoom: 18,
      }),
      controls: [
        new Zoom({
          className: "ol-zoom custom-zoom",
        }),
      ],
      interactions: defaultInteractions({
        mouseWheelZoom: false,
      }).extend([
        new MouseWheelZoom({
          duration: 400,
          timeout: 80,
          useAnchor: true,
          constrainResolution: false,
        }),
      ]),
    });

    // Create tooltip overlay element (runs once)
    const tooltipElement = document.createElement("div");
    tooltipElement.className = "ol-tooltip";
    tooltipElement.style.cssText = `
      position: absolute;
      background-color: rgba(31, 41, 55, 0.95);
      color: #F9FAFB;
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      pointer-events: none;
      z-index: 1000;
      max-width: 350px;
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
      line-height: 1.6;
      border: 1px solid rgba(255, 255, 255, 0.15);
      white-space: nowrap;
    `;

    // Create tooltip overlay (runs once)
    const tooltipOverlay = new Overlay({
      element: tooltipElement,
      offset: [10, 10],
      positioning: "bottom-left",
    });
    newMap.addOverlay(tooltipOverlay);
    setTooltip(tooltipOverlay);

    // Add hover functionality (tooltip) - uses refs for dynamic data
    newMap.on("pointermove", (evt) => {
      const features = newMap.getFeaturesAtPixel(evt.pixel);
      let featureToShowTooltip = null;

      const currentMapView = mapViewRef.current; // Use ref
      if (features && features.length > 0) {
        // Prioritize features based on current view
        if (currentMapView === "sub-district") {
          featureToShowTooltip = features.find(
            (f) => f.getProperties().level === "sub-district"
          );
        } else if (currentMapView === "district") {
          // Added district tooltip logic
          featureToShowTooltip = features.find(
            (f) => f.getProperties().level === "district"
          );
        }
        // If not found or in state view, find the first relevant state feature
        if (!featureToShowTooltip && currentMapView === "state") {
          featureToShowTooltip = features.find(
            (f) => f.getProperties().level === "state"
          );
        }
      }

      if (
        featureToShowTooltip &&
        featureToShowTooltip.getGeometry()?.getType() !== "Point"
      ) {
        const properties = featureToShowTooltip.getProperties();
        const id = properties.shapeID;
        const name = properties.shapeName || "Unknown Area";
        const level = properties.level;

        const value =
          metricDataRef.current?.[id]?.[demographicKeyRef.current]?.[
            selectedMetricRef.current
          ] || 0; // Use refs
        const formattedValue = formatMetricValueRef.current(
          selectedMetricRef.current,
          value
        ); // Use refs
        const fullMetricName = getFullMetricNameRef.current(); // Use ref
        const officer = officerNamesRef.current[id] || "N/A"; // Use ref

        tooltipElement.innerHTML = `
          <strong>Area:</strong> ${name} &nbsp; <br/>
          <strong>Type:</strong> ${
            level === "state"
              ? "State"
              : level === "district"
              ? "District"
              : "Sub-District"
          }<br/>
          ${
            level !== "state" // Show metric for district and sub-district
              ? `<strong>${fullMetricName}:</strong> ${formattedValue}<br/>`
              : ""
          }
          <strong>Officer:</strong> ${officer}
        `;
        tooltipOverlay.setPosition(evt.coordinate);
        tooltipElement.style.display = "block";
      } else {
        tooltipElement.style.display = "none";
      }
    });

    // Add click functionality for area details popup - uses refs for dynamic data
    newMap.on("click", (evt) => {
      const features = newMap.getFeaturesAtPixel(evt.pixel);
      let featureToClick = null;

      const currentMapView = mapViewRef.current; // Use ref
      if (features && features.length > 0) {
        // Prioritize features based on current view for click
        if (currentMapView === "sub-district") {
          featureToClick = features.find(
            (f) => f.getProperties().level === "sub-district"
          );
        } else if (currentMapView === "district") {
          // Added district click logic
          featureToClick = features.find(
            (f) => f.getProperties().level === "district"
          );
        }
        // If not found or in state view, find the first relevant state feature
        if (!featureToClick && currentMapView === "state") {
          featureToClick = features.find(
            (f) => f.getProperties().level === "state"
          );
        }
      }

      if (
        featureToClick &&
        featureToClick.getGeometry()?.getType() !== "Point"
      ) {
        const properties = featureToClick.getProperties();
        const id = properties.shapeID;
        const name = properties.shapeName || "Unknown Area";
        const level = properties.level;

        const currentMetricData = metricDataRef.current; // Use ref
        const currentDemographicKey = demographicKeyRef.current; // Use ref
        const currentOfficerNames = officerNamesRef.current; // Use ref
        const currentOnAreaClick = onAreaClickRef.current; // Use ref

        if (
          (currentMapView === "state" && level === "state") ||
          (currentMapView === "district" && level === "district") || // Added district condition
          (currentMapView === "sub-district" && level === "sub-district")
        ) {
          const areaAllMetrics =
            currentMetricData?.[id]?.[currentDemographicKey];

          const details = {
            id,
            name,
            officer: currentOfficerNames[id] || "N/A",
            metrics: areaAllMetrics,
            level: level, // Pass level to details
            st_nm: properties.st_nm,
            district_name: properties.district_name,
          };
          currentOnAreaClick(details);
          // Hide tooltip when popup is active
          if (tooltipElement) {
            tooltipElement.style.display = "none";
          }
        } else {
          currentOnAreaClick(null); // Close the popup if a non-relevant feature is clicked
        }
      } else {
        onAreaClickRef.current(null); // Close the popup if no feature is clicked
      }
    });

    // Add double-click for drill-down
    newMap.on("dblclick", (evt) => {
      const features = newMap.getFeaturesAtPixel(evt.pixel);
      let featureToDrill = null;

      if (features && features.length > 0) {
        featureToDrill = features.find((f) => f.getProperties().level === "state");
      }

      if (featureToDrill) {
        const properties = featureToDrill.getProperties();
        const level = properties.level;
        if (level === "state") {
          const stateName = properties.shapeName;
          onDrillDownRef.current(stateName);
        }
      }
    });

    setMap(newMap);

    // Cleanup function for map
    return () => {
      newMap.setTarget(undefined);
    };
  }, []); // Empty dependency array: this effect runs only once on mount

  // Update map data (features) when geoJsonData changes
  useEffect(() => {
    if (!map || !vectorSource || !geoJsonData) return;

    // Clear existing features
    vectorSource.clear();

    // Parse GeoJSON data
    const format = new GeoJSON({
      featureProjection: "EPSG:3857",
    });

    // geoJsonData is already filtered by App.tsx, so we just read all features from it.
    const features = format.readFeatures(geoJsonData);
    vectorSource.addFeatures(features);

    // Fit to extent if drilled down or returning to state view
    if (vectorSource.getFeatures().length > 0) {
      const extent = vectorSource.getExtent();
      if (isDrilledDown || mapView === "state") {
        map.getView().fit(extent, {
          duration: 500,
          padding: [100, 100, 100, 100],
        });
      }
    }

    // Refresh the map size (important if container container changes)
    map.updateSize();
  }, [map, vectorSource, geoJsonData, isDrilledDown, mapView]); // geoJsonData is a dependency to update features

  // Update vector layer style when selectedMetric, demographicKey, metricData, getColor, or mapView changes
  useEffect(() => {
    if (!vectorLayer || !metricData) return;

    vectorLayer.setStyle((feature) => {
      const properties = feature.getProperties();
      // Use 'shapeID' from the GeoJSON properties
      const id = properties.shapeID;
      const level = properties.level; // Get the level property
      const value = metricData?.[id]?.[demographicKey]?.[selectedMetric] || 0;
      const fillColor = getColor(selectedMetric, value);

      if (mapView === "state") {
        if (level === "state") {
          return new Style({
            fill: new Fill({
              color: fillColor,
            }),
            stroke: new Stroke({
              color: "#17202a", // Default stroke for states
              width: 0.5,
            }),
          });
        } else {
          // Hide non-state features in state view
          return null; // Don't render this feature
        }
      } else if (mapView === "district") {
        // Added styling for district view
        if (level === "district") {
          return new Style({
            fill: new Fill({
              color: fillColor,
            }),
            stroke: new Stroke({
              color: "#fcf3cf", // District border color
              width: 0.7, // District border width
            }),
            zIndex: 1, // Districts below state borders
          });
        } else if (level === "state") {
          // Style state borders: no fill, thicker stroke
          return new Style({
            fill: new Fill({
              color: "rgba(0,0,0,0)", // Transparent fill
            }),
            stroke: new Stroke({
              color: "#17202a", // Darker, prominent state border color
              width: 1, // Thicker state border width
            }),
            zIndex: 2, // State borders on top
          });
        }
      } else {
        // 'sub-district' view
        if (level === "sub-district") {
          return new Style({
            fill: new Fill({
              color: fillColor,
            }),
            stroke: new Stroke({
              color: "#fcf3cf", // Sub-district border color
              width: 0.5, // Sub-district border width
            }),
            zIndex: 1, // Sub-districts below state borders
          });
        } else if (level === "district") {
          // Added district boundary in sub-district view
          return new Style({
            fill: new Fill({
              color: "rgba(0,0,0,0)", // Transparent fill
            }),
            stroke: new Stroke({
              color: "#273746", // District border color
              width: 1, // Thicker district border width
            }),
            zIndex: 1.5, // District borders between sub-districts and states
          });
        } else if (level === "state") {
          // Style state borders: no fill, thicker stroke
          return new Style({
            fill: new Fill({
              color: "rgba(0,0,0,0)", // Transparent fill
            }),
            stroke: new Stroke({
              color: "#17202a", // Darker, prominent state border color
              width: 2, // Thicker state border width
            }),
            zIndex: 2, // State borders on top
          });
        }
      }
      return null; // Fallback, should not be reached for valid features
    });
  }, [
    vectorLayer,
    metricData,
    selectedMetric,
    demographicKey,
    getColor,
    mapView,
  ]); // Add mapView to dependencies

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "200px",
      }}
    />
  );
};

export default OpenLayersMap;