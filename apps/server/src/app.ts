/** Montagem do servidor HTTP: health check, arquivos do site e WebSocket da Arena. */
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { registrarArena } from './arena-ws.ts';

export interface OpcoesApp {
  /** Pasta com o build do site (apps/web/dist). Sem ela, só a API/WS sobe. */
  dirEstatico?: string;
  logger?: boolean;
}

export async function construirApp({ dirEstatico, logger = true }: OpcoesApp = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger, trustProxy: true });

  await app.register(fastifyWebsocket, { options: { maxPayload: 4096 } });
  registrarArena(app);

  app.get('/health', async () => ({ ok: true }));

  const temSite = !!dirEstatico && existsSync(join(dirEstatico, 'index.html'));
  if (temSite) {
    await app.register(fastifyStatic, {
      root: dirEstatico,
      setHeaders(res, caminho) {
        // Arquivos de /assets têm hash no nome: podem ficar em cache por 1 ano.
        const imutavel = /[\\/]assets[\\/]/.test(caminho);
        res.header('Cache-Control', imutavel ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    });
  }

  // SPA: rotas sem extensão (/arena, /slides/3...) devolvem o index.html.
  app.setNotFoundHandler((req, reply) => {
    const caminho = req.url.split('?')[0];
    if (temSite && req.method === 'GET' && extname(caminho) === '') {
      return reply.header('Cache-Control', 'no-cache').sendFile('index.html');
    }
    return reply.code(404).send({ erro: 'Não encontrado' });
  });

  return app;
}
