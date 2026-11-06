import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { DataSource, QueryFailedError } from 'typeorm';
import { DiasHabilesService } from '../src/prestamos/dias-habiles.service';
import {
  EstadoPrestamo,
  Prestamo,
} from '../src/prestamos/entities/prestamo.entity';
import { createTestApp } from './utils/create-test-app';

describe('Modelo de préstamos (e2e, ST-27)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const marca = `e2e-prestamos-${Date.now()}`;
  const dni = `8${String(Date.now()).slice(-7)}`;
  let lectorId: string;
  let obraId: string;
  let ejemplarId: string;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    [{ id: lectorId }] = await dataSource.query(
      `INSERT INTO lectores (dni, nombres, apellidos, categoria, fecha_nacimiento)
       VALUES ($1, 'e2e', 'prestamos', 'ESTUDIANTE', '2000-01-01') RETURNING id`,
      [dni],
    );
    [{ id: obraId }] = await dataSource.query(
      `INSERT INTO obras (titulo, categoria, autores, fecha_publicacion, anio_edicion)
       VALUES ($1, 'e2e', '{e2e}', '2000-01-01', 2000) RETURNING id`,
      [marca],
    );
    [{ id: ejemplarId }] = await dataSource.query(
      `INSERT INTO ejemplares (obra_id, codigo) VALUES ($1, $2) RETURNING id`,
      [obraId, `E2E-${String(Date.now()).slice(-14)}`],
    );
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM prestamos WHERE lector_id = $1', [
      lectorId,
    ]);
    await dataSource.query('DELETE FROM ejemplares WHERE obra_id = $1', [
      obraId,
    ]);
    await dataSource.query('DELETE FROM obras WHERE id = $1', [obraId]);
    await dataSource.query('DELETE FROM lectores WHERE id = $1', [lectorId]);
    await app.close();
  });

  it('un préstamo nuevo queda Vigente, sin devolución ni justificación', async () => {
    const repo = dataSource.getRepository(Prestamo);
    const fechaDevolucion = app.get(DiasHabilesService).sumar('2026-11-09');

    const { id } = await repo.save(
      repo.create({
        lectorId,
        ejemplarId,
        fechaPrestamo: '2026-11-09',
        fechaDevolucion,
      }),
    );

    const guardado = await repo.findOneByOrFail({ id });
    expect(guardado).toMatchObject({
      estado: EstadoPrestamo.VIGENTE,
      fechaDevolucion: '2026-11-12',
      fechaDevuelto: null,
      justificacion: null,
      creadoPor: null,
    });
    expect(guardado.creadoEn).toBeInstanceOf(Date);
  });

  it('no admite un lector o ejemplar inexistente (clave foránea)', async () => {
    const repo = dataSource.getRepository(Prestamo);

    await expect(
      repo.insert({
        lectorId: '00000000-0000-4000-8000-000000000000',
        ejemplarId,
        fechaPrestamo: '2026-11-09',
        fechaDevolucion: '2026-11-12',
      }),
    ).rejects.toBeInstanceOf(QueryFailedError);
    await expect(
      repo.insert({
        lectorId,
        ejemplarId: '00000000-0000-4000-8000-000000000000',
        fechaPrestamo: '2026-11-09',
        fechaDevolucion: '2026-11-12',
      }),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('solo admite los estados Vigente, Vencido y Devuelto', async () => {
    const repo = dataSource.getRepository(Prestamo);

    await expect(
      dataSource.query(
        `INSERT INTO prestamos (lector_id, ejemplar_id, fecha_prestamo, fecha_devolucion, estado)
         VALUES ($1, $2, '2026-11-09', '2026-11-12', 'PERDIDO')`,
        [lectorId, ejemplarId],
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);
    expect(Object.values(EstadoPrestamo)).toEqual([
      'VIGENTE',
      'VENCIDO',
      'DEVUELTO',
    ]);
    expect(repo.metadata.tableName).toBe('prestamos');
  });

  it('la fecha de devolución se calcula con el servicio de días hábiles del módulo', () => {
    expect(app.get(DiasHabilesService).sumar('2026-11-06')).toBe('2026-11-11');
  });
});
