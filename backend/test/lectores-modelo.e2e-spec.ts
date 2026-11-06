import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import {
  CategoriaLector,
  Lector,
} from '../src/lectores/entities/lector.entity';
import { createTestApp } from './utils/create-test-app';

describe('Modelo de lectores (e2e, ST-20)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let repo: Repository<Lector>;
  const dni = `9${String(Date.now()).slice(-7)}`;

  const lector = {
    dni,
    nombres: 'Ana',
    apellidos: 'Quispe',
    categoria: CategoriaLector.ESTUDIANTE,
    fechaNacimiento: '2000-05-10',
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    repo = dataSource.getRepository(Lector);
  });

  afterAll(async () => {
    await repo.delete({ dni });
    await app.close();
  });

  it('HU-003 #3: la base de datos no admite dos lectores con el mismo DNI', async () => {
    await repo.insert(lector);

    await expect(repo.insert(lector)).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('un lector nuevo queda activo y sin datos de apoderado', async () => {
    const guardado = await repo.findOneByOrFail({ dni });

    expect(guardado).toMatchObject({
      activo: true,
      apoderadoDni: null,
      apoderadoNombre: null,
      consentimientoApoderado: false,
      creadoPor: null,
    });
  });

  it('la tabla guarda el DNI en 8 caracteres y la auditoría del responsable', async () => {
    const columnas: Array<{
      column_name: string;
      character_maximum_length: number | null;
    }> = await dataSource.query(
      `SELECT column_name, character_maximum_length FROM information_schema.columns WHERE table_name = 'lectores'`,
    );
    const porNombre = new Map(
      columnas.map((c) => [c.column_name, c.character_maximum_length]),
    );

    expect(porNombre.get('dni')).toBe(8);
    expect(porNombre.get('apoderado_dni')).toBe(8);
    expect([...porNombre.keys()]).toEqual(
      expect.arrayContaining(['creado_por', 'actualizado_por', 'creado_en']),
    );
  });
});
