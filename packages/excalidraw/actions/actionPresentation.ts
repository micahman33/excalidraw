import { KEYS } from "@excalidraw/common";
import { CaptureUpdateAction } from "@excalidraw/element";

import {
  getFramesInOrder,
  getNextFrameIndex,
  getPreviousFrameIndex,
} from "../utils/presentation";
import { t } from "../i18n";

import { register } from "./register";

import type { AppClassProperties, AppState } from "../types";

export const actionStartPresentation = register({
  name: "startPresentation",
  label: "labels.startPresentation",
  trackEvent: { category: "canvas" },
  predicate: (elements, appState, _, app) => {
    const frames = getFramesInOrder(app.scene);
    return frames.length > 0 && !appState.presentationMode.enabled;
  },
  perform: (elements, appState, _, app) => {
    const sceneFrames = getFramesInOrder(app.scene);
    if (sceneFrames.length === 0) {
      return {
        elements,
        appState,
        captureUpdate: CaptureUpdateAction.NEVER,
      };
    }

    // Use custom order if it exists and is valid, otherwise use scene order
    let frames = appState.presentationMode.frames;
    const sceneFrameIds = new Set(sceneFrames.map((f) => f.id));
    const prevFrameIds = new Set(frames.map((f) => f.id));

    if (frames.length === 0) {
      // No custom order, use scene order
      frames = [...sceneFrames];
    } else {
      // Preserve custom order when frames change
      const existingFrames = sceneFrames.filter((f) => prevFrameIds.has(f.id));
      const newFrames = sceneFrames.filter((f) => !prevFrameIds.has(f.id));

      if (existingFrames.length === 0 && newFrames.length > 0) {
        // All frames were replaced, use scene order
        frames = [...sceneFrames];
      } else {
        // Sort existing frames by custom order, then append new frames
        const customOrderMap = new Map(frames.map((f, idx) => [f.id, idx]));
        existingFrames.sort((a, b) => {
          const aOrder = customOrderMap.get(a.id) ?? Infinity;
          const bOrder = customOrderMap.get(b.id) ?? Infinity;
          return aOrder - bOrder;
        });

        frames = [...existingFrames, ...newFrames];
      }
    }

    // Navigate to first frame
    const firstFrame = frames[0];
    app.scrollToContent(firstFrame, {
      fitToViewport: true,
      viewportZoomFactor: 0.9,
      animate: true,
    });

    return {
      elements,
      appState: {
        ...appState,
        presentationMode: {
          enabled: true,
          currentFrameIndex: 0,
          frames,
        },
        openSidebar: null, // Close sidebar when starting presentation
        frameToHighlight: frames[0] || null, // Highlight the first frame
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    };
  },
});

export const actionStopPresentation = register({
  name: "stopPresentation",
  label: "labels.stopPresentation",
  trackEvent: { category: "canvas" },
  keyPriority: 100, // High priority to ensure it works even when other actions might match
  predicate: (elements, appState) => {
    return appState.presentationMode.enabled;
  },
  perform: (elements, appState) => {
    return {
      elements,
      appState: {
        ...appState,
        presentationMode: {
          enabled: false,
          currentFrameIndex: 0,
          frames: [],
        },
        openSidebar: null, // Close sidebar when exiting presentation
        frameToHighlight: null, // Clear frame highlight
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    };
  },
  keyTest: (event, appState) => {
    return event.key === KEYS.ESCAPE && appState.presentationMode.enabled;
  },
});

export const actionNextFrame = register({
  name: "nextFrame",
  label: "labels.nextFrame",
  trackEvent: { category: "canvas" },
  predicate: (elements, appState, _, app) => {
    return (
      appState.presentationMode.enabled &&
      appState.presentationMode.frames.length > 0
    );
  },
  perform: (elements, appState, _, app) => {
    const { currentFrameIndex, frames } = appState.presentationMode;
    if (frames.length === 0) {
      return { elements, appState, captureUpdate: CaptureUpdateAction.NEVER };
    }

    const nextIndex = getNextFrameIndex(currentFrameIndex, frames.length);
    const nextFrame = frames[nextIndex];

    app.scrollToContent(nextFrame, {
      fitToViewport: true,
      viewportZoomFactor: 0.9,
      animate: true,
    });

    return {
      elements,
      appState: {
        ...appState,
        presentationMode: {
          ...appState.presentationMode,
          currentFrameIndex: nextIndex,
        },
        frameToHighlight: nextFrame, // Highlight the new frame
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    };
  },
  keyTest: (event) => event.key === KEYS.ARROW_RIGHT,
});

export const actionPreviousFrame = register({
  name: "previousFrame",
  label: "labels.previousFrame",
  trackEvent: { category: "canvas" },
  predicate: (elements, appState, _, app) => {
    return (
      appState.presentationMode.enabled &&
      appState.presentationMode.frames.length > 0
    );
  },
  perform: (elements, appState, _, app) => {
    const { currentFrameIndex, frames } = appState.presentationMode;
    if (frames.length === 0) {
      return { elements, appState, captureUpdate: CaptureUpdateAction.NEVER };
    }

    const prevIndex = getPreviousFrameIndex(currentFrameIndex, frames.length);
    const prevFrame = frames[prevIndex];

    app.scrollToContent(prevFrame, {
      fitToViewport: true,
      viewportZoomFactor: 0.9,
      animate: true,
    });

    return {
      elements,
      appState: {
        ...appState,
        presentationMode: {
          ...appState.presentationMode,
          currentFrameIndex: prevIndex,
        },
        frameToHighlight: prevFrame, // Highlight the new frame
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    };
  },
  keyTest: (event) => event.key === KEYS.ARROW_LEFT,
});

export const actionReorderFrames = register({
  name: "reorderFrames",
  label: "labels.reorderFrames",
  trackEvent: { category: "canvas" },
  predicate: (elements, appState, _, app) => {
    const frames = getFramesInOrder(app.scene);
    return frames.length > 0;
  },
  perform: (elements, appState, value, app) => {
    // Get current frames - use presentationMode.frames if available and valid, otherwise get from scene
    const sceneFrames = getFramesInOrder(app.scene);
    let frames = appState.presentationMode.frames;

    // If no custom order exists or frames have changed, use scene order
    if (frames.length === 0 || frames.length !== sceneFrames.length) {
      frames = [...sceneFrames]; // Create a copy
    } else {
      // Validate that all frames in custom order still exist
      const sceneFrameIds = new Set(sceneFrames.map((f) => f.id));
      const allFramesExist = frames.every((f) => sceneFrameIds.has(f.id));
      if (!allFramesExist) {
        // Some frames were deleted, rebuild order keeping custom order where possible
        const customOrderMap = new Map(frames.map((f, idx) => [f.id, idx]));
        frames = [...sceneFrames].sort((a, b) => {
          const aOrder = customOrderMap.get(a.id) ?? Infinity;
          const bOrder = customOrderMap.get(b.id) ?? Infinity;
          return aOrder - bOrder;
        });
      } else {
        // All frames exist, preserve custom order - frames already in correct order
        frames = [...frames]; // Keep existing order
      }
    }

    if (frames.length === 0 || !value || typeof value !== "object") {
      return { elements, appState, captureUpdate: CaptureUpdateAction.NEVER };
    }

    const { fromIndex, toIndex } = value as {
      fromIndex: number;
      toIndex: number;
    };

    if (
      fromIndex < 0 ||
      fromIndex >= frames.length ||
      toIndex < 0 ||
      toIndex >= frames.length ||
      fromIndex === toIndex
    ) {
      return { elements, appState, captureUpdate: CaptureUpdateAction.NEVER };
    }

    // Create new frames array with reordered items
    const newFrames = [...frames];
    const [movedFrame] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, movedFrame);

    // Update currentFrameIndex if in presentation mode
    const { currentFrameIndex } = appState.presentationMode;
    let newCurrentFrameIndex = currentFrameIndex;
    if (appState.presentationMode.enabled) {
      if (currentFrameIndex === fromIndex) {
        newCurrentFrameIndex = toIndex;
      } else if (
        fromIndex < currentFrameIndex &&
        toIndex >= currentFrameIndex
      ) {
        newCurrentFrameIndex = currentFrameIndex - 1;
      } else if (
        fromIndex > currentFrameIndex &&
        toIndex <= currentFrameIndex
      ) {
        newCurrentFrameIndex = currentFrameIndex + 1;
      }
    }

    return {
      elements,
      appState: {
        ...appState,
        presentationMode: {
          ...appState.presentationMode,
          frames: newFrames,
          currentFrameIndex: newCurrentFrameIndex,
        },
      },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
});
