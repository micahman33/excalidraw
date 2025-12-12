import PptxGenJS from "pptxgenjs";

import { FONT_FAMILY } from "@excalidraw/common";

import {
  getElementsOverlappingFrame,
  getFrameLikeElements,
  isTextElement,
} from "@excalidraw/element";

import { getNonDeletedElements } from "@excalidraw/element";

import type {
  ExcalidrawElement,
  ExcalidrawFrameLikeElement,
  ExcalidrawTextElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import { exportToCanvas } from "../scene/export";

import { canvasToBlob } from "./blob";

import type { AppState, BinaryFiles } from "../types";

/**
 * Convert Excalidraw elements to PowerPoint presentation
 * Each frame becomes a slide with the frame content as background image
 * and text elements as editable text boxes on top
 */
export const exportToPowerPoint = async (
  elements: readonly NonDeletedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
  options: {
    exportBackground: boolean;
    viewBackgroundColor: string;
    name?: string;
  },
): Promise<Blob> => {
  // Filter to only non-deleted elements
  const nonDeletedElements = getNonDeletedElements(elements);
  const frames = getFrameLikeElements(nonDeletedElements);

  if (frames.length === 0) {
    throw new Error(
      "No frames found. Please create frames to export as PowerPoint slides.",
    );
  }

  const pptx = new PptxGenJS();

  // Set presentation properties
  pptx.author = "Excalidraw";
  pptx.company = "Excalidraw";
  pptx.title = options.name || "Excalidraw Presentation";

  // Load and embed Virgil font
  // Note: pptxgenjs doesn't directly support font embedding, but we can
  // set the font name and PowerPoint will use it if available
  // For proper embedding, we'd need to modify the PPTX file structure directly
  const virgilFontPath = "/fonts/Virgil/Virgil.ttf";

  // Process each frame as a slide
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const slide = pptx.addSlide();

    // Get elements that belong to this frame
    const frameElements = getElementsOverlappingFrame(
      nonDeletedElements,
      frame,
    );

    // Separate text and non-text elements
    const textElements = frameElements.filter(
      (el): el is ExcalidrawTextElement => isTextElement(el),
    );
    const nonTextElements = frameElements.filter((el) => !isTextElement(el));

    console.log(
      `Frame ${i + 1}: Found ${textElements.length} text elements, ${
        nonTextElements.length
      } non-text elements`,
    );

    // Export frame as image WITHOUT text elements (text will be added as editable boxes)
    const canvas = await exportToCanvas(nonTextElements, appState, files, {
      exportBackground: options.exportBackground,
      viewBackgroundColor: options.viewBackgroundColor,
      exportPadding: 0,
      exportingFrame: frame,
    });

    // Convert canvas to base64 image
    const blob = await canvasToBlob(canvas);
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // pptxgenjs expects the full data URL format: "data:image/png;base64,..."
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Add background image to slide
    // PowerPoint slide dimensions: 10" x 7.5" (960 x 720 points)
    // We'll scale the image to fit while maintaining aspect ratio
    const slideWidth = 10; // inches
    const slideHeight = 7.5; // inches
    const imageWidth = canvas.width;
    const imageHeight = canvas.height;
    const aspectRatio = imageWidth / imageHeight;
    const slideAspectRatio = slideWidth / slideHeight;

    let imgWidth = slideWidth;
    let imgHeight = slideHeight;
    let imgX = 0;
    let imgY = 0;

    if (aspectRatio > slideAspectRatio) {
      // Image is wider - fit to width
      imgHeight = slideWidth / aspectRatio;
      imgY = (slideHeight - imgHeight) / 2;
    } else {
      // Image is taller - fit to height
      imgWidth = slideHeight * aspectRatio;
      imgX = (slideWidth - imgWidth) / 2;
    }

    slide.addImage({
      data: base64Image,
      x: imgX,
      y: imgY,
      w: imgWidth,
      h: imgHeight,
      path: undefined, // Use data instead of path
    });

    // Calculate scale factors for converting Excalidraw coordinates to PowerPoint
    // Note: canvas dimensions might be different from frame dimensions due to export scaling
    const frameWidth = frame.width;
    const frameHeight = frame.height;
    const scaleX = imgWidth / frameWidth;
    const scaleY = imgHeight / frameHeight;

    for (const textEl of textElements) {
      // Skip empty text elements
      const textContent = textEl.text || textEl.originalText || "";
      if (!textContent || textContent.trim() === "") {
        console.log(
          `Skipping empty text element at (${textEl.x}, ${textEl.y})`,
        );
        continue;
      }

      console.log(
        `Adding text: "${textContent.substring(0, 50)}..." at (${textEl.x}, ${
          textEl.y
        })`,
      );

      // Get text element position relative to frame
      // Frame coordinates are in Excalidraw's coordinate system
      const textXRelative = textEl.x - frame.x;
      const textYRelative = textEl.y - frame.y;

      // Scale to PowerPoint slide coordinates (in inches)
      // Convert from Excalidraw pixels to inches (assuming 96 DPI)
      const textX = (textXRelative * scaleX) / 96 + imgX;
      const textY = (textYRelative * scaleY) / 96 + imgY;

      // Convert Excalidraw font size (px) to PowerPoint points
      // Excalidraw uses pixels, PowerPoint uses points (1 point = 1/72 inch)
      // Assuming 96 DPI: 1 px = 0.75 pt
      const fontSizePt = textEl.fontSize * 0.75;

      // Convert Excalidraw dimensions to PowerPoint (in inches)
      const textWidth = (textEl.width * scaleX) / 96;
      const textHeight = (textEl.height * scaleY) / 96;

      // Map text alignment
      let align: "left" | "center" | "right" = "left";
      if (textEl.textAlign === "center") {
        align = "center";
      } else if (textEl.textAlign === "right") {
        align = "right";
      }

      // Map vertical alignment
      let valign: "top" | "middle" | "bottom" = "top";
      if (textEl.verticalAlign === "middle") {
        valign = "middle";
      } else if (textEl.verticalAlign === "bottom") {
        valign = "bottom";
      }

      // Use Virgil font for all text elements (as requested by user)
      // Convert color from hex to format expected by pptxgenjs
      const color = textEl.strokeColor.startsWith("#")
        ? textEl.strokeColor.slice(1)
        : textEl.strokeColor;

      // Add text box as editable text
      slide.addText(textContent, {
        x: textX,
        y: textY,
        w: textWidth,
        h: textHeight,
        fontSize: fontSizePt,
        fontFace: "Virgil", // Use Virgil font name for all text
        color,
        align,
        valign,
      });
    }
  }

  // Generate PowerPoint file
  const pptxBlob = await pptx.write({ outputType: "blob" });

  return pptxBlob as Blob;
};
