import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ObrasController } from './obras.controller';
import { ObrasService } from './obras.service';

describe('ObrasController', () => {
  const obras = {
    crear: jest.fn().mockResolvedValue('creada'),
    agregarEjemplares: jest.fn().mockResolvedValue('agregados'),
    listar: jest.fn().mockResolvedValue('lista'),
    detalle: jest.fn().mockResolvedValue('detalle'),
  };
  const controller = new ObrasController(obras as unknown as ObrasService);

  it('delega cada endpoint en ObrasService', async () => {
    const dto = {
      titulo: 'T',
      categoria: 'C',
      autores: ['A'],
      fechaPublicacion: '2020-01-01',
      cantidad: 1,
    };
    const query = new PaginationQueryDto();

    await expect(controller.crear(dto)).resolves.toBe('creada');
    await expect(
      controller.agregarEjemplares('o-1', { cantidad: 2 }),
    ).resolves.toBe('agregados');
    await expect(controller.listar(query)).resolves.toBe('lista');
    await expect(controller.detalle('o-1')).resolves.toBe('detalle');

    expect(obras.crear).toHaveBeenCalledWith(dto);
    expect(obras.agregarEjemplares).toHaveBeenCalledWith('o-1', 2);
    expect(obras.listar).toHaveBeenCalledWith(query);
    expect(obras.detalle).toHaveBeenCalledWith('o-1');
  });
});
