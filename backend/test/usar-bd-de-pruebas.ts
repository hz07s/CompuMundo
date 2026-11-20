import 'dotenv/config';
import { urlDePruebas } from './utils/bd-de-pruebas';

// Antes de importar AppModule: la app y las migraciones usan la BD de pruebas (D-06).
process.env.DATABASE_URL = urlDePruebas();
