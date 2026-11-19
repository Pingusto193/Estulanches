const carrinhoAtual = new Map()
const caixaCarrinho = document.getElementById('carrinho')
const contagemCarrinho = document.getElementById('contagemCarrinho')
const finalizarPedido = document.getElementById('finalizarPedido')
let enviandoPedido = false

function limiteQuantidade(produto) {
  return Math.min(50, produto.estoque)
}

function podeAdicionar(produto) {
  const quantidade = carrinhoAtual.get(produto.id) || 0
  return !enviandoPedido && quantidade < limiteQuantidade(produto) && (quantidade > 0 || carrinhoAtual.size < 20)
}

function adicionarCarrinho(id) {
  const produto = produtos.find(item => item.id === id)
  if (!produto || !podeAdicionar(produto)) return
  carrinhoAtual.set(id, (carrinhoAtual.get(id) || 0) + 1)
  mostrarCarrinho()
  avisar(produto.nome + ' adicionado ao carrinho.')
}

function controlesQuantidade(produto, quantidade) {
  const controles = elemento('div', undefined, 'quantidade')
  const diminuir = botaoAcao('−', () => {
    if (enviandoPedido) return
    if (quantidade === 1) carrinhoAtual.delete(produto.id)
    else carrinhoAtual.set(produto.id, quantidade - 1)
    mostrarCarrinho()
  }, 'secundario')
  const aumentar = botaoAcao('+', () => adicionarCarrinho(produto.id), 'secundario')

  diminuir.setAttribute('aria-label', 'Diminuir quantidade de ' + produto.nome)
  aumentar.setAttribute('aria-label', 'Aumentar quantidade de ' + produto.nome)
  diminuir.dataset.focoCarrinho = produto.id + '-menos'
  aumentar.dataset.focoCarrinho = produto.id + '-mais'
  diminuir.disabled = enviandoPedido
  aumentar.disabled = !podeAdicionar(produto)
  controles.append(diminuir, elemento('span', quantidade), aumentar)
  return controles
}

function mostrarCarrinho() {
  const controleAtivo = document.activeElement?.dataset.focoCarrinho
  const itens = []
  let total = 0
  let unidades = 0
  let estoqueAlterado = false

  carrinhoAtual.forEach((quantidade, id) => {
    const produto = produtos.find(item => item.id === id)
    const disponivel = produto ? limiteQuantidade(produto) : 0
    if (quantidade > disponivel) {
      estoqueAlterado = true
      quantidade = disponivel
      if (quantidade === 0) {
        carrinhoAtual.delete(id)
        return
      }
      carrinhoAtual.set(id, quantidade)
    }

    const subtotal = quantidade * produto.preco_centavos
    total += subtotal
    unidades += quantidade
    const linha = elemento('div', undefined, 'item-carrinho')
    const controles = elemento('div', undefined, 'controles-carrinho')
    controles.append(controlesQuantidade(produto, quantidade), elemento('span', moeda(subtotal)))
    linha.append(elemento('strong', produto.nome), controles)
    itens.push(linha)
  })

  caixaCarrinho.replaceChildren(...(itens.length ? itens : [elemento('p', 'Seu carrinho está vazio.', 'estado')]))
  document.getElementById('total').textContent = moeda(total)
  if (contagemCarrinho.textContent !== String(unidades)) {
    contagemCarrinho.textContent = unidades
    contagemCarrinho.classList.remove('contagem-atualizada')
    requestAnimationFrame(() => contagemCarrinho.classList.add('contagem-atualizada'))
  }
  finalizarPedido.disabled = enviandoPedido || !carrinhoAtual.size
  atualizarBotoesAdicionar()

  if (controleAtivo && !enviandoPedido) {
    const botoes = Array.from(caixaCarrinho.querySelectorAll('button:not(:disabled)'))
    const anterior = botoes.find(botao => botao.dataset.focoCarrinho === controleAtivo)
    const alvo = anterior || botoes[0] || document.getElementById('tituloCarrinho')
    alvo.focus({ preventScroll: true })
  }
  if (estoqueAlterado) avisar('O estoque mudou. Confira as quantidades no carrinho.', 'erro')
}

finalizarPedido.onclick = async () => {
  if (enviandoPedido || !carrinhoAtual.size) return
  const itens = Array.from(carrinhoAtual, ([id_produto, quantidade]) => ({ id_produto, quantidade }))
  enviandoPedido = true
  finalizarPedido.textContent = 'Enviando pedido…'
  finalizarPedido.setAttribute('aria-busy', 'true')
  mostrarCarrinho()
  try {
    const pedido = await chamarAPI('/pedidos', 'POST', { itens })
    carrinhoAtual.clear()
    avisar(`Pedido #${pedido.id} confirmado. Total: ${moeda(pedido.total_centavos)}.`)
    const atualizacoes = [carregarProdutos(), carregarPedidos()]
    if (usuarioAtual?.papel === 'admin') atualizacoes.push(carregarTodosPedidos())
    await Promise.all(atualizacoes)
  } catch (erro) {
    avisar(erro.message, 'erro')
  } finally {
    enviandoPedido = false
    finalizarPedido.textContent = 'Finalizar pedido'
    finalizarPedido.removeAttribute('aria-busy')
    mostrarCarrinho()
  }
}

const nomesSituacao = {
  recebido: 'Recebido',
  preparando: 'Em preparo',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
}

function montarPedido(pedido, admin) {
  const linha = elemento('article', undefined, 'registro')
  const resumo = elemento('div')
  const data = new Date(pedido.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  resumo.append(elemento('strong', `Pedido #${pedido.id}`))
  if (admin) resumo.append(elemento('p', pedido.cliente))
  resumo.append(elemento('p', data))

  const detalhes = elemento('div', undefined, 'detalhes-pedido')
  const situacao = elemento('span', nomesSituacao[pedido.situacao] || pedido.situacao, 'selo')
  situacao.dataset.estado = pedido.situacao
  detalhes.append(elemento('strong', moeda(pedido.total_centavos)), situacao)
  if (admin && ['recebido', 'preparando'].includes(pedido.situacao)) {
    const proxima = pedido.situacao === 'recebido' ? 'preparando' : 'entregue'
    const texto = proxima === 'preparando' ? 'Iniciar preparo' : 'Marcar entregue'
    const atualizar = botaoAcao(texto, () => comBotaoOcupado(atualizar, async () => {
      try {
        await chamarAPI('/pedidos/' + pedido.id, 'PUT', { situacao: proxima })
        avisar(`Pedido #${pedido.id} atualizado.`)
        await Promise.all([carregarTodosPedidos(), carregarPedidos()])
      } catch (erro) {
        avisar(erro.message, 'erro')
      }
    }), 'secundario')
    detalhes.append(atualizar)
  }
  linha.append(resumo, detalhes)
  return linha
}

async function listarPedidos(admin) {
  const caixa = document.getElementById(admin ? 'pedidosAdmin' : 'listaPedidos')
  caixa.setAttribute('aria-busy', 'true')
  try {
    const pedidos = await chamarAPI(admin ? '/pedidos/todos' : '/pedidos')
    const vazio = admin ? 'Nenhum pedido recebido.' : 'Você ainda não fez pedidos.'
    caixa.replaceChildren(...(pedidos.length ? pedidos.map(pedido => montarPedido(pedido, admin)) : [elemento('p', vazio, 'estado')]))
  } catch (erro) {
    caixa.replaceChildren(elemento('p', 'Não foi possível carregar os pedidos. Use o botão para tentar novamente.', 'estado'))
    avisar(erro.message, 'erro')
  } finally {
    caixa.setAttribute('aria-busy', 'false')
  }
}

function carregarPedidos() {
  return listarPedidos(false)
}

function carregarTodosPedidos() {
  return listarPedidos(true)
}

const atualizarPedidos = document.getElementById('atualizarPedidos')
atualizarPedidos.onclick = () => comBotaoOcupado(atualizarPedidos, carregarPedidos)

const atualizarTodos = document.getElementById('atualizarTodos')
atualizarTodos.onclick = () => comBotaoOcupado(atualizarTodos, carregarTodosPedidos)
