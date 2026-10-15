import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

/**
 * Único punto donde se hashean y comparan contraseñas (RNF-01).
 * El factor de costo viene de BCRYPT_SALT_ROUNDS.
 */
@Injectable()
export class PasswordService {
  private readonly rounds: number;

  constructor(config: ConfigService) {
    this.rounds = config.get<number>('BCRYPT_SALT_ROUNDS', 10);
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
