import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EjemplarConsultaDto } from './dto/ejemplar-consulta.dto';
import { Ejemplar, EstadoEjemplar } from './entities/ejemplar.entity';

@Injectable()
export class EjemplaresService {
  constructor(
    @InjectRepository(Ejemplar)
    private readonly ejemplares: Repository<Ejemplar>,
  ) {}

  /** Ejemplar activo por código, con su obra y si se puede prestar. */
  async consultar(codigo: string): Promise<EjemplarConsultaDto> {
    const ejemplar = await this.ejemplares.findOne({
      where: { codigo: codigo.trim().toUpperCase(), activo: true },
      relations: { obra: true },
    });
    if (!ejemplar?.obra) throw new NotFoundException('Ejemplar no encontrado');

    return {
      id: ejemplar.id,
      codigo: ejemplar.codigo,
      estado: ejemplar.estado,
      disponible: ejemplar.estado === EstadoEjemplar.DISPONIBLE,
      obra: { id: ejemplar.obra.id, titulo: ejemplar.obra.titulo },
    };
  }
}
