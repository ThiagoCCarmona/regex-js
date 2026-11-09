/** Ponto de entrada: `node src/main.ts` (Node 24 executa TypeScript nativamente). */
import { fileURLToPath } from 'node:url';
import { construirApp } from './app.ts';
import { encerrarAvaliador } from './avaliador.ts';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
const DIR_ESTATICO = process.env.DIR_ESTATICO ?? fileURLToPath(new URL('../../web/dist', import.meta.url));

const app = await construirApp({ dirEstatico: DIR_ESTATICO });

async function desligar(sinal: string) {
  app.log.info(`${sinal} recebido, encerrando...`);
  await app.close();
  await encerrarAvaliador();
  process.exit(0);
}
process.on('SIGINT', () => void desligar('SIGINT'));
process.on('SIGTERM', () => void desligar('SIGTERM'));

await app.listen({ port: PORT, host: HOST });
