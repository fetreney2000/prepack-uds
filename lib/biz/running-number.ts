// Year-scoped running-number storage helpers
// Approved deviation: counters reset each calendar year.
// Storage: key `running_number_<YYYY>` in tblSystemSettings
// (e.g. running_number_2025). Default 1 when the key is absent.

/** Setting key for a given year's prepack counter. */
export function prepackCounterKey(year: number): string {
  return `running_number_${year}`;
}

/** Setting key for a given year's UDS counter. */
export function udsCounterKey(year: number): string {
  return `running_number_uds_${year}`;
}