import React from "react";
import { EpisodeComposition } from "./video/engine/EpisodeComposition";
import { TestComposition } from "./video/engine/TestComposition";

export const WhatIfsRoot: React.FC = () => {
  return (
    <>
      <EpisodeComposition />
      <TestComposition />
    </>
  );
};
