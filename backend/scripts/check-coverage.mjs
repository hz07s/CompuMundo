// Umbrales de cobertura por carpeta (ST-03). Jest ya exige 70 % global;
// este script exige más en el código crítico. A diferencia de los umbrales
// por ruta de Jest, no falla mientras la carpeta aún no tenga código.
import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const THRESHOLDS = {
  'src/auth': 85,
};
const METRICS = ['lines', 'branches', 'functions', 'statements'];

const summaryPath = resolve('coverage/coverage-summary.json');
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const files = Object.entries(summary)
  .filter(([file]) => file !== 'total')
  .map(([file, data]) => [relative(process.cwd(), file).split(sep).join('/'), data]);

let failed = false;

for (const [folder, min] of Object.entries(THRESHOLDS)) {
  const inFolder = files.filter(([file]) => file.startsWith(`${folder}/`));
  if (inFolder.length === 0) {
    console.log(`- ${folder}: sin código cubierto todavía, se omite`);
    continue;
  }

  for (const metric of METRICS) {
    const total = inFolder.reduce((n, [, d]) => n + d[metric].total, 0);
    const covered = inFolder.reduce((n, [, d]) => n + d[metric].covered, 0);
    const pct = total === 0 ? 100 : (covered / total) * 100;
    const ok = pct >= min;
    failed ||= !ok;
    console.log(
      `${ok ? '✔' : '✘'} ${folder} ${metric}: ${pct.toFixed(2)} % (mínimo ${min} %)`,
    );
  }
}

if (failed) {
  console.error('\nCobertura por debajo del umbral en código crítico.');
  process.exit(1);
}
