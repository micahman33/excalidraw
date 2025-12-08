import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";
import { restore } from "@excalidraw/excalidraw/data/restore";
import { exportToCanvas } from "@excalidraw/utils/export";
import { canvasToBlob } from "@excalidraw/excalidraw/data/blob";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ImportedDataState } from "@excalidraw/excalidraw/data/types";

import { supabase } from "../utils/supabase";

export interface Canvas {
  id: string;
  user_id: string;
  name: string;
  data: string; // JSON string of canvas data
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export type SortOption = "updated_at" | "name" | "created_at";

export class CanvasService {
  /**
   * Save a canvas to Supabase
   */
  static async saveCanvas(
    userId: string,
    name: string,
    elements: readonly ExcalidrawElement[],
    appState: Partial<AppState>,
    files: BinaryFiles,
  ): Promise<{ canvas: Canvas | null; error: any }> {
    if (!supabase) {
      return { canvas: null, error: { message: "Supabase not configured" } };
    }

    try {
      // Serialize canvas data (serializeAsJSON already returns a JSON string)
      const dataString = serializeAsJSON(elements, appState, files, "database");

      // Generate thumbnail
      let thumbnailUrl: string | null = null;
      try {
        const canvas = await exportToCanvas({
          elements,
          appState: {
            ...appState,
            exportBackground: true,
            exportWithDarkMode: appState.theme === "dark",
          } as AppState,
          files: null,
          maxWidthOrHeight: 200, // Thumbnail size
        });

        const blob = await canvasToBlob(canvas);
        const fileName = `${userId}/${Date.now()}.png`;

        // Upload thumbnail to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("thumbnails")
          .upload(fileName, blob, {
            contentType: "image/png",
            upsert: false,
          });

        if (!uploadError && uploadData) {
          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("thumbnails").getPublicUrl(fileName);
          thumbnailUrl = publicUrl;
        } else if (uploadError) {
          // Log the error but don't fail the entire save
          console.warn("Failed to upload thumbnail:", uploadError);
        }
      } catch (thumbnailError) {
        console.warn("Failed to generate thumbnail:", thumbnailError);
        // Continue without thumbnail
      }

      // Save to database
      // Verify dataString is actually a string before saving
      if (typeof dataString !== "string") {
        return {
          canvas: null,
          error: {
            message: `Expected string but got ${typeof dataString} from serializeAsJSON`,
          },
        };
      }

      const { data, error } = await supabase
        .from("canvases")
        .insert({
          user_id: userId,
          name,
          data: dataString,
          thumbnail_url: thumbnailUrl,
        })
        .select()
        .single();

      if (error) {
        return { canvas: null, error };
      }

      return { canvas: data as Canvas, error: null };
    } catch (error: any) {
      return { canvas: null, error };
    }
  }

  /**
   * Update an existing canvas
   */
  static async updateCanvas(
    canvasId: string,
    userId: string,
    updates: {
      name?: string;
      elements?: readonly ExcalidrawElement[];
      appState?: Partial<AppState>;
      files?: BinaryFiles;
    },
  ): Promise<{ canvas: Canvas | null; error: any }> {
    if (!supabase) {
      return { canvas: null, error: { message: "Supabase not configured" } };
    }

    try {
      const updateData: any = {};

      if (updates.name !== undefined) {
        updateData.name = updates.name;

        // If we're only updating the name (not the full canvas data),
        // we need to also update the name in the serialized data
        if (!updates.elements || !updates.appState || !updates.files) {
          // Load existing canvas data
          const { data: existingData, error: loadError } = await supabase
            .from("canvases")
            .select("data")
            .eq("id", canvasId)
            .eq("user_id", userId)
            .single();

          if (!loadError && existingData?.data) {
            try {
              // Parse existing data
              let parsedData = JSON.parse(existingData.data);
              // Handle double-encoding
              if (typeof parsedData === "string") {
                parsedData = JSON.parse(parsedData);
              }

              // Update the name in appState
              if (parsedData.appState) {
                parsedData.appState.name = updates.name;
              } else {
                parsedData.appState = { name: updates.name };
              }

              // Re-serialize with updated name
              updateData.data = JSON.stringify(parsedData);
            } catch (parseError) {
              // If parsing fails, we'll just update the name field
              // and let the next full save update the data
            }
          }
        }
      }

      if (updates.elements && updates.appState && updates.files) {
        // Serialize new canvas data
        // Make sure the name in appState matches the name being saved
        const appStateWithName = {
          ...updates.appState,
          name: updates.name || updates.appState.name,
        };
        const canvasData = serializeAsJSON(
          updates.elements,
          appStateWithName,
          updates.files,
          "database",
        );
        updateData.data = canvasData; // serializeAsJSON already returns a string

        // Regenerate thumbnail
        try {
          const canvas = await exportToCanvas({
            elements: updates.elements,
            appState: {
              ...updates.appState,
              exportBackground: true,
              exportWithDarkMode: updates.appState.theme === "dark",
            } as AppState,
            files: null,
            maxWidthOrHeight: 200,
          });

          const blob = await canvasToBlob(canvas);
          const fileName = `${userId}/${canvasId}.png`;

          // Try to remove existing file first (if it exists)
          await supabase.storage
            .from("thumbnails")
            .remove([fileName]);

          // Upload thumbnail
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from("thumbnails")
            .upload(fileName, blob, {
              contentType: "image/png",
              upsert: false,
            });

          if (!uploadError && uploadData) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("thumbnails").getPublicUrl(fileName);
            updateData.thumbnail_url = publicUrl;
          } else if (uploadError) {
            // Log the error but don't fail the entire save
            console.warn("Failed to upload thumbnail:", uploadError);
          }
        } catch (thumbnailError) {
          console.warn("Failed to regenerate thumbnail:", thumbnailError);
        }
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("canvases")
        .update(updateData)
        .eq("id", canvasId)
        .eq("user_id", userId) // Ensure user owns this canvas
        .select()
        .single();

      if (error) {
        return { canvas: null, error };
      }

      return { canvas: data as Canvas, error: null };
    } catch (error: any) {
      return { canvas: null, error };
    }
  }

  /**
   * Load a canvas from Supabase
   */
  static async loadCanvas(
    canvasId: string,
    userId: string,
  ): Promise<{ data: ImportedDataState | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: "Supabase not configured" } };
    }

    try {
      const { data, error } = await supabase
        .from("canvases")
        .select("*")
        .eq("id", canvasId)
        .eq("user_id", userId)
        .single();

      if (error) {
        return { data: null, error };
      }

      if (!data) {
        return { data: null, error: { message: "Canvas not found" } };
      }

      // Parse and restore canvas data
      // Note: data.data should be a JSON string from serializeAsJSON
      // However, Supabase might double-encode it, so we need to handle that
      let canvasData;
      try {
        // Handle case where Supabase might return the data as a string or already parsed
        let parsed: any = data.data;

        // If it's a string, parse it
        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
          // If the result is still a string, it was double-encoded - parse again
          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
        }

        canvasData = parsed;
      } catch (parseError: any) {
        return {
          data: null,
          error: {
            message: `Failed to parse canvas data: ${
              parseError.message
            }. Data type: ${typeof data.data}, Data preview: ${String(
              data.data,
            ).substring(0, 100)}`,
          },
        };
      }

      // Validate that we have valid Excalidraw data structure
      if (!canvasData || typeof canvasData !== "object") {
        return {
          data: null,
          error: {
            message: `Invalid canvas data format: expected object, got ${typeof canvasData}`,
          },
        };
      }

      // The serializeAsJSON returns data with type, version, source, elements, appState, files
      // restore expects elements, appState, and files
      // Check if elements exists and is an array
      if (!("elements" in canvasData)) {
        return {
          data: null,
          error: {
            message: `Invalid canvas data: missing 'elements' property. Available keys: ${Object.keys(
              canvasData,
            ).join(", ")}`,
          },
        };
      }

      if (!Array.isArray(canvasData.elements)) {
        return {
          data: null,
          error: {
            message: `Invalid canvas data: elements is not an array, got ${typeof canvasData.elements}`,
          },
        };
      }

      const restored = restore(
        {
          elements: canvasData.elements || [],
          appState: canvasData.appState || {},
          files: canvasData.files || {},
        },
        null, // localAppState - null means use defaults
        null, // localElements - null means no merge
        {
          repairBindings: true,
          refreshDimensions: false,
          deleteInvisibleElements: true,
        },
      );

      return { data: restored, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  /**
   * List all canvases for a user
   */
  static async listCanvases(
    userId: string,
    sortBy: SortOption = "updated_at",
  ): Promise<{ canvases: Canvas[]; error: any }> {
    if (!supabase) {
      return { canvases: [], error: { message: "Supabase not configured" } };
    }

    try {
      let query = supabase.from("canvases").select("*").eq("user_id", userId);

      // Apply sorting
      if (sortBy === "name") {
        query = query.order("name", { ascending: true });
      } else if (sortBy === "created_at") {
        query = query.order("created_at", { ascending: false });
      } else {
        // Default: updated_at
        query = query.order("updated_at", { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        return { canvases: [], error };
      }

      return { canvases: (data || []) as Canvas[], error: null };
    } catch (error: any) {
      return { canvases: [], error };
    }
  }

  /**
   * Delete a canvas
   */
  static async deleteCanvas(
    canvasId: string,
    userId: string,
  ): Promise<{ error: any }> {
    if (!supabase) {
      return { error: { message: "Supabase not configured" } };
    }

    try {
      // Get canvas to delete thumbnail
      const { data: canvas } = await supabase
        .from("canvases")
        .select("thumbnail_url")
        .eq("id", canvasId)
        .eq("user_id", userId)
        .single();

      // Delete from database
      const { error } = await supabase
        .from("canvases")
        .delete()
        .eq("id", canvasId)
        .eq("user_id", userId);

      if (error) {
        return { error };
      }

      // Delete thumbnail from storage if it exists
      if (canvas?.thumbnail_url) {
        const fileName = canvas.thumbnail_url.split("/").pop();
        if (fileName) {
          await supabase.storage
            .from("thumbnails")
            .remove([`${userId}/${fileName}`]);
        }
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  }
}
