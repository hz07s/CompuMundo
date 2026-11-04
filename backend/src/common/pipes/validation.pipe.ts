import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

/**
 * Aplana los errores de class-validator a { campo: [mensajes] }, en el orden
 * en que están declarados los decoradores (class-validator los da al revés).
 * Declarando primero el "es obligatorio", el cliente puede mostrar mensajes[0].
 */
export function toFieldErrors(
  validationErrors: ValidationError[],
  parent = '',
): Record<string, string[]> {
  return validationErrors.reduce<Record<string, string[]>>((acc, err) => {
    const field = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) acc[field] = Object.values(err.constraints).reverse();
    if (err.children?.length) {
      Object.assign(acc, toFieldErrors(err.children, field));
    }
    return acc;
  }, {});
}

/**
 * ValidationPipe global: descarta propiedades no declaradas en el DTO,
 * convierte tipos y responde 400 con los mensajes agrupados por campo.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException({
        error: 'Bad Request',
        message: 'Datos inválidos',
        errors: toFieldErrors(errors),
      }),
  });
}
