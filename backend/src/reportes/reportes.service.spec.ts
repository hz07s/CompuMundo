import { Prestamo } from '../prestamos/entities/prestamo.entity';
import { VencidosService } from '../prestamos/vencidos.service';
import { diasEntre, ReportesService } from './reportes.service';

const ahora = new Date('2026-11-19T15:00:00Z'); // 10:00 en Lima

const prestamo = (
  codigo: string,
  fechaDevolucion: string,
  dni = '12345678',
): Prestamo =>
  ({
    fechaPrestamo: '2026-10-01',
    fechaDevolucion,
    lector: { nombres: 'Ana', apellidos: 'Quispe', dni },
    ejemplar: { codigo, obra: { titulo: `Obra ${codigo}` } },
    creador: { nombreUsuario: 'biblio1' },
  }) as unknown as Prestamo;

function crear(registros: Prestamo[]) {
  const marcar = jest.fn().mockResolvedValue(0);
  const find = jest.fn().mockResolvedValue(registros);
  const servicio = new ReportesService(
    { find } as never,
    { marcar } as unknown as VencidosService,
  );
  return { servicio, marcar, find };
}

describe('ReportesService.morosidad (HU-006, ST-34)', () => {
  it('HU-006 #1: marca los vencidos antes de consultar (RN-06b)', async () => {
    const { servicio, marcar, find } = crear([]);
    await servicio.morosidad(ahora);
    expect(marcar).toHaveBeenCalledWith(ahora);
    expect(marcar.mock.invocationCallOrder[0]).toBeLessThan(
      find.mock.invocationCallOrder[0],
    );
  });

  it('HU-006 #1: ordena por días de atraso, de mayor a menor, y calcula el atraso', async () => {
    const { servicio } = crear([
      prestamo('A', '2026-11-17'),
      prestamo('B', '2026-11-05'),
      prestamo('C', '2026-11-12'),
    ]);
    const r = await servicio.morosidad(ahora);
    expect(r.filas.map((f) => [f.codigoEjemplar, f.diasAtraso])).toEqual([
      ['B', 14],
      ['C', 7],
      ['A', 2],
    ]);
    expect(r.total).toBe(3);
    expect(r.filas[0]).toMatchObject({
      titulo: 'Obra B',
      lector: 'Ana Quispe',
      registradoPor: 'biblio1',
    });
  });

  it('HU-006 #4: el DNI sale siempre enmascarado', async () => {
    const { servicio } = crear([prestamo('A', '2026-11-10', '12345678')]);
    const r = await servicio.morosidad(ahora);
    expect(r.filas[0].dni).toBe('****5678');
    expect(JSON.stringify(r)).not.toContain('12345678');
  });

  it('HU-006 #5: sin vencidos devuelve total 0 y filas vacías', async () => {
    const { servicio } = crear([]);
    const r = await servicio.morosidad(ahora);
    expect(r).toMatchObject({ total: 0, filas: [] });
  });

  it('diasEntre cuenta días calendario', () => {
    expect(diasEntre('2026-11-05', '2026-11-19')).toBe(14);
    expect(diasEntre('2026-11-19', '2026-11-19')).toBe(0);
  });
});
