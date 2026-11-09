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
}

/** Campo no formato literal /padrão/flags, com mensagem de erro de sintaxe. */
export function CampoRegex({ padrao, flags = '', aoMudarPadrao, aoMudarFlags, erro, rotulo = 'Regex', autoFocus, aoEnviar, placeholder }: Props) {
  return (
    <div className={`campo-regex${erro ? ' com-erro' : ''}`}>
      <label>
        <span className="rotulo">{rotulo}</span>
        <span className="literal">
          <span className="barra" aria-hidden="true">/</span>
          <input
            className="entrada-padrao"
            value={padrao}
            onChange={(e) => aoMudarPadrao?.(e.target.value)}
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
                aoEnviar();
              }
            }}
            aria-invalid={!!erro}
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
