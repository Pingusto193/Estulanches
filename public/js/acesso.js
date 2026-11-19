const acesso = document.getElementById('acesso')
const areaSistema = document.getElementById('areaSistema')
const formLogin = document.getElementById('formLogin')
const formCadastro = document.getElementById('formCadastro')
const modoLogin = document.getElementById('modoLogin')
const modoCadastro = document.getElementById('modoCadastro')
const tituloAcesso = document.getElementById('tituloAcesso')

function mostrarModo(cadastro) {
  formLogin.hidden = cadastro
  formCadastro.hidden = !cadastro
  modoLogin.setAttribute('aria-pressed', String(!cadastro))
  modoCadastro.setAttribute('aria-pressed', String(cadastro))
  tituloAcesso.textContent = cadastro ? 'Crie sua conta' : 'Acesse sua conta'
  avisar('', 'sucesso', 'avisoAcesso')
}

modoLogin.onclick = () => mostrarModo(false)
modoCadastro.onclick = () => mostrarModo(true)

async function abrirSistema(usuario, focar = false) {
  usuarioAtual = usuario
  const admin = usuario.papel === 'admin'
  const boasVindas = document.getElementById('boasVindas')
  boasVindas.textContent = 'Olá, ' + usuario.nome
  areaSistema.hidden = false
  acesso.hidden = true
  document.getElementById('navegacao').hidden = false
  document.getElementById('tipoServico').hidden = true
  document.getElementById('areaAdmin').hidden = !admin
  document.getElementById('atalhoAdmin').hidden = !admin
  if (focar) boasVindas.focus()

  const carregamentos = [carregarProdutos(), carregarPedidos()]
  if (admin) carregamentos.push(carregarTodosPedidos())
  await Promise.all(carregamentos)
}

async function enviarAcesso(evento, mensagem, acao) {
  evento.preventDefault()
  const botao = evento.currentTarget.querySelector('[type="submit"]')
  await comBotaoOcupado(botao, async () => {
    modoLogin.disabled = true
    modoCadastro.disabled = true
    avisar(mensagem, 'sucesso', 'avisoAcesso')
    try {
      await acao()
    } catch (erro) {
      avisar(erro.message, 'erro', 'avisoAcesso')
    } finally {
      modoLogin.disabled = false
      modoCadastro.disabled = false
    }
  })
}

formLogin.onsubmit = evento => enviarAcesso(evento, 'Entrando…', async () => {
  const usuario = await chamarAPI('/login', 'POST', {
    login: document.getElementById('login').value,
    senha: document.getElementById('senha').value
  })
  formLogin.reset()
  await abrirSistema(usuario, true)
})

formCadastro.onsubmit = evento => enviarAcesso(evento, 'Criando sua conta…', async () => {
  const login = document.getElementById('loginCadastro').value
  await chamarAPI('/registro', 'POST', {
    nome: document.getElementById('nomeCadastro').value,
    login,
    senha: document.getElementById('senhaCadastro').value
  })
  formCadastro.reset()
  mostrarModo(false)
  document.getElementById('login').value = login
  avisar('Conta criada. Entre com seu login e senha.', 'sucesso', 'avisoAcesso')
  document.getElementById('senha').focus()
})

const botaoSair = document.getElementById('sair')
botaoSair.onclick = () => comBotaoOcupado(botaoSair, async () => {
  try {
    await sair()
  } catch (erro) {
    avisar(erro.message, 'erro')
  }
})

async function iniciar() {
  modoLogin.disabled = true
  modoCadastro.disabled = true
  const entrar = formLogin.querySelector('[type="submit"]')
  entrar.disabled = true
  try {
    const resposta = await fetch('/me')
    if (resposta.status === 401) return
    if (!resposta.ok) throw new Error()
    await abrirSistema(await resposta.json())
  } catch {
    avisar('Não foi possível verificar sua sessão. Tente entrar.', 'erro', 'avisoAcesso')
  } finally {
    entrar.disabled = false
    modoLogin.disabled = false
    modoCadastro.disabled = false
  }
}

iniciar()
