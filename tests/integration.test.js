// Execute com a aplicacao e o PostgreSQL ja ativos: docker compose exec app npm run test:integration
import test from 'node:test'
import assert from 'node:assert/strict'

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000'

async function requisitar(url, metodo = 'GET', dados, cookie = '') {
  const resposta = await fetch(BASE + url, {
    method: metodo,
    signal: AbortSignal.timeout(5000),
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: dados === undefined ? undefined : JSON.stringify(dados)
  })
  const json = await resposta.json()
  return { status: resposta.status, json, cookie: resposta.headers.get('set-cookie')?.split(';')[0] }
}

test('serve a página e a foto do site', async () => {
  const pagina = await fetch(BASE + '/', { signal: AbortSignal.timeout(5000) })
  assert.equal(pagina.status, 200)
  assert.match(await pagina.text(), /EstuLanches/)

  const foto = await fetch(BASE + '/img/lanche-cantina.jpg', { signal: AbortSignal.timeout(5000) })
  assert.equal(foto.status, 200)
  assert.match(foto.headers.get('content-type'), /image\/jpeg/)
  await foto.body.cancel()
})

test('integracao HTTP + Express + PostgreSQL + sessao + pedido', async () => {
  const saude = await requisitar('/saude')
  assert.equal(saude.status, 200)
  assert.equal(saude.json.banco, 'ok')

  const cardapio = await requisitar('/produtos')
  assert.equal(cardapio.status, 200)
  assert.ok(Array.isArray(cardapio.json) && cardapio.json.length > 0)

  const login = 'teste-' + Date.now() + '-' + Math.floor(Math.random() * 100000)
  const senha = 'SenhaTeste123!'
  const cadastro = await requisitar('/registro', 'POST', { nome: 'Teste Integracao', login, senha })
  assert.equal(cadastro.status, 201)

  const semLogin = await requisitar('/pedidos')
  assert.equal(semLogin.status, 401)

  const sessao = await requisitar('/login', 'POST', { login, senha })
  assert.equal(sessao.status, 200)
  assert.ok(sessao.cookie?.startsWith('token='))

  const me = await requisitar('/me', 'GET', undefined, sessao.cookie)
  assert.equal(me.status, 200)
  assert.equal(me.json.nome, 'Teste Integracao')
  assert.equal(me.json.papel, 'aluno')

  const proibido = await requisitar('/produtos', 'POST', {
    nome: 'Nao permitido', descricao: '', preco_centavos: 100, estoque: 1
  }, sessao.cookie)
  assert.equal(proibido.status, 403)

  const invalido = await requisitar('/pedidos', 'POST', { itens: [] }, sessao.cookie)
  assert.equal(invalido.status, 400)

  const p = cardapio.json.find(produto => produto.estoque > 0)
  assert.ok(p, 'O banco precisa ter um produto com estoque positivo')
  const pedido = await requisitar('/pedidos', 'POST', {
    itens: [{ id_produto: p.id, quantidade: 1 }]
  }, sessao.cookie)
  assert.equal(pedido.status, 201)
  assert.equal(pedido.json.total_centavos, p.preco_centavos)

  const historico = await requisitar('/pedidos', 'GET', undefined, sessao.cookie)
  assert.equal(historico.status, 200)
  assert.ok(historico.json.some(item => item.id === pedido.json.id))

  const cardapioDepois = await requisitar('/produtos')
  const estoqueDepois = cardapioDepois.json.find(produto => produto.id === p.id).estoque
  assert.equal(estoqueDepois, p.estoque - 1)
})
