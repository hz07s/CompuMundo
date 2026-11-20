import 'dotenv/config';
import { asegurarBdDePruebas, urlDePruebas } from './utils/bd-de-pruebas';

/** Una vez antes de todos los e2e: la BD de pruebas existe (D-06). */
export default async function globalSetup(): Promise<void> {
  await asegurarBdDePruebas(urlDePruebas());
}
