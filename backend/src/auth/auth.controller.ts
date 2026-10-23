import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH } from './auth.constants';
import { AuthService } from './auth.service';
import type { SesionEmitida, UsuarioAutenticado } from './auth.types';
import { Public } from './decorators/public.decorator';
import { UsuarioActual } from './decorators/usuario-actual.decorator';
import { LoginDto } from './dto/login.dto';
import { SesionResponseDto, UsuarioSesionDto } from './dto/sesion-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieBase: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    const produccion = config.get<string>('NODE_ENV') === 'production';
    this.cookieBase = {
      httpOnly: true,
      // En producción el frontend (Vercel) y la API (Railway) están en dominios distintos.
      secure: produccion,
      sameSite: produccion ? 'none' : 'lax',
      path: REFRESH_COOKIE_PATH,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Devuelve el access token (8 h) y deja el refresh token (7 días) en una cookie httpOnly.',
  })
  @ApiOkResponse({ type: SesionResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Credenciales incorrectas o usuario inactivo',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SesionResponseDto> {
    const sesion = await this.auth.login(dto.nombreUsuario, dto.password);
    return this.responder(sesion, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({
    summary: 'Renovar la sesión',
    description:
      'Emite un nuevo access token y rota el refresh token de la cookie.',
  })
  @ApiOkResponse({ type: SesionResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Refresh token ausente, vencido o revocado',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SesionResponseDto> {
    const sesion = await this.auth.refresh(this.leerCookie(req));
    return this.responder(sesion, res);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Revoca el refresh token y borra la cookie.',
  })
  @ApiNoContentResponse()
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(this.leerCookie(req));
    res.clearCookie(REFRESH_COOKIE, this.cookieBase);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Usuario de la sesión actual' })
  @ApiOkResponse({ type: UsuarioSesionDto })
  @ApiUnauthorizedResponse({ description: 'Sin token o token vencido' })
  me(@UsuarioActual() usuario: UsuarioAutenticado): UsuarioSesionDto {
    return usuario;
  }

  private responder(sesion: SesionEmitida, res: Response): SesionResponseDto {
    res.cookie(REFRESH_COOKIE, sesion.refreshToken, {
      ...this.cookieBase,
      expires: sesion.refreshExpiraEn,
    });
    const { accessToken, expiresIn, usuario } = sesion;
    return { accessToken, expiresIn, usuario };
  }

  private leerCookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[REFRESH_COOKIE];
  }
}
