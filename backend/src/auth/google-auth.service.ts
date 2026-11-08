import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { GOOGLE_AUTH_FALLO } from './auth.constants';

export interface GoogleUserPayload {
  googleId: string;
  email: string;
  nombre?: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly client: OAuth2Client;
  private readonly clientId?: string;

  constructor(config: ConfigService) {
    this.clientId = config.get<string>('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client(this.clientId);
  }

  async verificarToken(idToken: string): Promise<GoogleUserPayload> {
    if (!this.clientId) {
      throw new UnauthorizedException(
        'La autenticación con Google no está configurada en el servidor',
      );
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      const payload: TokenPayload | undefined = ticket.getPayload();

      if (!payload || !payload.email || !payload.sub) {
        throw new UnauthorizedException(GOOGLE_AUTH_FALLO);
      }

      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        nombre: payload.name,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(GOOGLE_AUTH_FALLO);
    }
  }
}
