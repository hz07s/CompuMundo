import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { createValidationPipe } from './pipes/validation.pipe';

/**
 * Piezas transversales. El filtro y el pipe se registran como providers
 * globales para que también apliquen en las pruebas e2e.
 */
@Global()
@Module({
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
})
export class CommonModule {}
