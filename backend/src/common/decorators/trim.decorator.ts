import { Transform } from 'class-transformer';

/** Quita espacios al inicio y al final; "   " queda vacío y falla @IsNotEmpty. */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) {
      return value.map((v: unknown) => (typeof v === 'string' ? v.trim() : v));
    }
    return value;
  });
