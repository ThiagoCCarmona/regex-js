/** Traduz as mensagens de erro de sintaxe do V8 para uma frase curta em português. */
export function traduzirErroRegex(msg: string): string {
  const semPrefixo = msg.replace(/^Invalid regular expression: \/.*\/[a-z]*: /s, '');
  const mapa: Array<[RegExp, string]> = [
    [/Unterminated group/, 'grupo aberto sem ")"'],
    [/Unmatched '\)'/, '")" sem "(" correspondente'],
    [/Unterminated character class/, 'classe aberta sem "]"'],
    [/Nothing to repeat/, 'quantificador sem nada antes para repetir'],
    [/\\ at end of pattern/, '"\\" no fim do padrão'],
    [/Invalid flags/, 'flag inválida'],
    [/Invalid group/, 'grupo inválido'],
    [/numbers out of order/, 'quantificador {m,n} com m > n'],
    [/Invalid capture group name/, 'nome de grupo inválido'],
    [/Duplicate capture group name/, 'nome de grupo repetido'],
    [/Invalid named reference/, 'referência a grupo inexistente'],
    [/Invalid escape/, 'escape inválido'],
    [/Lone quantifier brackets/, '"{" ou "}" sem quantificador'],
    [/Range out of order/, 'intervalo invertido na classe (ex.: [z-a])'],
  ];
  for (const [re, pt] of mapa) if (re.test(semPrefixo)) return `Regex inválida: ${pt}`;
  return 'Regex inválida: confira parênteses, colchetes e quantificadores';
}
