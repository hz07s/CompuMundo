import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthService } from './google-auth.service';

describe('GoogleAuthService', () => {
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;
  });

  it('lanza UnauthorizedException si GOOGLE_CLIENT_ID no está configurado', async () => {
    configService.get.mockReturnValue(undefined);
    const service = new GoogleAuthService(configService);

    await expect(service.verificarToken('token-falso')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('verifica el token exitosamente y retorna el usuario', async () => {
    configService.get.mockReturnValue('client-id-test');
    const service = new GoogleAuthService(configService);

    const mockPayload = {
      sub: 'google-12345',
      email: 'test@cedis.edu.pe',
      name: 'Bibliotecario Test',
    };

    (service as unknown as { client: { verifyIdToken: jest.Mock } }).client = {
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => mockPayload,
      }),
    };

    const resultado = await service.verificarToken('valid-token');

    expect(resultado).toEqual({
      googleId: 'google-12345',
      email: 'test@cedis.edu.pe',
      nombre: 'Bibliotecario Test',
    });
  });

  it('rechaza si el payload no contiene email o sub', async () => {
    configService.get.mockReturnValue('client-id-test');
    const service = new GoogleAuthService(configService);

    (service as unknown as { client: { verifyIdToken: jest.Mock } }).client = {
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({ name: 'Sin Email' }),
      }),
    };

    await expect(service.verificarToken('token-incompleto')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza con UnauthorizedException si verifyIdToken falla', async () => {
    configService.get.mockReturnValue('client-id-test');
    const service = new GoogleAuthService(configService);

    (service as unknown as { client: { verifyIdToken: jest.Mock } }).client = {
      verifyIdToken: jest.fn().mockRejectedValue(new Error('Token expirado')),
    };

    await expect(service.verificarToken('token-expirado')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
