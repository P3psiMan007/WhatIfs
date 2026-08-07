import React, { createContext, useContext } from "react";
import type { ChannelStyleConfig } from "../types/style";
import { defaultChannelStyle } from "./channelStyle";

const StyleContext = createContext<ChannelStyleConfig>(defaultChannelStyle);

export const ChannelStyleProvider: React.FC<{
  style?: ChannelStyleConfig;
  children: React.ReactNode;
}> = ({ style, children }) => {
  return (
    <StyleContext.Provider value={style ?? defaultChannelStyle}>
      {children}
    </StyleContext.Provider>
  );
};

export const useChannelStyle = (): ChannelStyleConfig => useContext(StyleContext);
