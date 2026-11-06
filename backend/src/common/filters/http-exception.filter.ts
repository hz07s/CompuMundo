import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { enmascararDnisEnTexto } from '../utils/dni';

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  /** Errores de validación por campo: { titulo: ['...'] }. */
  errors?: Record<string, string[]>;
  path: string;
  timestamp: string;
}

/**
 * Da a todos los errores de la API la misma forma. Los errores no
 * controlados se registran y se responden como 500 sin filtrar detalles.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Error interno del servidor',
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      body.statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        body.message = res;
        body.error = exception.name;
      } else {
        const { message, error, errors } = res as Partial<ErrorResponse>;
        body.message = message ?? exception.message;
        body.error = error ?? exception.name;
        if (errors) body.errors = errors;
      }
    } else {
      // RNF-02: ningún DNI completo se escribe en los logs (URL, mensaje de BD, stack).
      this.logger.error(
        enmascararDnisEnTexto(`${request.method} ${request.url}`),
        enmascararDnisEnTexto(
          exception instanceof Error
            ? (exception.stack ?? exception.message)
            : String(exception),
        ),
      );
    }

    response.status(body.statusCode).json(body);
  }
}
