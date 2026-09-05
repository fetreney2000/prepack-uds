// Single source of truth for the template Storage bucket + key convention.
// Kept dependency-free so it can be imported by route handlers, server
// actions, and the standalone upload script (which does not resolve `@/`
// path aliases and must not pull in docxtemplater/pizzip).

export const TEMPLATE_BUCKET = "templates";

export type TemplateKind = "label" | "worksheet";

/** Object key for a template of the given kind + filename. */
export function templateStorageKey(kind: TemplateKind, namaFail: string): string {
  const folder = kind === "label" ? "labels" : "worksheets";
  return `${folder}/${namaFail}`;
}
