import { KEYS } from "@excalidraw/common";
import { CaptureUpdateAction } from "@excalidraw/element";
import { register } from "./register";
import {
  getFramesInOrder,
  getNextFrameIndex,
  getPreviousFrameIndex,
} from "../utils/presentation";
import { t } from "../i18n";
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
    const frames = getFramesInOrder(app.scene);
    if (frames.length === 0) {
      return {
        elements,
        appState,
        captureUpdate: CaptureUpdateAction.NEVER,
      };
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
  keyTest: (event) =>
    event.key === KEYS.ARROW_RIGHT ||
    (event.key === KEYS.SPACE && !event.shiftKey),
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
  keyTest: (event) =>
    event.key === KEYS.ARROW_LEFT ||
    (event.key === KEYS.SPACE && event.shiftKey),
});

