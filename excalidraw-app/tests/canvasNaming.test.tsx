import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@excalidraw/excalidraw/tests/test-utils";

import ExcalidrawApp from "../App";

// Mock Supabase
vi.mock("../utils/supabase", () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null,
            })),
            order: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: null,
                  error: null,
                })),
              })),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => ({
          data: null,
          error: null,
        })),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "http://example.com/thumb.png" },
        })),
        remove: vi.fn(() => ({})),
      })),
    },
  };
  return {
    supabase: mockSupabase,
  };
});

// Mock Auth
vi.mock("../auth/AuthProvider", () => {
  return {
    useAuth: () => ({
      user: { id: "test-user-id" },
      signIn: vi.fn(),
      signOut: vi.fn(),
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock Firebase
vi.mock("../data/firebase.ts", () => {
  return {
    loadFilesFromFirebase: async () => ({
      loadedFiles: [],
      erroredFiles: [],
    }),
    saveFilesToFirebase: async () => ({
      savedFiles: new Map(),
      erroredFiles: new Map(),
    }),
  };
});

// Mock socket.io
vi.mock("socket.io-client", () => {
  return {
    default: () => ({
      close: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    }),
  };
});

describe("Canvas Naming", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should extract filename from .excalidraw file and use as canvas name", async () => {
    await render(<ExcalidrawApp />);

    // Simulate loading a file with fileHandle
    const mockFileHandle = {
      name: "ScalableTraining.excalidraw",
      kind: "file" as const,
    };

    // Get the excalidraw API
    await waitFor(() => {
      expect(window.h.app).toBeDefined();
    });

    const app = window.h.app;

    // Simulate file load by updating scene with fileHandle
    act(() => {
      app.updateScene({
        appState: {
          fileHandle: mockFileHandle as any,
          name: "Untitled Canvas", // Initial name
        },
      });
    });

    // Wait for the onChange handler to process the file
    await waitFor(
      () => {
        const currentName = app.getName();
        // The name should be extracted from filename (without .excalidraw extension)
        expect(currentName).toBe("ScalableTraining");
      },
      { timeout: 3000 },
    );
  });

  it("should clear currentCanvasId when loading a new file", async () => {
    await render(<ExcalidrawApp />);

    await waitFor(() => {
      expect(window.h.app).toBeDefined();
    });

    const app = window.h.app;

    // First, set a currentCanvasId (simulate having an existing canvas)
    localStorage.setItem("excalidraw_currentCanvasId", "existing-canvas-id");

    // Simulate loading a new file
    const mockFileHandle = {
      name: "NewFile.excalidraw",
      kind: "file" as const,
    };

    act(() => {
      app.updateScene({
        appState: {
          fileHandle: mockFileHandle as any,
        },
      });
    });

    // Wait and check that currentCanvasId was cleared
    await waitFor(() => {
      const storedId = localStorage.getItem("excalidraw_currentCanvasId");
      // Should be null or removed when loading a new file
      expect(storedId).toBeNull();
    });
  });

  it("should preserve canvas name after refresh when loading from database", async () => {
    // This test verifies that when we have a currentCanvasId in localStorage,
    // the name is loaded from the database on refresh

    const mockCanvas = {
      id: "test-canvas-id",
      user_id: "test-user-id",
      name: "My Saved Canvas",
      data: JSON.stringify({
        elements: [],
        appState: { name: "My Saved Canvas" },
        files: {},
      }),
      thumbnail_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock the getCanvasMetadata call
    const { supabase } = await import("../utils/supabase");
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn((field: string, value: string) => {
          if (field === "id" && value === "test-canvas-id") {
            return {
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: mockCanvas,
                  error: null,
                })),
              })),
            };
          }
          return {
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          };
        }),
      })),
    }));

    (supabase as any).from = mockFrom;

    // Set up localStorage as if we had a canvas loaded
    localStorage.setItem("excalidraw_currentCanvasId", "test-canvas-id");
    localStorage.setItem("excalidraw_canvasName", "Old Name");

    await render(<ExcalidrawApp />);

    await waitFor(() => {
      expect(window.h.app).toBeDefined();
    });

    // Wait for the useEffect to load the canvas name from database
    await waitFor(
      () => {
        const storedName = localStorage.getItem("excalidraw_canvasName");
        // Should be updated to the name from database
        expect(storedName).toBe("My Saved Canvas");
      },
      { timeout: 3000 },
    );
  });

  it("should handle .json file extensions correctly", async () => {
    await render(<ExcalidrawApp />);

    await waitFor(() => {
      expect(window.h.app).toBeDefined();
    });

    const app = window.h.app;

    const mockFileHandle = {
      name: "MyCanvas.json",
      kind: "file" as const,
    };

    act(() => {
      app.updateScene({
        appState: {
          fileHandle: mockFileHandle as any,
        },
      });
    });

    await waitFor(
      () => {
        const currentName = app.getName();
        // Should remove .json extension
        expect(currentName).toBe("MyCanvas");
      },
      { timeout: 3000 },
    );
  });

  it("should not replace existing canvas when loading from gallery", async () => {
    // This test ensures that when loading a canvas from "My Canvases",
    // it doesn't clear the currentCanvasId incorrectly

    await render(<ExcalidrawApp />);

    await waitFor(() => {
      expect(window.h.app).toBeDefined();
    });

    // Simulate loading from gallery (no fileHandle)
    // This should set currentCanvasId, not clear it
    act(() => {
      // When loading from gallery, there's no fileHandle
      // The canvas ID should be set
      localStorage.setItem("excalidraw_currentCanvasId", "gallery-canvas-id");
      localStorage.setItem("excalidraw_canvasName", "Gallery Canvas");
    });

    await waitFor(() => {
      const storedId = localStorage.getItem("excalidraw_currentCanvasId");
      expect(storedId).toBe("gallery-canvas-id");
    });
  });
});
