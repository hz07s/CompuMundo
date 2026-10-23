import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  const valid = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/compumundo',
    JWT_SECRET: 'x'.repeat(32),
    CORS_ORIGIN: 'http://localhost:5173',
  };

  it('aplica los valores por defecto', () => {
    const { error, value } = envValidationSchema.validate(valid) as {
      error?: Error;
      value: Record<string, unknown>;
    };

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      PORT: 3000,
      JWT_ACCESS_EXPIRES_IN: '8h',
      JWT_REFRESH_EXPIRES_IN: '7d',
    });
  });

  it('falla si faltan variables obligatorias', () => {
    const { error } = envValidationSchema.validate({}, { abortEarly: false });

    const missing = error?.details.map((d) => d.path[0]);
    expect(missing).toEqual(
      expect.arrayContaining(['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN']),
    );
  });

  it('rechaza un JWT_SECRET demasiado corto', () => {
    const { error } = envValidationSchema.validate({
      ...valid,
      JWT_SECRET: 'corto',
    });

    expect(error?.details[0].path).toEqual(['JWT_SECRET']);
  });
});
