import { ConflictException, INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { DataSource, QueryFailedError } from 'typeorm';
import {
  EstadoPrestamo,
  Prestamo,
} from '../src/prestamos/entities/prestamo.entity';
import { ReglasPrestamoService } from '../src/prestamos/reglas-prestamo.service';
import { createTestApp } from './utils/create-test-app';

/** RN-08 · Máximo un préstamo Vigente o Vencido por lector (ST-28). */
describe('RN-08 Un préstamo activo por lector (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let reglas: ReglasPrestamoService;
  const base = Number(String(Date.now()).slice(-6)) * 10;
  const lectores: string[] = [];
  let obraId: string;
  const ejemplares: string[] = [];

  const nuevoLector = async () => {
    const dni = `6${String(base + lectores.length).padStart(7, '0')}`;
    const [{ id }]: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO lectores (dni, nombres, apellidos, categoria, fecha_nacimiento)
       VALUES ($1, 'e2e', 'rn08', 'DOCENTE', '1990-01-01') RETURNING id`,
      [dni],
    );
    lectores.push(id);
    return id;
  };
  const nuevoEjemplar = async () => {
    const [{ id }]: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO ejemplares (obra_id, codigo) VALUES ($1, $2) RETURNING id`,
      [obraId, `R8-${base}-${ejemplares.length}`.slice(0, 20)],
    );
    ejemplares.push(id);
    return id;
  };
  const prestar = async (
    lectorId: string,
    estado: EstadoPrestamo = EstadoPrestamo.VIGENTE,
    ejemplarId?: string,
  ) =>
    dataSource.getRepository(Prestamo).insert({
      lectorId,
      ejemplarId: ejemplarId ?? (await nuevoEjemplar()),
      fechaPrestamo: '2026-11-09',
      fechaDevolucion: '2026-11-12',
      estado,
    });

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    reglas = app.get(ReglasPrestamoService);
    [{ id: obraId }] = await dataSource.query(
      `INSERT INTO obras (titulo, categoria, autores, fecha_publicacion, anio_edicion)
       VALUES ('e2e rn08', 'e2e', '{e2e}', '2000-01-01', 2000) RETURNING id`,
    );
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM prestamos WHERE lector_id = ANY($1)', [
      lectores,
    ]);
    await dataSource.query('DELETE FROM ejemplares WHERE obra_id = $1', [
      obraId,
    ]);
    await dataSource.query('DELETE FROM obras WHERE id = $1', [obraId]);
    await dataSource.query('DELETE FROM lectores WHERE id = ANY($1)', [
      lectores,
    ]);
    await app.close();
  });

  it('HU-004 #4: un lector sin préstamos puede recibir uno', async () => {
    const lector = await nuevoLector();

    await expect(
      reglas.validarSinPrestamoActivo(lector),
    ).resolves.toBeUndefined();
  });

  it.each([EstadoPrestamo.VIGENTE, EstadoPrestamo.VENCIDO])(
    'HU-004 #4: un lector con un préstamo %s no puede recibir otro (409)',
    async (estado) => {
      const lector = await nuevoLector();
      await prestar(lector, estado);

      await expect(reglas.validarSinPrestamoActivo(lector)).rejects.toThrow(
        ConflictException,
      );
    },
  );

  it('un préstamo Devuelto no impide uno nuevo', async () => {
    const lector = await nuevoLector();
    await prestar(lector, EstadoPrestamo.DEVUELTO);

    await expect(
      reglas.validarSinPrestamoActivo(lector),
    ).resolves.toBeUndefined();
  });

  it('el impedimento es por lector: otro lector no se ve afectado', async () => {
    const ocupado = await nuevoLector();
    const libre = await nuevoLector();
    await prestar(ocupado);

    await expect(
      reglas.validarSinPrestamoActivo(libre),
    ).resolves.toBeUndefined();
  });

  it('la validación funciona dentro de una transacción', async () => {
    const lector = await nuevoLector();
    await prestar(lector);

    await expect(
      dataSource.transaction((manager) =>
        reglas.validarSinPrestamoActivo(lector, manager),
      ),
    ).rejects.toThrow(ConflictException);
  });

  describe('garantía de la base de datos (registros simultáneos)', () => {
    it('la base rechaza un segundo préstamo activo del mismo lector', async () => {
      const lector = await nuevoLector();
      await prestar(lector);

      await expect(prestar(lector)).rejects.toBeInstanceOf(QueryFailedError);
    });

    it('un Vencido tampoco admite otro Vigente para el mismo lector', async () => {
      const lector = await nuevoLector();
      await prestar(lector, EstadoPrestamo.VENCIDO);

      await expect(prestar(lector)).rejects.toBeInstanceOf(QueryFailedError);
    });

    it('permite varios préstamos Devueltos y uno activo del mismo lector', async () => {
      const lector = await nuevoLector();
      await prestar(lector, EstadoPrestamo.DEVUELTO);
      await prestar(lector, EstadoPrestamo.DEVUELTO);

      await expect(prestar(lector)).resolves.toBeDefined();
    });

    it('dos altas simultáneas dejan un solo préstamo activo y la otra responde 409', async () => {
      const lector = await nuevoLector();

      // Cada intento usa su propio ejemplar: solo puede chocar la regla RN-08.
      const [e1, e2] = [await nuevoEjemplar(), await nuevoEjemplar()];

      const resultados = await Promise.allSettled([
        prestar(lector, EstadoPrestamo.VIGENTE, e1).catch((e: unknown) =>
          reglas.traducirErrorDeInsercion(e),
        ),
        prestar(lector, EstadoPrestamo.VIGENTE, e2).catch((e: unknown) =>
          reglas.traducirErrorDeInsercion(e),
        ),
      ]);

      const rechazos = resultados.filter((r) => r.status === 'rejected');
      expect(rechazos).toHaveLength(1);
      expect(rechazos[0].reason).toBeInstanceOf(ConflictException);
    });
  });
});
