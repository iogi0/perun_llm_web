export type ApiMode = "mock" | "http";

export interface AppConfig {
  apiMode: ApiMode;
  apiBaseUrl: string;
}

function isApiMode(value: unknown): value is ApiMode {
  return value === "mock" || value === "http";
}

export function parseConfig(env: Record<string, unknown>): AppConfig {
  const apiMode = env.VITE_API_MODE ?? "mock";
  if (!isApiMode(apiMode)) {
    throw new Error(
      `VITE_API_MODE is "${String(apiMode)}". Set it to "mock" or "http".`,
    );
  }

  const apiBaseUrl = env.VITE_API_BASE_URL ?? "/api";
  if (typeof apiBaseUrl !== "string" || apiBaseUrl === "") {
    throw new Error('VITE_API_BASE_URL is empty. Set it to a path such as "/api".');
  }

  return { apiMode, apiBaseUrl };
}

export const config: AppConfig = parseConfig(import.meta.env);
