async function chamarAPI(url, metodo = 'GET', dados) {
  let resposta
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: dados === undefined ? undefined : JSON.stringify(dados)
    })
  } catch {
    throw new Error('Não foi possível conectar. Tente novamente.')
  }

  if (resposta.status === 401 && !['/login', '/registro', '/me'].includes(url)) {
    location.href = '/index.html'
  }
  const resultado = await resposta.json().catch(() => null)
  if (!resposta.ok || resultado === null) {
    throw new Error(resultado?.erro || 'Não foi possível concluir a solicitação.')
  }
  return resultado
}

async function sair() {
  await chamarAPI('/logout', 'POST')
  location.href = '/index.html'
}

function moeda(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function elemento(tag, texto, classe) {
  const el = document.createElement(tag)
  if (texto !== undefined) el.textContent = texto
  if (classe) el.className = classe
  return el
}

function botaoAcao(texto, acao, classe) {
  const botao = elemento('button', texto, classe)
  botao.type = 'button'
  botao.onclick = acao
  return botao
}

let tempoAviso

function avisar(mensagem, tipo = 'sucesso', id = 'avisoSistema') {
  const aviso = document.getElementById(id)
  aviso.dataset.tipo = tipo
  aviso.textContent = mensagem
  if (id === 'avisoSistema') {
    clearTimeout(tempoAviso)
    tempoAviso = setTimeout(() => { aviso.textContent = '' }, tipo === 'erro' ? 9000 : 4200)
  }
}

async function comBotaoOcupado(botao, tarefa) {
  if (botao.disabled) return
  botao.disabled = true
  botao.setAttribute('aria-busy', 'true')
  try {
    await tarefa()
  } finally {
    botao.removeAttribute('aria-busy')
    botao.disabled = false
  }
}
