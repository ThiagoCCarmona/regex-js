/** Banco de desafios da Regex Arena, um ou mais por etapa do laboratório. */
export interface Desafio {
  id: string;
  titulo: string;
  etapa: number;
  dica: string;
  deveCasar: string[];
  naoDeveCasar: string[];
  /** Solução de referência (mostrada no fim da rodada). */
  solucao: string;
}

export const DESAFIOS: Desafio[] = [
  {
    id: 'identificadores', etapa: 1, titulo: 'Identificadores válidos',
    dica: 'Letra ou _ no início; depois letras, dígitos ou _. Use âncoras!',
    deveCasar: ['total', '_contador', 'nome_completo', 'x1'],
    naoDeveCasar: ['2valor', 'x-y', 'nome completo', 'preço'],
    solucao: '^[A-Za-z_]\\w*$',
  },
  {
    id: 'maiuscula', etapa: 1, titulo: 'Começa com maiúscula',
    dica: 'Primeira letra em [A-Z].',
    deveCasar: ['Total', 'TOTAL_2', 'Regex'],
    naoDeveCasar: ['total', '_Total', '2Total'],
    solucao: '^[A-Z]\\w*$',
  },
  {
    id: 'matricula', etapa: 2, titulo: 'Matrículas CC-AAAA-NNN',
    dica: 'Prefixo CC fixo, 4 dígitos, 3 dígitos.',
    deveCasar: ['CC-2026-001', 'CC-1999-123'],
    naoDeveCasar: ['SI-2026-001', 'CC-26-001', 'CC-2026-0011'],
    solucao: '^CC-\\d{4}-\\d{3}$',
  },
  {
    id: 'telefone', etapa: 2, titulo: 'Telefone (DD) DDDDD-DDDD',
    dica: 'Parênteses precisam de escape: \\( e \\).',
    deveCasar: ['(45) 99999-1234', '(11) 91234-5678'],
    naoDeveCasar: ['45 99999-1234', '(45)99999-1234', '(45) 9999-1234'],
    solucao: '^\\(\\d{2}\\) \\d{5}-\\d{4}$',
  },
  {
    id: 'data', etapa: 2, titulo: 'Datas DD/MM/AAAA',
    dica: 'Dois dígitos, barra, dois dígitos, barra, quatro dígitos.',
    deveCasar: ['01/09/2026', '31/12/1999'],
    naoDeveCasar: ['1/9/2026', '01-09-2026', '01/09/26'],
    solucao: '^\\d{2}/\\d{2}/\\d{4}$',
  },
  {
    id: 'horario', etapa: 3, titulo: 'Horários de 00:00 a 23:59',
    dica: 'A hora é [01]x ou 2[0-3]; os minutos são [0-5]x.',
    deveCasar: ['08:30', '23:59', '00:00', '19:05'],
    naoDeveCasar: ['25:61', '24:00', '8:30', '12:60'],
    solucao: '^([01]\\d|2[0-3]):[0-5]\\d$',
  },
  {
    id: 'email', etapa: 3, titulo: 'E-mails',
    dica: 'usuario@dominio.tld — o domínio tem pelo menos um ponto.',
    deveCasar: ['ana.silva@udc.edu.br', 'joao123@gmail.com'],
    naoDeveCasar: ['ana@', '@gmail.com', 'joao@gmail', 'ana silva@udc.br'],
    solucao: '^[\\w.]+@\\w+(\\.\\w+)+$',
  },
  {
    id: 'hashtag', etapa: 3, titulo: 'Hashtags',
    dica: '# seguido de pelo menos um caractere de palavra.',
    deveCasar: ['#LFA', '#Regex', '#js2026'],
    naoDeveCasar: ['LFA', '# LFA', '#', '##'],
    solucao: '^#\\w+$',
  },
  {
    id: 'cpf', etapa: 4, titulo: 'CPF formatado',
    dica: '000.000.000-00 — o ponto precisa de escape.',
    deveCasar: ['123.456.789-00', '000.111.222-33'],
    naoDeveCasar: ['12345678900', '123.456.789-0', '123-456-789.00'],
    solucao: '^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$',
  },
  {
    id: 'nivel', etapa: 5, titulo: 'Níveis de log',
    dica: 'Alternância: (A|B|C).',
    deveCasar: ['INFO', 'WARN', 'ERROR'],
    naoDeveCasar: ['DEBUG', 'info', 'INFOS', 'ERR'],
    solucao: '^(INFO|WARN|ERROR)$',
  },
  {
    id: 'relop', etapa: 6, titulo: 'Operadores relacionais',
    dica: '==, !=, <=, >=, < e > — mas não = sozinho.',
    deveCasar: ['==', '!=', '<=', '>=', '<', '>'],
    naoDeveCasar: ['=', '!', '=>', '=<', '<>'],
    solucao: '^([=!<>]=|[<>])$',
  },
];
