let produtos = []
let usuarioAtual = null
const listaProdutos = document.getElementById('listaProdutos')
const buscaProduto = document.getElementById('buscaProduto')
const estadoBusca = document.getElementById('estadoBusca')
const formProduto = document.getElementById('formProduto')
const salvarProduto = document.getElementById('salvarProduto')
const botoesAdicionar = new Map()

function chaveBusca(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function atualizarBotoesAdicionar() {
  botoesAdicionar.forEach((botao, id) => {
    const produto = produtos.find(item => item.id === id)
    botao.disabled = !podeAdicionar(produto)
  })
}

function montarProduto(produto) {
  const cartao = elemento('article', undefined, 'produto')
  cartao.append(elemento('h3', produto.nome))
  if (produto.descricao) cartao.append(elemento('p', produto.descricao))

  const detalhes = elemento('div', undefined, 'detalhes-produto')
  const estoque = elemento('span', produto.estoque ? `${produto.estoque} em estoque` : 'Esgotado', 'selo')
  if (!produto.estoque) estoque.dataset.estado = 'esgotado'
  detalhes.append(elemento('strong', moeda(produto.preco_centavos), 'preco'), estoque)

  const textoAdicionar = produto.estoque ? 'Adicionar' : 'Indisponível'
  const adicionar = botaoAcao(textoAdicionar, () => adicionarCarrinho(produto.id))
  adicionar.setAttribute('aria-label', textoAdicionar + ': ' + produto.nome)
  botoesAdicionar.set(produto.id, adicionar)
  cartao.append(detalhes, adicionar)

  if (usuarioAtual?.papel === 'admin') {
    const acoes = elemento('div', undefined, 'acoes')
    const editar = botaoAcao('Editar', () => editarProduto(produto.id), 'secundario')
    editar.setAttribute('aria-label', 'Editar ' + produto.nome)
    const retirar = botaoAcao('Retirar', () => excluirProduto(produto.id, retirar), 'secundario')
    retirar.setAttribute('aria-label', 'Retirar ' + produto.nome)
    acoes.append(editar, retirar)
    cartao.append(acoes)
  }
  return cartao
}

function mostrarProdutos() {
  const busca = chaveBusca(buscaProduto.value.trim())
  const filtrados = produtos.filter(produto => chaveBusca(produto.nome + ' ' + produto.descricao).includes(busca))
  botoesAdicionar.clear()
  if (filtrados.length) {
    listaProdutos.replaceChildren(...filtrados.map(montarProduto))
  } else {
    const vazio = busca ? 'Nenhum produto encontrado.' : 'O cardápio ainda está vazio.'
    listaProdutos.replaceChildren(elemento('p', vazio, 'estado'))
  }
  estadoBusca.textContent = busca ? `Resultados no cardápio: ${filtrados.length}.` : ''
  atualizarBotoesAdicionar()
}

buscaProduto.oninput = mostrarProdutos

async function carregarProdutos() {
  listaProdutos.setAttribute('aria-busy', 'true')
  buscaProduto.disabled = true
  try {
    produtos = await chamarAPI('/produtos')
    mostrarProdutos()
    mostrarCarrinho()
    buscaProduto.disabled = false
  } catch (erro) {
    if (produtos.length) {
      avisar('Não foi possível atualizar o cardápio. ' + erro.message, 'erro')
      buscaProduto.disabled = false
    } else {
      botoesAdicionar.clear()
      const falha = elemento('div', undefined, 'estado')
      falha.append(elemento('p', 'Não foi possível carregar o cardápio.'))
      const tentar = botaoAcao('Tentar novamente', () => comBotaoOcupado(tentar, carregarProdutos), 'secundario')
      falha.append(tentar)
      listaProdutos.replaceChildren(falha)
    }
  } finally {
    listaProdutos.setAttribute('aria-busy', 'false')
  }
}

function limparProduto() {
  formProduto.reset()
  document.getElementById('idProduto').value = ''
  document.getElementById('tituloProduto').textContent = 'Cadastrar produto'
  salvarProduto.textContent = 'Salvar produto'
}

document.getElementById('limparProduto').onclick = limparProduto

function editarProduto(id) {
  const produto = produtos.find(item => item.id === id)
  if (!produto) return
  document.getElementById('idProduto').value = produto.id
  document.getElementById('nomeProduto').value = produto.nome
  document.getElementById('descricaoProduto').value = produto.descricao
  document.getElementById('precoProduto').value = (produto.preco_centavos / 100).toFixed(2).replace('.', ',')
  document.getElementById('estoqueProduto').value = produto.estoque
  document.getElementById('tituloProduto').textContent = 'Editar produto'
  salvarProduto.textContent = 'Salvar alterações'
  const campoNome = document.getElementById('nomeProduto')
  document.getElementById('areaAdmin').scrollIntoView({ block: 'start' })
  campoNome.focus({ preventScroll: true })
}

async function excluirProduto(id, botao) {
  if (!confirm('Retirar este produto do cardápio?')) return
  await comBotaoOcupado(botao, async () => {
    try {
      await chamarAPI('/produtos/' + id, 'DELETE')
      if (Number(document.getElementById('idProduto').value) === id) limparProduto()
      avisar('Produto retirado do cardápio.')
      await carregarProdutos()
    } catch (erro) {
      avisar(erro.message, 'erro')
    }
  })
}

formProduto.onsubmit = async evento => {
  evento.preventDefault()
  const id = document.getElementById('idProduto').value
  const campoPreco = document.getElementById('precoProduto')
  const textoPreco = campoPreco.value.trim()
  if (!/^\d{1,5}(?:[,.]\d{1,2})?$/.test(textoPreco)) {
    avisar('Informe o preço como 5,50 ou 5.50.', 'erro')
    campoPreco.focus()
    return
  }

  const partes = textoPreco.replace(',', '.').split('.')
  const dados = {
    nome: document.getElementById('nomeProduto').value,
    descricao: document.getElementById('descricaoProduto').value,
    preco_centavos: Number(partes[0]) * 100 + Number((partes[1] || '').padEnd(2, '0')),
    estoque: Number(document.getElementById('estoqueProduto').value)
  }

  await comBotaoOcupado(salvarProduto, async () => {
    try {
      await chamarAPI(id ? '/produtos/' + id : '/produtos', id ? 'PUT' : 'POST', dados)
      limparProduto()
      avisar(id ? 'Produto atualizado.' : 'Produto cadastrado.')
      await carregarProdutos()
    } catch (erro) {
      avisar(erro.message, 'erro')
    }
  })
}
