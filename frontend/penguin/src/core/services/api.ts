import type {
  PenguinConfig,
  GenerationResponse,
  ValidationResponse,
  Presets,
  LightingDirectionValue,
  SemanticParsingResponse,
  LightingCondition,
  CameraAngle,
  LensType,
  StyleMedium,
  AestheticStyle,
  ShadowIntensity,
} from "@/core/types";
import {
  validateConfig,
  sanitizeInput,
  validateJSONMetadata,
  validateSceneConfig,
} from "@/shared/lib/validation";
import {
  ApiError,
  NetworkError,
  ValidationError,
  showSuccess,
  showError,
  LoadingStateManager,
} from "@/shared/lib/errorHandling";
import {
  memoizeAsync,
  measureOperationAsync,
  debounce,
} from "@/shared/lib/performance";
import { env } from "@/shared/lib/env";
import type { ParsedValue } from "@/core/types";
import {
  CAMERA_ANGLE_OPTIONS,
  LENS_FOCAL_LENGTH_OPTIONS,
  LIGHTING_CONDITIONS_OPTIONS,
  STYLE_MEDIUM_OPTIONS,
  AESTHETIC_STYLE_OPTIONS,
} from "@/core/types";

// ============================================================================
// API Client Configuration
// ============================================================================

const DEFAULT_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// API Client Class
// ============================================================================

class PenguinApiClient {
  private baseUrl: string;
  public loadingManager: LoadingStateManager;

  constructor() {
    this.baseUrl = env.apiBaseUrl;
    this.loadingManager = new LoadingStateManager();
  }

  /**
   * Local semantic fallback parser when backend parsing is unavailable.
   */
  localParseSceneMetadata(
    metadata: Record<string, unknown>
  ): SemanticParsingResponse {
    const lighting = (metadata?.lighting as Record<string, unknown>) || {};
    const photo =
      (metadata?.photographic_characteristics as Record<string, unknown>) || {};
    const aesthetics = (metadata?.aesthetics as Record<string, unknown>) || {};

    const styleMedium = pickSemantic<StyleMedium | string>(
      metadata?.style_medium,
      STYLE_MEDIUM_OPTIONS
    );
    const aestheticStyle = pickSemantic<AestheticStyle | string>(
      aesthetics?.artistic_style ?? aesthetics,
      AESTHETIC_STYLE_OPTIONS
    );

    return {
      background_setting:
        typeof metadata?.background_setting === "string" &&
        metadata.background_setting.trim()
          ? metadata.background_setting
          : "neutral background",
      photographic_characteristics: {
        camera_angle: pickSemantic<CameraAngle | string>(
          photo?.camera_angle,
          CAMERA_ANGLE_OPTIONS
        ),
        lens_focal_length: pickSemantic<LensType | string>(
          photo?.lens_focal_length,
          LENS_FOCAL_LENGTH_OPTIONS
        ),
        depth_of_field: parseNumeric(photo?.depth_of_field, DEPTH_KEYWORDS, 50),
        focus: parseNumeric(photo?.focus, FOCUS_KEYWORDS, 75),
      },
      lighting: {
        conditions: pickSemantic<LightingCondition | string>(
          lighting?.conditions,
          LIGHTING_CONDITIONS_OPTIONS
        ),
        direction: parseLightingDirection(lighting?.direction),
        shadows: parseNumeric(
          lighting?.shadows,
          SHADOW_KEYWORDS,
          2
        ) as ParsedValue<ShadowIntensity>,
      },
      aesthetics: {
        style_medium: styleMedium,
        aesthetic_style: aestheticStyle,
      },
    };
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError(`Request timed out after ${timeout}ms`);
      }

      throw new NetworkError("Network request failed");
    }
  }

  /**
   * Sanitize configuration before sending to API
   */
  private sanitizeConfig(config: PenguinConfig): PenguinConfig {
    return {
      ...config,
      short_description: sanitizeInput(config.short_description),
      background_setting: sanitizeInput(config.background_setting),
      objects: config.objects.map((obj) => ({
        ...obj,
        description: sanitizeInput(obj.description),
        shape_and_color: sanitizeInput(obj.shape_and_color),
        texture: obj.texture ? sanitizeInput(obj.texture) : undefined,
        appearance_details: obj.appearance_details
          ? sanitizeInput(obj.appearance_details)
          : undefined,
        pose: obj.pose ? sanitizeInput(obj.pose) : undefined,
        expression: obj.expression ? sanitizeInput(obj.expression) : undefined,
        action: obj.action ? sanitizeInput(obj.action) : undefined,
      })),
      context: config.context ? sanitizeInput(config.context) : undefined,
    };
  }

  /**
   * Generate image from configuration
   */
  async generateImage(config: PenguinConfig): Promise<GenerationResponse> {
    // Validate config before sending
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new ValidationError("Invalid configuration", validation.errors);
    }

    // Sanitize inputs
    const sanitizedConfig = this.sanitizeConfig(config);

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sanitizedConfig),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (
        error instanceof ApiError ||
        error instanceof NetworkError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw new NetworkError("Failed to generate image");
    }
  }

  /**
   * Refine existing image with new prompt
   */
  async refineImage(
    config: PenguinConfig,
    imageUrl: string
  ): Promise<GenerationResponse> {
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new ValidationError("Invalid configuration", validation.errors);
    }

    const sanitizedConfig = this.sanitizeConfig(config);

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/refine`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            config: sanitizedConfig,
            image_url: imageUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (
        error instanceof ApiError ||
        error instanceof NetworkError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw new NetworkError("Failed to refine image");
    }
  }

  /**
   * Get generation status by ID
   * Used for polling generation progress
   */
  async getGeneration(id: string): Promise<GenerationResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/generate/${id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError("Failed to fetch generation status");
    }
  }

  /**
   * Validate configuration without generating
   */
  async validateConfig(config: PenguinConfig): Promise<ValidationResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError("Failed to validate configuration");
    }
  }

  /**
   * Get available presets
   */
  async getPresets(): Promise<Presets> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/presets`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError("Failed to load presets");
    }
  }

  /**
   * Export configuration as JSON file
   */
  exportConfig(
    config: PenguinConfig,
    filename: string = "penguin-config.json"
  ): void {
    try {
      // Validate before export
      const validation = validateConfig(config);
      if (!validation.valid) {
        showError(
          "Export Failed",
          "Configuration is invalid. Please fix errors before exporting."
        );
        return;
      }

      const json = JSON.stringify(config, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      // Show success notification
      showSuccess("Config Exported", `Saved as ${filename}`);
    } catch (error) {
      showError("Export Failed", "Could not export configuration");
      console.error("Export error:", error);
    }
  }

  /**
   * Copy configuration to clipboard
   */
  async copyConfig(config: PenguinConfig): Promise<void> {
    try {
      // Validate before copy
      const validation = validateConfig(config);
      if (!validation.valid) {
        showError(
          "Copy Failed",
          "Configuration is invalid. Please fix errors before copying."
        );
        return;
      }

      const json = JSON.stringify(config, null, 2);
      await navigator.clipboard.writeText(json);

      // Show success notification
      showSuccess("Copied to Clipboard", "Configuration copied successfully");
    } catch (error) {
      showError("Copy Failed", "Could not copy to clipboard");
      console.error("Copy error:", error);
    }
  }

  /**
   * Parse scene metadata using semantic similarity matching (with memoization)
   */
  parseSceneMetadata = memoizeAsync(
    async (
      metadata: Record<string, unknown>
    ): Promise<SemanticParsingResponse> => {
      return measureOperationAsync("parseSceneMetadata", async () => {
        // Validate and sanitize metadata first
        const validationResult = validateJSONMetadata(metadata);
        if (!validationResult.valid) {
          throw new ValidationError("Invalid metadata format", [
            validationResult.error || "Unknown validation error",
          ]);
        }

        const sanitizedMetadata = validationResult.sanitized || {};

        try {
          const response = await this.fetchWithTimeout(
            `${this.baseUrl}/api/v1/scene/parse`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ metadata: sanitizedMetadata }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new ApiError(
              errorData.message || `HTTP error! status: ${response.status}`,
              response.status,
              errorData
            );
          }

          const result = await response.json();

          // Validate the response structure
          const configValidation = validateSceneConfig(result);
          if (!configValidation.valid) {
            console.warn(
              "Invalid scene configuration from API:",
              configValidation.errors
            );
            // Don't throw error, just log warning and return result
          }

          return result;
        } catch (error) {
          // Fallback to local parsing if server is unavailable or 404
          if (
            error instanceof ApiError ||
            error instanceof NetworkError ||
            error instanceof ValidationError
          ) {
            console.warn(
              "[parseSceneMetadata] Falling back to local parser due to error:",
              error
            );
            return this.localParseSceneMetadata(sanitizedMetadata);
          }
          throw new NetworkError("Failed to parse scene metadata");
        }
      });
    },
    { maxSize: 50, maxAge: 5 * 60 * 1000 } // Cache for 5 minutes
  );

  /**
   * Get available scene parsing options (with memoization)
   */
  getSceneParsingOptions = memoizeAsync(
    async (): Promise<Record<string, unknown>> => {
      return measureOperationAsync("getSceneParsingOptions", async () => {
        try {
          const response = await this.fetchWithTimeout(
            `${this.baseUrl}/api/v1/scene/options`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new ApiError(
              errorData.message || `HTTP error! status: ${response.status}`,
              response.status,
              errorData
            );
          }

          return await response.json();
        } catch (error) {
          if (error instanceof ApiError || error instanceof NetworkError) {
            throw error;
          }
          throw new NetworkError("Failed to get scene parsing options");
        }
      });
    },
    { maxSize: 10, maxAge: 10 * 60 * 1000 } // Cache for 10 minutes
  );

  /**
   * Debounced version of parseSceneMetadata for rapid configuration changes
   */
  parseSceneMetadataDebounced = debounce(
    (
      metadata: Record<string, unknown>,
      callback: (result: SemanticParsingResponse | null, error?: Error) => void
    ) => {
      this.parseSceneMetadata(metadata)
        .then((result) => callback(result))
        .catch((error) =>
          callback(
            null,
            error instanceof Error ? error : new Error("Unknown error")
          )
        );
    },
    500, // 500ms debounce
    { maxWait: 2000 } // Maximum wait of 2 seconds
  );

  /**
   * Validate scene configuration
   */
  async validateSceneConfiguration(
    configuration: SemanticParsingResponse
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/scene/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(configuration),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError("Failed to validate scene configuration");
    }
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const apiClient = new PenguinApiClient();

// ============================================================================
// Local semantic fallback (client-side) to avoid hard failures when backend parse is unavailable
// ============================================================================

const clampNumber = (val: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, val));

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const scoreOption = (input: string, option: string): number => {
  const opt = option.toLowerCase();
  if (!input) return 0;
  if (input === opt) return 1;
  if (input.includes(opt) || opt.includes(input)) return 0.8;
  const inputWords = new Set(input.split(/\s+/));
  const optWords = new Set(opt.split(/\s+/));
  const shared = [...inputWords].filter((w) => optWords.has(w));
  return (shared.length / Math.max(optWords.size, 1)) * 0.6;
};

const pickSemantic = <T extends string>(
  input: unknown,
  options: readonly T[]
): { value: T | string; confidence: number; isCustom: boolean } => {
  const text = normalizeText(input);
  if (!text) return { value: options[0], confidence: 0, isCustom: true };
  let best: { option: T | string; score: number } = {
    option: options[0],
    score: 0,
  };
  options.forEach((opt) => {
    const s = scoreOption(text, opt);
    if (s > best.score) best = { option: opt, score: s };
  });
  return {
    value: best.score >= 0.3 ? best.option : text,
    confidence: best.score,
    isCustom: best.score < 0.6,
  };
};

const parseNumeric = (
  input: unknown,
  keywordMap: Record<string, number>,
  defaultVal = 50
): { value: number; confidence: number; isCustom: boolean } => {
  if (typeof input === "number" && Number.isFinite(input)) {
    return {
      value: clampNumber(input, 0, 100),
      confidence: 1,
      isCustom: false,
    };
  }
  const text = normalizeText(input);
  for (const key of Object.keys(keywordMap)) {
    if (text.includes(key)) {
      return { value: keywordMap[key], confidence: 0.9, isCustom: false };
    }
  }
  return { value: defaultVal, confidence: 0.2, isCustom: true };
};

const parseLightingDirection = (
  input: unknown
): { value: LightingDirectionValue; confidence: number; isCustom: boolean } => {
  const text = normalizeText(input);
  const result: LightingDirectionValue = {
    x: 50,
    y: 30,
    rotation: 0,
    tilt: -15,
  };
  let conf = 0.4;
  if (text.includes("above") || text.includes("top")) {
    result.y = 10;
    result.tilt = -40;
    conf = 0.7;
  } else if (text.includes("below") || text.includes("bottom")) {
    result.y = 85;
    result.tilt = 35;
    conf = 0.7;
  }
  if (text.includes("left")) {
    result.x = 20;
    conf = Math.max(conf, 0.7);
  } else if (text.includes("right")) {
    result.x = 80;
    conf = Math.max(conf, 0.7);
  }
  if (text.includes("front") || text.includes("forward")) {
    result.tilt = Math.max(result.tilt, -10);
    conf = Math.max(conf, 0.6);
  }
  if (text.includes("side")) {
    result.rotation = text.includes("right") ? 90 : 270;
    conf = Math.max(conf, 0.7);
  }
  return { value: result, confidence: conf, isCustom: conf < 0.6 };
};

// Minimal keyword maps
const DEPTH_KEYWORDS: Record<string, number> = {
  "very shallow": 10,
  shallow: 25,
  medium: 50,
  deep: 75,
  "very deep": 90,
};
const FOCUS_KEYWORDS: Record<string, number> = {
  soft: 25,
  selective: 50,
  sharp: 80,
  crisp: 90,
};
const SHADOW_KEYWORDS: Record<string, number> = {
  none: 0,
  subtle: 1,
  soft: 2,
  moderate: 3,
  hard: 4,
  dramatic: 5,
};

// End of module helpers
