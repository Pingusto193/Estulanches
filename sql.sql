-- Criacao automatica pelo container PostgreSQL no primeiro volume vazio.
CREATE TABLE IF NOT EXISTS usuario (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  login VARCHAR(100) NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  papel VARCHAR(10) NOT NULL DEFAULT 'aluno' CHECK (papel IN ('aluno', 'admin'))
);

CREATE TABLE IF NOT EXISTS produto (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao VARCHAR(500) NOT NULL DEFAULT '',
  preco_centavos INTEGER NOT NULL CHECK (preco_centavos > 0),
  estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pedido (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuario(id),
  total_centavos INTEGER NOT NULL CHECK (total_centavos > 0),
  situacao VARCHAR(20) NOT NULL DEFAULT 'recebido'
    CHECK (situacao IN ('recebido', 'preparando', 'entregue', 'cancelado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_pedido (
  id SERIAL PRIMARY KEY,
  id_pedido INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  id_produto INTEGER NOT NULL REFERENCES produto(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario_centavos INTEGER NOT NULL CHECK (preco_unitario_centavos > 0)
);

-- Valores demonstrativos: precos armazenados em centavos.
INSERT INTO produto (nome, descricao, preco_centavos, estoque) VALUES
  ('Pao de queijo', 'Porcao com 2 unidades', 500, 100),
  ('Sanduiche natural', 'Sanduiche de frango', 1200, 100),
  ('Suco de laranja', 'Copo de 300 ml', 700, 100),
  ('Agua mineral', 'Garrafa de 500 ml', 400, 100)
ON CONFLICT (nome) DO NOTHING;
