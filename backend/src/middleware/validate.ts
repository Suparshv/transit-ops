import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { fail } from '../utils/apiResponse';

/**
 * validate(schema)
 *
 * Generic Zod middleware wrapper. Validates req.body against the provided
 * Zod schema. On failure returns 400 with field-level error details.
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const zodError = result.error as ZodError;
      const errors = zodError.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      res.status(400).json({
        success: false,
        data: null,
        error: 'Validation failed',
        fieldErrors: errors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
