import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Muda quando a rota muda: limpa o erro ao navegar. */
  chave: string;
}

interface Estado {
  erro: Error | null;
  chave: string;
}

/**
 * Error boundary: se algum componente lançar durante a renderização, mostra
 * uma mensagem com opção de recarregar, em vez de deixar a tela em branco
 * no meio da apresentação.
 */
export class LimiteDeErro extends Component<Props, Estado> {
  state: Estado = { erro: null, chave: this.props.chave };

  static getDerivedStateFromError(erro: Error): Partial<Estado> {
    return { erro };
  }

  static getDerivedStateFromProps(props: Props, estado: Estado): Partial<Estado> | null {
    return props.chave !== estado.chave ? { erro: null, chave: props.chave } : null;
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <main className="pagina" role="alert">
        <h1>Algo deu errado nesta tela</h1>
        <p>
          O erro foi: <code>{this.state.erro.message}</code>
        </p>
        <p>
          <button type="button" onClick={() => this.setState({ erro: null })}>
            Tentar de novo
          </button>{' '}
          <button type="button" className="secundario" onClick={() => location.reload()}>
            Recarregar a página
          </button>
        </p>
      </main>
    );
  }
}
