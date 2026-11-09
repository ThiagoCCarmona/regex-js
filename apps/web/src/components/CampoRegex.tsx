import { useRef } from 'react';
import { navegarHistorico, NAVEGACAO_INICIAL, type Navegacao } from '../lib/historico.ts';

interface Props {
  padrao: string;
  flags?: string;
  aoMudarPadrao?: (v: string) => void;
  aoMudarFlags?: (v: string) => void;
  erro?: string | null;
  rotulo?: string;
  autoFocus?: boolean;
  aoEnviar?: () => void;
  placeholder?: string;
  /** Regex já enviadas (mais antiga primeiro): ↑ e ↓ navegam nelas, como no CMD. */
  historico?: string[];
}

/** Campo no formato literal /padrão/flags, com mensagem de erro de sintaxe. */
export function CampoRegex({ padrao, flags = '', aoMudarPadrao, aoMudarFlags, erro, rotulo = 'Regex', autoFocus, aoEnviar, placeholder, historico }: Props) {
  const nav = useRef<Navegacao>(NAVEGACAO_INICIAL);
  const entrada = useRef<HTMLInputElement>(null);

  return (
    <div className={`campo-regex${erro ? ' com-erro' : ''}`}>
      <label>
        <span className="rotulo">{rotulo}</span>
        <span className="literal">
          <span className="barra" aria-hidden="true">/</span>
          <input
            ref={entrada}
            className="entrada-padrao"
            value={padrao}
            onChange={(e) => {
              nav.current = NAVEGACAO_INICIAL; // digitou: sai do modo histórico
              aoMudarPadrao?.(e.target.value);
            }}
            readOnly={!aoMudarPadrao}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            autoFocus={autoFocus}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && aoEnviar) {
                e.preventDefault();
                nav.current = NAVEGACAO_INICIAL;
                aoEnviar();
                return;
              }
              if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && historico?.length && aoMudarPadrao) {
                e.preventDefault();
                const r = navegarHistorico(historico, nav.current, padrao, e.key === 'ArrowUp' ? 'cima' : 'baixo');
                nav.current = r.nav;
                aoMudarPadrao(r.valor);
                // Cursor no fim, como no terminal.
                requestAnimationFrame(() => entrada.current?.setSelectionRange(r.valor.length, r.valor.length));
              }
            }}
            aria-invalid={!!erro}
            aria-label={rotulo}
          />
          <span className="barra" aria-hidden="true">/</span>
          {aoMudarFlags ? (
            <input
              className="entrada-flags"
              value={flags}
              onChange={(e) => aoMudarFlags(e.target.value.replace(/[^dgimsuvy]/g, ''))}
              aria-label="Flags"
              spellCheck={false}
              size={4}
            />
          ) : (
            <span className="flags-fixas">{flags}</span>
          )}
        </span>
      </label>
      {erro && (
        <p className="erro-regex" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
