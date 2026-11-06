import { BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../../common/pipes/validation.pipe';
import { CrearLectorDto } from './crear-lector.dto';

describe('CrearLectorDto', () => {
  const pipe = createValidationPipe();
  const valido = {
    dni: '12345678',
    nombres: 'Ana',
    apellidos: 'Quispe',
    categoria: 'ESTUDIANTE',
    fechaNacimiento: '2000-05-10',
  };

  const erroresDe = async (body: Record<string, unknown>) => {
    const error: unknown = await pipe
      .transform(body, { type: 'body', metatype: CrearLectorDto })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    return (
      (error as BadRequestException).getResponse() as {
        errors: Record<string, string[]>;
      }
    ).errors;
  };

  it('acepta un lector completo y recorta espacios', async () => {
    await expect(
      pipe.transform(
        { ...valido, dni: ' 12345678 ', nombres: '  Ana  ' },
        { type: 'body', metatype: CrearLectorDto },
      ),
    ).resolves.toMatchObject({ dni: '12345678', nombres: 'Ana' });
  });

  it('señala cada campo obligatorio faltante', async () => {
    const errores = await erroresDe({});

    expect(Object.keys(errores).sort()).toEqual([
      'apellidos',
      'categoria',
      'dni',
      'fechaNacimiento',
      'nombres',
    ]);
    expect(errores.dni[0]).toBe('El DNI es obligatorio');
    expect(errores.categoria[0]).toBe('La categoría es obligatoria');
  });

  it('rechaza una categoría que no existe', async () => {
    const errores = await erroresDe({ ...valido, categoria: 'VISITANTE' });

    expect(Object.keys(errores)).toEqual(['categoria']);
  });

  it.each(['2000-02-30', '10/05/2000', '2000-5-1'])(
    'rechaza la fecha de nacimiento %p',
    async (fechaNacimiento) => {
      const errores = await erroresDe({ ...valido, fechaNacimiento });

      expect(Object.keys(errores)).toEqual(['fechaNacimiento']);
    },
  );

  it('rechaza un consentimiento que no sea booleano', async () => {
    const errores = await erroresDe({
      ...valido,
      consentimientoApoderado: 'si',
    });

    expect(Object.keys(errores)).toEqual(['consentimientoApoderado']);
  });
});
