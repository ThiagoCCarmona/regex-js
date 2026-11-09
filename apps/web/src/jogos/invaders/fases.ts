/** Fases do Regex Invaders, uma por tema do laboratório. */
export interface Fase {
  nome: string;
  etapa: number;
  objetivo: string;
  dica: string;
  /** Devem ser atingidas (casar com a regex). */
  inimigas: string[];
  /** Não podem ser atingidas. */
  aliadas: string[];
  /** Uma regex que vence a fase (mostrada ao perder). */
  solucao: string;
}

export const FASES: Fase[] = [
  {
    nome: 'Identificadores',
    etapa: 1,
    objetivo: 'Destrua os identificadores válidos.',
    dica: 'Comece com letra ou _ e use ^ e $ para pegar a palavra inteira.',
    inimigas: ['total', '_contador', 'nome_completo', 'x1', 'preco', 'valor_2', '_tmp', 'i'],
    aliadas: ['2valor', 'x-y', '9abc', 'a.b', '1_x', 'r$'],
    solucao: '^[A-Za-z_][A-Za-z0-9_]*$',
  },
  {
    nome: 'Matrículas',
    etapa: 2,
    objetivo: 'Destrua as matrículas no formato CC-AAAA-NNN.',
    dica: 'O prefixo CC é fixo; conte os dígitos com {n}.',
    inimigas: ['CC-2026-001', 'CC-2025-123', 'CC-1999-777', 'CC-2024-010'],
    aliadas: ['SI-2026-001', 'CC-26-001', 'CC-2026-01', 'cc-2026-001', 'CC-2026-0011'],
    solucao: '^CC-[0-9]{4}-[0-9]{3}$',
  },
  {
    nome: 'E-mails',
    etapa: 3,
    objetivo: 'Destrua os e-mails válidos.',
    dica: 'usuario@dominio.tld — sem espaços, e o domínio tem ponto.',
    inimigas: ['ana.silva@udc.edu.br', 'joao123@gmail.com', 'prof@lfa.br', 'x_y@site.org'],
    aliadas: ['ana@', '@gmail.com', 'joao@gmail', 'ana silva@udc.br', 'www.udc.edu.br'],
    solucao: '^[\\w.]+@\\w+(\\.\\w+)+$',
  },
  {
    nome: 'Horários',
    etapa: 3,
    objetivo: 'Destrua os horários entre 00:00 e 23:59.',
    dica: 'Hora: [01][0-9] ou 2[0-3]. Minuto: [0-5][0-9].',
    inimigas: ['08:30', '23:59', '00:00', '12:45', '19:05', '20:00'],
    aliadas: ['25:61', '24:00', '8:30', '12:60', '99:99', '23:5'],
    solucao: '^([01][0-9]|2[0-3]):[0-5][0-9]$',
  },
  {
    nome: 'CPF',
    etapa: 4,
    objetivo: 'Destrua os CPFs no formato 000.000.000-00.',
    dica: 'O ponto é especial: escape com \\.',
    inimigas: ['123.456.789-00', '000.111.222-33', '987.654.321-99', '111.222.333-44'],
    aliadas: ['12345678900', '123.456.789-0', '123-456-789.00', '123.456.78-900', '123x456y789-00'],
    solucao: '^[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}$',
  },
  {
    nome: 'Operadores relacionais',
    etapa: 6,
    objetivo: 'Destrua os operadores relacionais.',
    dica: '==, !=, <=, >=, < e > — mas = sozinho é atribuição.',
    inimigas: ['==', '!=', '<=', '>=', '<', '>'],
    aliadas: ['=', '+', '*', ';', '(', '=>', '!'],
    solucao: '^([=!<>]=|[<>])$',
  },
];
