import { describe, expect, it } from "vitest";
import { parseConfig } from "./config";

describe("parseConfig", () => {
  it("defaults to the mock API under /api", () => {
    expect(parseConfig({})).toEqual({ apiMode: "mock", apiBaseUrl: "/api" });
  });

  it("uses the values it is given", () => {
    expect(
      parseConfig({ VITE_API_MODE: "http", VITE_API_BASE_URL: "/backend" }),
    ).toEqual({ apiMode: "http", apiBaseUrl: "/backend" });
  });

  it("throws a clear error for an unknown API mode", () => {
    expect(() => parseConfig({ VITE_API_MODE: "banana" })).toThrow(
      /VITE_API_MODE.*"banana".*mock.*http/,
    );
  });

  it("throws a clear error for an empty base URL", () => {
    expect(() => parseConfig({ VITE_API_BASE_URL: "" })).toThrow(
      /VITE_API_BASE_URL/,
    );
  });
});
