import React from "react";
import { useChannelStyle } from "../style/StyleContext";

export type EnvironmentSetting =
  | "void"
  | "city"
  | "office"
  | "nature"
  | "space"
  | "abstract-graph"
  | "home";

export interface DoodleEnvironmentProps {
  setting: EnvironmentSetting;
  timeOfDay?: "day" | "night";
}

export const DoodleEnvironment: React.FC<DoodleEnvironmentProps> = ({
  setting,
  timeOfDay = "day",
}) => {
  const style = useChannelStyle();
  const bgColor = style.textureDefaults.paperColor;
  const lineColor = style.strokeColor;
  const accentColor = style.palette[2];

  const renderVoid = () => (
    <rect width="1920" height="1080" fill={bgColor} />
  );

  const renderCity = () => (
    <>
      <rect width="1920" height="1080" fill={bgColor} />

      {/* Skyline horizon line */}
      <line x1="0" y1="750" x2="1920" y2="750" stroke={lineColor} strokeWidth={8} />

      {/* Building 1 */}
      <rect
        x="200"
        y="600"
        width="200"
        height="150"
        fill="none"
        stroke={lineColor}
        strokeWidth={6}
      />
      {/* Windows */}
      <rect
        x="230"
        y="630"
        width="30"
        height="30"
        fill="none"
        stroke={lineColor}
        strokeWidth={4}
      />
      <rect
        x="280"
        y="630"
        width="30"
        height="30"
        fill="none"
        stroke={lineColor}
        strokeWidth={4}
      />

      {/* Building 2 */}
      <rect
        x="500"
        y="550"
        width="180"
        height="200"
        fill="none"
        stroke={lineColor}
        strokeWidth={6}
      />

      {/* Building 3 */}
      <rect
        x="1500"
        y="620"
        width="220"
        height="130"
        fill="none"
        stroke={lineColor}
        strokeWidth={6}
      />
    </>
  );

  const renderOffice = () => (
    <>
      <rect width="1920" height="1080" fill={bgColor} />

      {/* Desk line */}
      <line x1="300" y1="750" x2="1620" y2="750" stroke={lineColor} strokeWidth={8} />

      {/* Chair back */}
      <circle cx="960" cy="850" r="40" fill="none" stroke={lineColor} strokeWidth={6} />

      {/* Wall line */}
      <line x1="0" y1="300" x2="1920" y2="300" stroke={lineColor} strokeWidth={6} />

      {/* Divider */}
      <line x1="960" y1="300" x2="960" y2="1080" stroke={lineColor} strokeWidth={6} />
    </>
  );

  const renderNature = () => (
    <>
      <rect width="1920" height="1080" fill={bgColor} />

      {/* Horizon */}
      <line x1="0" y1="650" x2="1920" y2="650" stroke={lineColor} strokeWidth={8} />

      {/* Tree 1 */}
      <line x1="300" y1="650" x2="300" y2="450" stroke={lineColor} strokeWidth={10} />
      <circle
        cx="300"
        cy="380"
        r="80"
        fill="none"
        stroke={lineColor}
        strokeWidth={6}
      />

      {/* Tree 2 */}
      <line x1="1600" y1="650" x2="1600" y2="480" stroke={lineColor} strokeWidth={10} />
      <circle
        cx="1600"
        cy="400"
        r="70"
        fill="none"
        stroke={lineColor}
        strokeWidth={6}
      />

      {/* Simple cloud */}
      <path
        d="M 800 300 Q 850 250 900 300"
        fill="none"
        stroke={lineColor}
        strokeWidth={6}
        strokeLinecap="round"
      />
    </>
  );

  const renderSpace = () => (
    <>
      <rect
        width="1920"
        height="1080"
        fill={timeOfDay === "night" ? "#1a1a1a" : bgColor}
      />

      {/* Stars */}
      <circle cx="200" cy="150" r="6" fill={lineColor} />
      <circle cx="500" cy="200" r="5" fill={lineColor} />
      <circle cx="800" cy="100" r="4" fill={lineColor} />
      <circle cx="1200" cy="250" r="6" fill={lineColor} />
      <circle cx="1600" cy="120" r="5" fill={lineColor} />
      <circle cx="1800" cy="300" r="4" fill={lineColor} />

      {/* Horizon curve */}
      <path
        d="M 0 800 Q 960 700 1920 800"
        fill="none"
        stroke={accentColor}
        strokeWidth={8}
        strokeLinecap="round"
      />
    </>
  );

  const renderAbstractGraph = () => (
    <>
      <rect width="1920" height="1080" fill={bgColor} />

      {/* X axis */}
      <line x1="300" y1="800" x2="1700" y2="800" stroke={lineColor} strokeWidth={8} />

      {/* Y axis */}
      <line x1="300" y1="200" x2="300" y2="800" stroke={lineColor} strokeWidth={8} />

      {/* Grid lines */}
      <line x1="600" y1="200" x2="600" y2="800" stroke={lineColor} strokeWidth={3} />
      <line x1="900" y1="200" x2="900" y2="800" stroke={lineColor} strokeWidth={3} />
      <line x1="1200" y1="200" x2="1200" y2="800" stroke={lineColor} strokeWidth={3} />
      <line x1="1500" y1="200" x2="1500" y2="800" stroke={lineColor} strokeWidth={3} />

      {/* Plot line */}
      <polyline
        points="350,700 600,500 900,600 1200,350 1500,450 1650,250"
        fill="none"
        stroke={accentColor}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );

  const renderHome = () => (
    <>
      <rect width="1920" height="1080" fill={bgColor} />

      {/* Floor line */}
      <line x1="0" y1="800" x2="1920" y2="800" stroke={lineColor} strokeWidth={8} />

      {/* Couch */}
      <rect
        x="400"
        y="650"
        width="300"
        height="100"
        rx="20"
        fill="none"
        stroke={lineColor}
        strokeWidth={6}
      />

      {/* Window */}
      <rect
        x="1200"
        y="300"
        width="300"
        height="300"
        fill="none"
        stroke={lineColor}
        strokeWidth={8}
      />
      {/* Window panes */}
      <line x1="1350" y1="300" x2="1350" y2="600" stroke={lineColor} strokeWidth={6} />
      <line x1="1200" y1="450" x2="1500" y2="450" stroke={lineColor} strokeWidth={6} />

      {/* Door frame */}
      <rect
        x="150"
        y="600"
        width="120"
        height="200"
        fill="none"
        stroke={lineColor}
        strokeWidth={6}
      />
      {/* Door knob */}
      <circle cx="240" cy="700" r="8" fill={lineColor} />
    </>
  );

  const renderSetting = () => {
    switch (setting) {
      case "void":
        return renderVoid();
      case "city":
        return renderCity();
      case "office":
        return renderOffice();
      case "nature":
        return renderNature();
      case "space":
        return renderSpace();
      case "abstract-graph":
        return renderAbstractGraph();
      case "home":
        return renderHome();
      default: {
        const _exhaustive: never = setting;
        return _exhaustive;
      }
    }
  };

  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080">
      {renderSetting()}
    </svg>
  );
};
