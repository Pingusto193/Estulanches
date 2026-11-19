// Regras simples reaproveitadas pelas rotas e pelos testes unitarios.
export function validarId(id) {
  return /^\d+$/.test(String(id)) && Number.isSafeInteger(Number(id)) && Number(id) >= 1 && Number(id) <= 2147483647
}

export function validarProduto(dados) {
  if (!dados || typeof dados !== 'object') return false
  const { nome, descricao, preco_centavos, estoque } = dados
  return typeof nome === 'string' && nome.trim().length >= 2 && nome.trim().length <= 100 &&
    typeof descricao === 'string' && descricao.length <= 500 &&
    Number.isSafeInteger(preco_centavos) && preco_centavos > 0 && preco_centavos <= 1000000 &&
    Number.isSafeInteger(estoque) && estoque >= 0 && estoque <= 100000
}

export function validarItens(itens) {
  return Array.isArray(itens) && itens.length > 0 && itens.length <= 20 &&
    itens.every(item => item && validarId(item.id_produto) &&
      Number.isSafeInteger(item.quantidade) && item.quantidade >= 1 && item.quantidade <= 50) &&
    new Set(itens.map(item => Number(item.id_produto))).size === itens.length
}

export function calcularTotal(itens) {
  return itens.reduce((total, item) => total + item.preco_centavos * item.quantidade, 0)
}
