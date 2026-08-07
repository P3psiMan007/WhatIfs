/**
 * Pure logic for character pose calculations.
 * No React, no Remotion frame calls, deterministic.
 */

export type CharacterPoseType =
  | "standing"
  | "pointing"
  | "thinking"
  | "walking"
  | "sitting"
  | "arms-crossed"
  | "presenting";

export interface LimbTransform {
  leftArmDeg: number;
  rightArmDeg: number;
  leftLegDeg: number;
  rightLegDeg: number;
  headTiltDeg: number;
}

export const getLimbTransform = (pose: CharacterPoseType): LimbTransform => {
  switch (pose) {
    case "standing":
      return {
        leftArmDeg: -20,
        rightArmDeg: 20,
        leftLegDeg: -5,
        rightLegDeg: 5,
        headTiltDeg: 0,
      };

    case "pointing":
      return {
        leftArmDeg: -40,
        rightArmDeg: -60,
        leftLegDeg: 0,
        rightLegDeg: 0,
        headTiltDeg: 10,
      };

    case "thinking":
      return {
        leftArmDeg: -90,
        rightArmDeg: 45,
        leftLegDeg: -15,
        rightLegDeg: 0,
        headTiltDeg: 15,
      };

    case "walking":
      return {
        leftArmDeg: 25,
        rightArmDeg: -25,
        leftLegDeg: -30,
        rightLegDeg: 30,
        headTiltDeg: -5,
      };

    case "sitting":
      return {
        leftArmDeg: -45,
        rightArmDeg: -45,
        leftLegDeg: -90,
        rightLegDeg: -90,
        headTiltDeg: 0,
      };

    case "arms-crossed":
      return {
        leftArmDeg: 90,
        rightArmDeg: 90,
        leftLegDeg: 0,
        rightLegDeg: 0,
        headTiltDeg: 5,
      };

    case "presenting":
      return {
        leftArmDeg: -60,
        rightArmDeg: -60,
        leftLegDeg: 0,
        rightLegDeg: 5,
        headTiltDeg: -10,
      };

    default: {
      const _exhaustive: never = pose;
      return _exhaustive;
    }
  }
};
