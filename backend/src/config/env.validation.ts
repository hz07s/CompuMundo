import * as Joi from 'joi';
import ms, { StringValue } from 'ms';

// Duración en el formato de jsonwebtoken: 8h, 7d, 15m...
const duracion = Joi.string().custom((value: string, helpers) =>
  typeof ms(value as StringValue) === 'number'
    ? value
    : helpers.error('any.invalid'),
);

/**
 * Variables de entorno validadas al arrancar. Si falta alguna obligatoria
 * o tiene un formato inválido, la aplicación no levanta.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  DATABASE_SSL: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: duracion.default('8h'),
  JWT_REFRESH_EXPIRES_IN: duracion.default('7d'),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(4).max(15).default(10),

  // Orígenes permitidos por CORS, separados por coma.
  CORS_ORIGIN: Joi.string().required(),

  // Administrador inicial que crea el seed (ST-06).
  ADMIN_USERNAME: Joi.string().optional(),
  ADMIN_PASSWORD: Joi.string().min(8).optional(),
});
