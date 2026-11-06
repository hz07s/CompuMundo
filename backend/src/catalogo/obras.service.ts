import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CodigoEjemplarService } from './codigo-ejemplar.service';
import { CantidadEjemplaresDto, CrearObraDto } from './dto/crear-obra.dto';
import {
  ObraDetalleDto,
  ObraResumenDto,
  ObrasPaginadasDto,
} from './dto/obra-response.dto';
import { Ejemplar, EstadoEjemplar } from './entities/ejemplar.entity';
import { Obra } from './entities/obra.entity';

interface Conteo {
  total: number;
  disponibles: number;
}

@Injectable()
export class ObrasService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Obra) private readonly obras: Repository<Obra>,
    @InjectRepository(Ejemplar)
    private readonly ejemplares: Repository<Ejemplar>,
    private readonly codigos: CodigoEjemplarService,
  ) {}

  /** HU-002 #1: crea la obra y sus N ejemplares en una sola transacción. */
  async crear(
    dto: CrearObraDto,
    usuario: UsuarioAutenticado,
  ): Promise<ObraDetalleDto> {
    const id = await this.dataSource.transaction(async (manager) => {
      const { titulo, categoria, autores, fechaPublicacion, anioEdicion } = dto;
      const obra = await manager.save(
        manager.create(Obra, {
          titulo,
          categoria,
          autores,
          fechaPublicacion,
          volumen: dto.volumen ?? null,
          anioEdicion,
          creadoPor: usuario.id,
          actualizadoPor: usuario.id,
        }),
      );
      await this.crearEjemplares(manager, obra.id, dto.cantidad, usuario.id);
      return obra.id;
    });
    return this.detalle(id);
  }

  /** Agrega ejemplares a una obra existente y activa. */
  async agregarEjemplares(
    obraId: string,
    { cantidad }: CantidadEjemplaresDto,
    usuario: UsuarioAutenticado,
  ): Promise<ObraDetalleDto> {
    await this.dataSource.transaction(async (manager) => {
      const existe = await manager.existsBy(Obra, { id: obraId, activo: true });
      if (!existe) throw new NotFoundException('Obra no encontrada');
      await this.crearEjemplares(manager, obraId, cantidad, usuario.id);
      await manager.update(Obra, obraId, { actualizadoPor: usuario.id });
    });
    return this.detalle(obraId);
  }

  async listar({
    page,
    limit,
    skip,
  }: PaginationQueryDto): Promise<ObrasPaginadasDto> {
    const [obras, total] = await this.obras.findAndCount({
      where: { activo: true },
      order: { creadoEn: 'DESC', id: 'ASC' },
      skip,
      take: limit,
    });
    const conteos = await this.contarEjemplares(obras.map((o) => o.id));
    return {
      data: obras.map((obra) => this.aResumen(obra, conteos.get(obra.id))),
      total,
      page,
      limit,
    };
  }

  async detalle(id: string): Promise<ObraDetalleDto> {
    const obra = await this.obras.findOneBy({ id, activo: true });
    if (!obra) throw new NotFoundException('Obra no encontrada');

    const [conteos, ejemplares] = await Promise.all([
      this.contarEjemplares([id]),
      this.ejemplares.find({
        where: { obraId: id, activo: true },
        order: { codigo: 'ASC' },
      }),
    ]);
    return {
      ...this.aResumen(obra, conteos.get(id)),
      ejemplares: ejemplares.map(({ id, codigo, estado }) => ({
        id,
        codigo,
        estado,
      })),
    };
  }

  private async crearEjemplares(
    manager: EntityManager,
    obraId: string,
    cantidad: number,
    usuarioId: string,
  ): Promise<void> {
    const codigos = await this.codigos.reservar(manager, cantidad);
    await manager.insert(
      Ejemplar,
      codigos.map((codigo) => ({
        obraId,
        codigo,
        creadoPor: usuarioId,
        actualizadoPor: usuarioId,
      })),
    );
  }

  /** Ejemplares activos y disponibles por obra. La disponibilidad no se guarda: se cuenta. */
  private async contarEjemplares(
    obraIds: string[],
  ): Promise<Map<string, Conteo>> {
    if (!obraIds.length) return new Map();

    const filas = await this.ejemplares
      .createQueryBuilder('e')
      .select('e.obra_id', 'obraId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'COUNT(*) FILTER (WHERE e.estado = :disponible)',
        'disponibles',
      )
      .where({ obraId: In(obraIds), activo: true })
      .setParameter('disponible', EstadoEjemplar.DISPONIBLE)
      .groupBy('e.obra_id')
      .getRawMany<{ obraId: string; total: string; disponibles: string }>();

    return new Map(
      filas.map((f) => [
        f.obraId,
        { total: Number(f.total), disponibles: Number(f.disponibles) },
      ]),
    );
  }

  private aResumen(obra: Obra, conteo?: Conteo): ObraResumenDto {
    return {
      id: obra.id,
      titulo: obra.titulo,
      categoria: obra.categoria,
      autores: obra.autores,
      fechaPublicacion: obra.fechaPublicacion,
      volumen: obra.volumen,
      anioEdicion: obra.anioEdicion,
      totalEjemplares: conteo?.total ?? 0,
      disponibilidad: conteo?.disponibles ?? 0,
      creadoEn: obra.creadoEn,
    };
  }
}
