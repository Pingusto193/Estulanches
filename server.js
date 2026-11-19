import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import pool from './db.js'
import { validarId, validarProduto, validarItens, calcularTotal } from './validacoes.js'

const app = express()
const PORT = Number(process.env.PORT || 3000)
const JWT_SECRET = process.env.JWT_SECRET
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true'

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('Defina JWT_SECRET com pelo menos 32 caracteres no arquivo .env.')
}

app.disable('x-powered-by')
app.use(express.json({ limit: '20kb' }))
app.use(cookieParser())
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  next()
})
app.get('/', (req, res) => res.redirect('/index.html'))
app.use(express.static('public'))

function authToken(req, res, next) {
  try {
    req.usuario = jwt.verify(req.cookies?.token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ erro: 'Entre novamente na sua conta.' })
  }
}

async function apenasAdmin(req, res, next) {
  const resultado = await pool.query('SELECT papel FROM usuario WHERE id = $1', [req.usuario.id])
  if (resultado.rows[0]?.papel !== 'admin') {
    return res.status(403).json({ erro: 'Somente o administrador pode alterar o cardapio.' })
  }
  next()
}

function validarParametroId(req, res, next) {
  if (!validarId(req.params.id)) return res.status(400).json({ erro: 'ID invalido.' })
  next()
}

app.get('/saude', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', banco: 'ok', versao: '1.0.0' })
  } catch (erro) {
    console.error('Falha na verificacao do banco:', erro.message)
    res.status(503).json({ status: 'indisponivel', banco: 'erro' })
  }
})

// Cadastro e login com bcrypt, JWT e cookie HttpOnly (como na referencia).
app.post('/registro', async (req, res) => {
  const { nome, login, senha } = req.body || {}
  if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 100 ||
      typeof login !== 'string' || !login.trim() || login.trim().length > 100 ||
      typeof senha !== 'string' || senha.length < 8 || Buffer.byteLength(senha, 'utf8') > 72) {
    return res.status(400).json({ erro: 'Informe nome, login e senha de 8 a 72 bytes.' })
  }
  const hash = await bcrypt.hash(senha, 10)
  const resultado = await pool.query(
    'INSERT INTO usuario (nome, login, senha) VALUES ($1, $2, $3) RETURNING id, nome, login',
    [nome.trim(), login.trim(), hash]
  )
  res.status(201).json(resultado.rows[0])
})

app.post('/login', async (req, res) => {
  const { login, senha } = req.body || {}
  if (typeof login !== 'string' || typeof senha !== 'string' || !login.trim() || !senha) {
    return res.status(400).json({ erro: 'Informe login e senha.' })
  }
  const resultado = await pool.query('SELECT * FROM usuario WHERE login = $1', [login.trim()])
  const usuario = resultado.rows[0]
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
    return res.status(401).json({ erro: 'Login ou senha incorretos.' })
  }
  const token = jwt.sign({ id: usuario.id, nome: usuario.nome }, JWT_SECRET, { expiresIn: '1h' })
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: COOKIE_SECURE,
    maxAge: 3600000,
    path: '/'
  })
  res.json({ nome: usuario.nome, papel: usuario.papel })
})

app.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict', secure: COOKIE_SECURE, path: '/' })
  res.json({ mensagem: 'Voce saiu.' })
})

app.get('/me', authToken, async (req, res) => {
  const resultado = await pool.query('SELECT nome, papel FROM usuario WHERE id = $1', [req.usuario.id])
  if (!resultado.rows.length) return res.status(401).json({ erro: 'Conta nao encontrada.' })
  res.json(resultado.rows[0])
})

// Cardapio: leitura livre; alteracoes apenas para contas admin.
app.get('/produtos', async (req, res) => {
  const resultado = await pool.query(
    'SELECT id, nome, descricao, preco_centavos, estoque FROM produto WHERE ativo = TRUE ORDER BY id'
  )
  res.json(resultado.rows)
})

app.post('/produtos', authToken, apenasAdmin, async (req, res) => {
  if (!validarProduto(req.body)) return res.status(400).json({ erro: 'Confira nome, descricao, preco em centavos e estoque.' })
  const { nome, descricao, preco_centavos, estoque } = req.body
  const resultado = await pool.query(
    'INSERT INTO produto (nome, descricao, preco_centavos, estoque) VALUES ($1, $2, $3, $4) RETURNING *',
    [nome.trim(), descricao.trim(), preco_centavos, estoque]
  )
  res.status(201).json(resultado.rows[0])
})

app.put('/produtos/:id', authToken, apenasAdmin, validarParametroId, async (req, res) => {
  if (!validarProduto(req.body)) return res.status(400).json({ erro: 'Confira os dados do produto.' })
  const { nome, descricao, preco_centavos, estoque } = req.body
  const resultado = await pool.query(
    `UPDATE produto SET nome = $1, descricao = $2, preco_centavos = $3, estoque = $4
     WHERE id = $5 AND ativo = TRUE RETURNING *`,
    [nome.trim(), descricao.trim(), preco_centavos, estoque, req.params.id]
  )
  if (!resultado.rows.length) return res.status(404).json({ erro: 'Produto nao encontrado.' })
  res.json(resultado.rows[0])
})

app.delete('/produtos/:id', authToken, apenasAdmin, validarParametroId, async (req, res) => {
  const resultado = await pool.query(
    'UPDATE produto SET ativo = FALSE WHERE id = $1 AND ativo = TRUE RETURNING id',
    [req.params.id]
  )
  if (!resultado.rows.length) return res.status(404).json({ erro: 'Produto nao encontrado.' })
  res.json({ mensagem: 'Produto retirado do cardapio.' })
})

// Uma transacao impede que duas compras simultaneas vendam o mesmo estoque.
app.post('/pedidos', authToken, async (req, res) => {
  const itens = req.body?.itens
  if (!validarItens(itens)) return res.status(400).json({ erro: 'Envie de 1 a 20 produtos diferentes com quantidade valida.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const ids = itens.map(item => Number(item.id_produto)).sort((a, b) => a - b)
    const resultadoProdutos = await client.query(
      'SELECT id, nome, preco_centavos, estoque FROM produto WHERE id = ANY($1::int[]) AND ativo = TRUE ORDER BY id FOR UPDATE',
      [ids]
    )
    if (resultadoProdutos.rows.length !== ids.length) {
      await client.query('ROLLBACK')
      return res.status(400).json({ erro: 'Um dos produtos nao esta disponivel.' })
    }
    const produtos = new Map(resultadoProdutos.rows.map(produto => [produto.id, produto]))
    const itensComPreco = []
    for (const item of itens) {
      const produto = produtos.get(Number(item.id_produto))
      if (produto.estoque < item.quantidade) {
        await client.query('ROLLBACK')
        return res.status(409).json({ erro: 'Estoque insuficiente para ' + produto.nome + '.' })
      }
      itensComPreco.push({ ...item, preco_centavos: produto.preco_centavos })
    }
    const total = calcularTotal(itensComPreco)
    const pedido = await client.query(
      'INSERT INTO pedido (id_usuario, total_centavos) VALUES ($1, $2) RETURNING id, total_centavos, situacao, criado_em',
      [req.usuario.id, total]
    )
    for (const item of itensComPreco) {
      await client.query(
        'INSERT INTO item_pedido (id_pedido, id_produto, quantidade, preco_unitario_centavos) VALUES ($1, $2, $3, $4)',
        [pedido.rows[0].id, Number(item.id_produto), item.quantidade, item.preco_centavos]
      )
      await client.query('UPDATE produto SET estoque = estoque - $1 WHERE id = $2',
        [item.quantidade, Number(item.id_produto)])
    }
    await client.query('COMMIT')
    res.status(201).json(pedido.rows[0])
  } catch (erro) {
    await client.query('ROLLBACK').catch(() => {})
    throw erro
  } finally {
    client.release()
  }
})

app.get('/pedidos', authToken, async (req, res) => {
  const resultado = await pool.query(
    'SELECT id, total_centavos, situacao, criado_em FROM pedido WHERE id_usuario = $1 ORDER BY id DESC LIMIT 50',
    [req.usuario.id]
  )
  res.json(resultado.rows)
})

app.get('/pedidos/todos', authToken, apenasAdmin, async (req, res) => {
  const resultado = await pool.query(
    `SELECT p.id, u.nome AS cliente, p.total_centavos, p.situacao, p.criado_em
     FROM pedido p JOIN usuario u ON u.id = p.id_usuario ORDER BY p.id DESC LIMIT 100`
  )
  res.json(resultado.rows)
})

app.put('/pedidos/:id', authToken, apenasAdmin, validarParametroId, async (req, res) => {
  const { situacao } = req.body || {}
  if (!['preparando', 'entregue'].includes(situacao)) {
    return res.status(400).json({ erro: 'Situacao invalida.' })
  }
  const resultado = await pool.query(
    'UPDATE pedido SET situacao = $1 WHERE id = $2 AND situacao <> $3 RETURNING id, situacao',
    [situacao, req.params.id, 'cancelado']
  )
  if (!resultado.rows.length) return res.status(404).json({ erro: 'Pedido nao encontrado.' })
  res.json(resultado.rows[0])
})

app.use((erro, req, res, next) => {
  if (erro.code === '23505') return res.status(409).json({ erro: 'Este login ou nome de produto ja existe.' })
  if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON invalido.' })
  console.error('Erro no servidor:', erro.message)
  res.status(500).json({ erro: 'Erro interno. Confira os logs e o banco.' })
})

app.listen(PORT, '0.0.0.0', () => console.log(`EstuLanches v1.0.0 — Acesse http://localhost:${PORT}`))
