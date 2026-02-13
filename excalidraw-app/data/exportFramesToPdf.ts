import { jsPDF } from "jspdf";
import { exportToCanvas } from "@excalidraw/utils/export";
import { getFramesInOrder } from "@excalidraw/excalidraw/utils/presentation";
import { getElementsOverlappingFrame } from "@excalidraw/element";

import type {
  ExcalidrawElement,
  ExcalidrawFrameLikeElement,
  NonDeleted,
} from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { Scene } from "@excalidraw/element/Scene";

/**
 * Export presentation frames to a PDF file, one frame per page
 */
export const exportFramesToPDF = async ({
  scene,
  elements,
  appState,
  files,
  canvasName,
}: {
  scene: Scene;
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
  canvasName?: string;
}): Promise<Blob | null> => {
  // Get all frames in order
  const frames = getFramesInOrder(scene) as readonly NonDeleted<ExcalidrawFrameLikeElement>[];

  if (frames.length === 0) {
    alert("No presentation frames found on the canvas.");
    return null;
  }

  // Create PDF with first frame's dimensions
  const firstFrame = frames[0];
  const orientation = firstFrame.width > firstFrame.height ? "landscape" : "portrait";

  // Standard PDF size - we'll use A4 landscape or portrait based on frame ratio
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [firstFrame.width, firstFrame.height],
  });

  let isFirstPage = true;

  for (const frame of frames) {
    // Get all elements that overlap with this frame
    const frameElements = getElementsOverlappingFrame(elements, frame);

    try {
      // Export this frame to canvas
      const canvas = await exportToCanvas({
        elements: frameElements,
        appState: {
          ...appState,
          exportBackground: true,
          exportWithDarkMode: appState.theme === "dark",
          // Set the frame as the bounds for export
          width: frame.width,
          height: frame.height,
        } as AppState,
        files,
        // Export at high quality
        maxWidthOrHeight: Math.max(frame.width, frame.height) * 2,
      });

      // Convert canvas to image data URL
      const imgData = canvas.toDataURL("image/png");

      // Add new page if not first
      if (!isFirstPage) {
        pdf.addPage([frame.width, frame.height], orientation);
      }
      isFirstPage = false;

      // Add image to PDF page, filling the entire page
      pdf.addImage(
        imgData,
        "PNG",
        0,
        0,
        frame.width,
        frame.height,
        undefined,
        "FAST",
      );
    } catch (error) {
      console.error(`Failed to export frame ${frame.id}:`, error);
      // Continue with next frame
    }
  }

  // Generate PDF blob
  const pdfBlob = pdf.output("blob");
  return pdfBlob;
};

/**
 * Download the PDF file
 */
export const downloadPDF = (blob: Blob, filename: string) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

/**
 * Export frames to PDF and download
 */
export const exportAndDownloadFramesPDF = async ({
  scene,
  elements,
  appState,
  files,
  canvasName = "presentation",
}: {
  scene: Scene;
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
  canvasName?: string;
}) => {
  const pdfBlob = await exportFramesToPDF({
    scene,
    elements,
    appState,
    files,
    canvasName,
  });

  if (pdfBlob) {
    const filename = `${canvasName}-presentation.pdf`;
    downloadPDF(pdfBlob, filename);
  }
};
