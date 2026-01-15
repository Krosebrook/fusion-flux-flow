import { z } from 'zod';

/**
 * Input validation utilities with sanitization for security.
 * 
 * @module lib/validation
 */

/**
 * Sanitizes a string by removing potentially harmful characters.
 * Used for text that will be displayed but not as HTML.
 */
export function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 10000); // Limit length
}

/**
 * Sanitizes a string for use as an identifier/slug.
 * Only allows alphanumeric characters, hyphens, and underscores.
 */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 100);
}

/**
 * Common validation schemas for reuse across the application.
 */
export const validationSchemas = {
  /** Email validation with reasonable constraints */
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email is too long'),

  /** Password validation with strength requirements */
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),

  /** Password confirmation that matches */
  confirmPassword: z.string().min(1, 'Please confirm your password'),

  /** Name field with reasonable constraints */
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .transform(sanitizeText),

  /** Optional name field */
  optionalName: z
    .string()
    .max(100, 'Name is too long')
    .transform(sanitizeText)
    .optional(),

  /** Slug/identifier validation */
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(/^[a-z0-9-_]+$/, 'Slug can only contain lowercase letters, numbers, hyphens, and underscores')
    .transform(sanitizeSlug),

  /** URL validation */
  url: z
    .string()
    .url('Please enter a valid URL')
    .max(2000, 'URL is too long')
    .optional()
    .or(z.literal('')),

  /** Non-empty text with length limits */
  text: z
    .string()
    .min(1, 'This field is required')
    .max(10000, 'Text is too long')
    .transform(sanitizeText),

  /** Optional text field */
  optionalText: z
    .string()
    .max(10000, 'Text is too long')
    .transform(sanitizeText)
    .optional()
    .or(z.literal('')),

  /** UUID validation */
  uuid: z.string().uuid('Invalid ID format'),

  /** Price validation (positive number with 2 decimal places max) */
  price: z
    .number()
    .min(0, 'Price must be positive')
    .max(999999999.99, 'Price is too large')
    .transform((val) => Math.round(val * 100) / 100),

  /** Quantity validation */
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(0, 'Quantity must be positive')
    .max(999999999, 'Quantity is too large'),
};

/**
 * Create a sign-in form schema.
 */
export const signInSchema = z.object({
  email: validationSchemas.email,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Create a sign-up form schema with password confirmation.
 */
export const signUpSchema = z
  .object({
    email: validationSchemas.email,
    password: validationSchemas.password,
    confirmPassword: validationSchemas.confirmPassword,
    fullName: validationSchemas.optionalName,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

/**
 * Create an organization form schema.
 */
export const createOrgSchema = z.object({
  name: validationSchemas.name,
  slug: validationSchemas.slug,
});

/**
 * Product form schema.
 */
export const productSchema = z.object({
  title: validationSchemas.name,
  description: validationSchemas.optionalText,
  sku: z.string().max(100, 'SKU is too long').optional().or(z.literal('')),
});

/**
 * Variant form schema.
 */
export const variantSchema = z.object({
  title: validationSchemas.name,
  sku: z.string().max(100, 'SKU is too long').optional().or(z.literal('')),
  price: validationSchemas.price.optional().nullable(),
  inventory_quantity: validationSchemas.quantity.default(0),
});

/**
 * Type exports for form usage
 */
export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type CreateOrgFormData = z.infer<typeof createOrgSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type VariantFormData = z.infer<typeof variantSchema>;
