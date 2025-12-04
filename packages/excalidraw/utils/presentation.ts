import type {
  ExcalidrawFrameLikeElement,
  NonDeleted,
} from "@excalidraw/element/types";
import type { Scene } from "@excalidraw/element/Scene";

/**
 * Get all frames in the order they appear in the scene
 * (based on their position in the elements array)
 */
export const getFramesInOrder = (
  scene: Scene,
): readonly NonDeleted<ExcalidrawFrameLikeElement>[] => {
  return scene.getNonDeletedFramesLikes();
};

/**
 * Get the next frame index, wrapping around if at the end
 */
export const getNextFrameIndex = (
  currentIndex: number,
  totalFrames: number,
): number => {
  if (totalFrames === 0) return 0;
  return (currentIndex + 1) % totalFrames;
};

/**
 * Get the previous frame index, wrapping around if at the beginning
 */
export const getPreviousFrameIndex = (
  currentIndex: number,
  totalFrames: number,
): number => {
  if (totalFrames === 0) return 0;
  return currentIndex === 0 ? totalFrames - 1 : currentIndex - 1;
};

