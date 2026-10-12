import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function mockHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/obras', method: 'POST' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('conserva el estado y el mensaje de una HttpException', () => {
    const { host, status, json } = mockHost();

    filter.catch(new NotFoundException('Obra no encontrada'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Obra no encontrada',
        path: '/obras',
      }),
    );
  });

  it('propaga los errores por campo de validación', () => {
    const { host, json } = mockHost();
    const errors = { titulo: ['titulo should not be empty'] };

    filter.catch(
      new BadRequestException({ message: 'Datos inválidos', errors }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, errors }),
    );
  });

  it('responde 500 genérico ante un error no controlado', () => {
    const { host, status, json } = mockHost();
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);

    filter.catch(new Error('detalle interno'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Error interno del servidor' }),
    );
  });
});
