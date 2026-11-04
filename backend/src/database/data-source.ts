import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './typeorm.config';

/** DataSource usado por el CLI de TypeORM (migration:generate/run/revert). */
export default new DataSource(buildDataSourceOptions(process.env));
