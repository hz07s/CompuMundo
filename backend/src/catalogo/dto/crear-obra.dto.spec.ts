import { BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../../common/pipes/validation.pipe';
import { CantidadEjemplaresDto, CrearObraDto } from './crear-obra.dto';

describe('CrearObraDto', () => {
  const pipe = createValidationPipe();
  const valido = {
    titulo: 'Cálculo diferencial',
    categoria: 'Matemáticas',
    autores: ['James Stewart'],
    fechaPublicacion: '2012-01-15',
    cantidad: 3,
  };

  const erroresDe = async (
    body: Record<string, unknown>,
    metatype: new () => object = CrearObraDto,
  ) => {
    const error: unknown = await pipe
      .transform(body, { type: 'body', metatype })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    return (
      (error as BadRequestException).getResponse() as {
        errors: Record<string, string[]>;
      }
    ).errors;
  };

  it('acepta una obra completa y recorta espacios', async () => {
    await expect(
      pipe.transform(
        { ...valido, titulo: '  Cálculo  ', autores: [' Stewart '] },
        { type: 'body', metatype: CrearObraDto },
      ),
    ).resolves.toMatchObject({ titulo: 'Cálculo', autores: ['Stewart'] });
  });

  it('HU-002 #2: indica cada campo faltante y el primer mensaje es "obligatorio"', async () => {
    const errores = await erroresDe({ cantidad: 1 });

    expect(Object.keys(errores).sort()).toEqual([
      'autores',
      'categoria',
      'fechaPublicacion',
      'titulo',
    ]);
    expect(errores.titulo[0]).toBe('El título es obligatorio');
    expect(errores.categoria[0]).toBe('La categoría es obligatoria');
    expect(errores.autores[0]).toBe('Indique al menos un autor');
    expect(errores.fechaPublicacion[0]).toBe(
      'La fecha de publicación es obligatoria',
    );
  });

  it('HU-002 #2: un título de solo espacios cuenta como faltante', async () => {
    const errores = await erroresDe({ ...valido, titulo: '   ' });

    expect(errores.titulo[0]).toBe('El título es obligatorio');
  });

  it.each([
    [0, 'La cantidad debe ser mayor que 0'],
    [-2, 'La cantidad debe ser mayor que 0'],
    [1.5, 'La cantidad debe ser un número entero'],
    ['3', 'La cantidad debe ser un número entero'],
    [501, 'La cantidad no puede superar 500 por registro'],
  ])(
    'HU-002 #3: rechaza la cantidad %p en el campo cantidad',
    async (cantidad, msg) => {
      const errores = await erroresDe({ ...valido, cantidad });

      expect(Object.keys(errores)).toEqual(['cantidad']);
      expect(errores.cantidad[0]).toBe(msg);
    },
  );

  it.each(['2020-02-30', '15/01/2012', '2012-1-5'])(
    'rechaza la fecha %p',
    async (fechaPublicacion) => {
      const errores = await erroresDe({ ...valido, fechaPublicacion });

      expect(Object.keys(errores)).toEqual(['fechaPublicacion']);
    },
  );

  it('agregar ejemplares exige solo una cantidad válida', async () => {
    const errores = await erroresDe({}, CantidadEjemplaresDto);

    expect(errores.cantidad[0]).toBe('La cantidad es obligatoria');
  });
});
