import { ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service';

describe('PasswordService (HU-001 #4)', () => {
  const service = new PasswordService(
    new ConfigService({ BCRYPT_SALT_ROUNDS: 4 }),
  );

  it('HU-001 #4: el hash difiere de la contraseña en texto plano', async () => {
    const hash = await service.hash('clave-secreta');

    expect(hash).not.toBe('clave-secreta');
    expect(hash).toMatch(/^\$2[aby]\$04\$/);
  });

  it('HU-001 #4: la comparación acierta con la clave correcta y falla con otra', async () => {
    const hash = await service.hash('clave-secreta');

    await expect(service.compare('clave-secreta', hash)).resolves.toBe(true);
    await expect(service.compare('otra-clave', hash)).resolves.toBe(false);
  });

  it('HU-001 #4: dos hashes de la misma clave son distintos (sal aleatoria)', async () => {
    const [a, b] = await Promise.all([
      service.hash('clave-secreta'),
      service.hash('clave-secreta'),
    ]);

    expect(a).not.toBe(b);
  });

  it('usa 10 rondas si BCRYPT_SALT_ROUNDS no está definido', async () => {
    const porDefecto = new PasswordService(new ConfigService({}));

    await expect(porDefecto.hash('x')).resolves.toMatch(/^\$2[aby]\$10\$/);
  });
});
