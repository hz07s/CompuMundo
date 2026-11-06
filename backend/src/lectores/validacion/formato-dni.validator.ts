import { Injectable } from '@nestjs/common';
import { IDniValidator } from './dni-validator.interface';

/** Implementación de la Release 1: solo comprueba el formato, sin servicios externos (ADR-011). */
@Injectable()
export class FormatoDniValidator implements IDniValidator {
  private static readonly FORMATO = /^\d{8}$/;

  validar(dni: string): Promise<boolean> {
    return Promise.resolve(
      typeof dni === 'string' && FormatoDniValidator.FORMATO.test(dni),
    );
  }
}
