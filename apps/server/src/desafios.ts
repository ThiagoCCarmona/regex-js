/**
 * Banco de desafios da Regex Arena, um ou mais por etapa do laboratório.
 *
 * Casos ocultos: cadeias que o jogador NÃO vê durante a rodada, mas que contam
 * na avaliação e são reveladas no fim. Decorar as palavras visíveis
 * (^(a|b|c)$) passa nos exemplos e falha nos ocultos — a ideia é generalizar
 * a LINGUAGEM, não o conjunto finito de exemplos.
 */
export interface Desafio {
  id: string;
  titulo: string;
  etapa: number;
  dica: string;
  deveCasar: string[];
  naoDeveCasar: string[];
  /** Devem casar, mas só aparecem no fim da rodada. */
  deveOculto: string[];
  /** Não podem casar, e só aparecem no fim da rodada. */
  naoDeveOculto: string[];
  /** Solução de referência (mostrada no fim da rodada). */
  solucao: string;
}

export const DESAFIOS: Desafio[] = [
  {
    id: 'identificadores', etapa: 1, titulo: 'Identificadores válidos',
    dica: 'Letra ou _ no início; depois letras, dígitos ou _. Use âncoras!',
    deveCasar: ['total', '_contador', 'nome_completo', 'x1'],
    naoDeveCasar: ['2valor', 'x-y', 'nome completo', 'preço'],
    deveOculto: ['contador2', '_', 'Total_Geral'],
    naoDeveOculto: ['9x', 'a b', 'ação'],
    solucao: '^[A-Za-z_]\\w*$',
  },
  {
    id: 'maiuscula', etapa: 1, titulo: 'Começa com maiúscula',
    dica: 'Primeira letra em [A-Z].',
    deveCasar: ['Total', 'TOTAL_2', 'Regex'],
    naoDeveCasar: ['total', '_Total', '2Total'],
    deveOculto: ['X', 'Abc_9'],
    naoDeveOculto: ['xA', '9A', 'Ábaco'],
    solucao: '^[A-Z]\\w*$',
  },
  {
    id: 'matricula', etapa: 2, titulo: 'Matrículas CC-AAAA-NNN',
    dica: 'Prefixo CC fixo, 4 dígitos, 3 dígitos.',
    deveCasar: ['CC-2026-001', 'CC-1999-123'],
    naoDeveCasar: ['SI-2026-001', 'CC-26-001', 'CC-2026-0011'],
    deveOculto: ['CC-2000-999'],
    naoDeveOculto: ['cc-2026-001', 'CC-2026-01a', 'CC 2026 001'],
    solucao: '^CC-\\d{4}-\\d{3}$',
  },
  {
    id: 'telefone', etapa: 2, titulo: 'Telefone (DD) DDDDD-DDDD',
    dica: 'Parênteses precisam de escape: \\( e \\).',
    deveCasar: ['(45) 99999-1234', '(11) 91234-5678'],
    naoDeveCasar: ['45 99999-1234', '(45)99999-1234', '(45) 9999-1234'],
    deveOculto: ['(00) 00000-0000'],
    naoDeveOculto: ['(45) 99999-12345', '(4) 99999-1234'],
    solucao: '^\\(\\d{2}\\) \\d{5}-\\d{4}$',
  },
  {
    id: 'data', etapa: 2, titulo: 'Datas DD/MM/AAAA',
    dica: 'Dois dígitos, barra, dois dígitos, barra, quatro dígitos.',
    deveCasar: ['01/09/2026', '31/12/1999'],
    naoDeveCasar: ['1/9/2026', '01-09-2026', '01/09/26'],
    deveOculto: ['29/02/2024'],
    naoDeveOculto: ['2026/09/01', '01/09/2026x'],
    solucao: '^\\d{2}/\\d{2}/\\d{4}$',
  },
  {
    id: 'horario', etapa: 3, titulo: 'Horários de 00:00 a 23:59',
    dica: 'A hora é [01]x ou 2[0-3]; os minutos são [0-5]x.',
    deveCasar: ['08:30', '23:59', '00:00', '19:05'],
    naoDeveCasar: ['25:61', '24:00', '8:30', '12:60'],
    deveOculto: ['23:00', '09:09', '14:45'],
    naoDeveOculto: ['24:59', '7:00', '13:7'],
    solucao: '^([01]\\d|2[0-3]):[0-5]\\d$',
  },
  {
    id: 'email', etapa: 3, titulo: 'E-mails',
    dica: 'usuario@dominio.tld — o domínio tem pelo menos um ponto.',
    deveCasar: ['ana.silva@udc.edu.br', 'joao123@gmail.com'],
    naoDeveCasar: ['ana@', '@gmail.com', 'joao@gmail', 'ana silva@udc.br'],
    deveOculto: ['a_b@x.co', 'prof@lfa.br'],
    naoDeveOculto: ['a@b', 'a@@b.com'],
    solucao: '^[\\w.]+@\\w+(\\.\\w+)+$',
  },
  {
    id: 'hashtag', etapa: 3, titulo: 'Hashtags',
    dica: '# seguido de pelo menos um caractere de palavra.',
    deveCasar: ['#LFA', '#Regex', '#js2026'],
    naoDeveCasar: ['LFA', '# LFA', '#', '##'],
    deveOculto: ['#a1', '#_x'],
    naoDeveOculto: ['a#b', '#á'],
    solucao: '^#\\w+$',
  },
  {
    id: 'cpf', etapa: 4, titulo: 'CPF formatado',
    dica: '000.000.000-00 — o ponto precisa de escape.',
    deveCasar: ['123.456.789-00', '000.111.222-33'],
    naoDeveCasar: ['12345678900', '123.456.789-0', '123-456-789.00', '123-456-789-00'],
    deveOculto: ['999.888.777-66'],
    naoDeveOculto: ['123.456.789-000', '123 456 789 00'],
    solucao: '^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$',
  },
  {
    id: 'nivel', etapa: 5, titulo: 'Níveis de log',
    dica: 'Alternância: (A|B|C). Aqui a linguagem é finita: listar é a resposta!',
    deveCasar: ['INFO', 'WARN', 'ERROR'],
    naoDeveCasar: ['DEBUG', 'info', 'INFOS', 'ERR'],
    deveOculto: [],
    naoDeveOculto: ['ERROR!', 'WARNING', 'INFO WARN'],
    solucao: '^(INFO|WARN|ERROR)$',
  },
  {
    id: 'relop', etapa: 6, titulo: 'Operadores relacionais',
    dica: '==, !=, <=, >=, < e > — mas não = sozinho.',
    deveCasar: ['==', '!=', '<=', '>=', '<', '>'],
    naoDeveCasar: ['=', '!', '=>', '=<', '<>'],
    deveOculto: [],
    naoDeveOculto: ['==>', '!==', '<<'],
    solucao: '^([=!<>]=|[<>])$',
  },
];
