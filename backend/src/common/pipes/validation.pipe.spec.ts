import { BadRequestException } from '@nestjs/common';
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { createValidationPipe } from './validation.pipe';

class EjemploDto {
  @IsNotEmpty()
  titulo!: string;

  @IsInt()
  @IsPositive()
  cantidad!: number;
}

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();
  const metadata = { type: 'body' as const, metatype: EjemploDto };

  it('agrupa los errores por campo', async () => {
    const error: unknown = await pipe
      .transform({ cantidad: 0 }, metadata)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    const body = (error as BadRequestException).getResponse() as {
      errors: Record<string, string[]>;
    };
    expect(Object.keys(body.errors).sort()).toEqual(['cantidad', 'titulo']);
  });

  it('rechaza propiedades no declaradas en el DTO', async () => {
    const error: unknown = await pipe
      .transform({ titulo: 'x', cantidad: 1, extra: true }, metadata)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('deja pasar un cuerpo válido', async () => {
    await expect(
      pipe.transform({ titulo: 'Álgebra', cantidad: 3 }, metadata),
    ).resolves.toEqual({ titulo: 'Álgebra', cantidad: 3 });
  });
});
