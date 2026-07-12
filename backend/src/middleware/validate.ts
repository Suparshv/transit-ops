import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { fail } from '../utils/apiResponse';

/**
 * validate(schema)
 *
 * Generic Zod middleware wrapper. Validates req.body against the provided
 * Zod schema. On failure returns 400 with field-level error details.
 *
 * Usage: router.post('/vehicles', requireAuth, checkRole(...), validate(vehicleSchema), handler)
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const zodError = result.error as ZodError;
      // Format Zod errors into a readable array of { field, message } objects
      const errors = zodError.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      res.status(400).json({
        success: false,
        data: null,
        error: 'Validation failed',
        // Extra field for frontend to show per-field errors
        fieldErrors: errors,
      });
      return;
    }

    // Replace req.body with the parsed (and potentially coerced) data
    req.body = result.data;
    next();
  };
