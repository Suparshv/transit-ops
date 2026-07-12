/**
 * Standard API response wrapper — imported by every controller, no exceptions.
 * Shape: { success, data, error } per CLAUDE.md Section 7.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/** HTTP 200 / 201 success response */
export const ok = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  error: null,
});

/** HTTP 4xx / 5xx error response */
export const fail = (error: string): ApiResponse<null> => ({
  success: false,
  data: null,
  error,
});
