/** Endereço público do site (usado nos QR codes). Configurável no build. */
export const URL_PUBLICA: string = (import.meta.env.VITE_PUBLIC_URL as string | undefined) ?? 'https://regex-js.tccodes.com.br';

export const URL_REPOSITORIO = 'https://github.com/ThiagoCCarmona/regex-js';

/** Endereço do WebSocket da Arena no mesmo host que serviu a página. */
export function urlWebSocket(): string {
  const protocolo = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocolo}//${location.host}/ws`;
}
