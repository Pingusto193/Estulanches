import test from 'node:test'
import assert from 'node:assert/strict'
import { validarId, validarProduto, validarItens, calcularTotal } from '../validacoes.js'

const produto = { nome: 'Pao de queijo', descricao: 'Quentinho', preco_centavos: 500, estoque: 20 }

test('ID aceita somente inteiro positivo', () => {
  assert.equal(validarId(12), true)
  assert.equal(validarId('1e1'), false)
  assert.equal(validarId(0), false)
  assert.equal(validarId('1 OR 1=1'), false)
})

test('produto valido tem preco inteiro em centavos e estoque nao negativo', () => {
  assert.equal(validarProduto(produto), true)
  assert.equal(validarProduto({ ...produto, preco_centavos: -1 }), false)
  assert.equal(validarProduto({ ...produto, preco_centavos: 12.50 }), false)
  assert.equal(validarProduto({ ...produto, estoque: -1 }), false)
})

test('pedido rejeita quantidades indevidas e produtos repetidos', () => {
  assert.equal(validarItens([{ id_produto: 1, quantidade: 2 }]), true)
  assert.equal(validarItens([]), false)
  assert.equal(validarItens([{ id_produto: 1, quantidade: 0 }]), false)
  assert.equal(validarItens([{ id_produto: 1, quantidade: 1 }, { id_produto: 1, quantidade: 3 }]), false)
})

test('total calcula o valor de todos os itens em centavos', () => {
  assert.equal(calcularTotal([
    { preco_centavos: 500, quantidade: 2 },
    { preco_centavos: 750, quantidade: 1 }
  ]), 1750)
})
