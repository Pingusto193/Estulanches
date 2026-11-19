# EstuLanches - Implantacao com Docker

**Versao:** 1.0.0  
**Objetivo:** sistema simples para a cantina escolar controlar cardapio e pedidos.

## Tecnologias e referencia

Baseado nos tipos de arquivos e na forma de programar do repositorio
[Entrega-da-Prova-Recuperacao](https://github.com/Pingusto193/Entrega-da-Prova-Recuperacao):
Node.js, Express, JavaScript puro, HTML, CSS, PostgreSQL, `pg`, `bcryptjs`,
`jsonwebtoken`, `cookie-parser`, consultas SQL parametrizadas e `fetch`.
**Nao usa React, Prisma, TypeScript ou ORM.** Para executar em producao local,
foram acrescentados Docker, Docker Compose e testes com o modulo nativo `node:test`.

## Estrutura

```text
EstuLanches/
|-- Dockerfile                # Cria a imagem do Node/Express
|-- docker-compose.yml        # Sobe a aplicacao e o PostgreSQL
|-- .env.example              # Exemplo de variaveis (sem segredos reais)
|-- db.js                     # Pool do PostgreSQL
|-- server.js                 # Rotas, autenticacao e pedidos
|-- validacoes.js             # Funcoes simples para validar dados
|-- sql.sql                   # Tabelas e produtos de exemplo
|-- package.json              # Bibliotecas equivalentes as da referencia
|-- package-lock.json         # Versões instaladas pelo npm ci
|-- public/
|   |-- index.html            # Tela de acesso, cardapio, carrinho e pedidos
|   |-- style.css
|   |-- img/                  # Imagens do site
|   `-- js/
|       |-- funcoes.js        # fetch/chamarAPI e funcoes comuns
|       |-- acesso.js         # login/cadastro
|       |-- produtos.js       # lista e administracao de produtos
|       `-- pedidos.js        # carrinho e historico
|-- tests/
|   |-- unit.test.js
|   `-- integration.test.js
`-- docs/
    |-- RDM_EstuLanches.pdf
    `-- Roteiro_Video.md
```

## Como executar

1. No GitHub, selecione **Code → Download ZIP** e extraia o arquivo. Abra o **Docker Desktop** e aguarde o motor iniciar. No VS Code, abra um terminal na pasta que contém `docker-compose.yml`. O Docker instala o Node.js e o PostgreSQL nos contêineres.
2. Na primeira execução, copie `.env.example` para `.env` (`Copy-Item .env.example .env` no PowerShell ou `cp .env.example .env` no macOS/Linux). Abra o novo `.env` e preencha `POSTGRES_PASSWORD` e `JWT_SECRET` com valores longos e exclusivos. Use letras e números, com pelo menos 32 caracteres no segredo JWT. Mantenha o `.env` fora do GitHub.
3. Execute:

```bash
docker compose up -d --build --wait
docker compose ps
```

4. Abra **http://127.0.0.1:3001** e crie sua conta. Se você alterar `APP_PORT` no `.env`, use a porta escolhida no navegador. No Docker Desktop, veja os serviços `app` e `db` em **Containers → estulanches**.
5. Para verificar a API e o banco:

```bash
docker compose exec app node -e "fetch('http://127.0.0.1:3000/saude').then(r=>r.text()).then(console.log)"
docker compose exec db psql -U postgres -d estulanches -c "SELECT id, nome, estoque FROM produto;"
```

Se você alterou `POSTGRES_USER` ou `POSTGRES_DB` no `.env`, ajuste os valores de `-U` e `-d`.

O comando `docker compose ps` deve mostrar `app` e `db` saudáveis. Se algum serviço falhar, consulte `docker compose logs --tail=80 app db`.

Na primeira execução, o Docker cria um banco separado e carrega os produtos de exemplo de `sql.sql`. Os usuários e pedidos do PostgreSQL local precisam ser migrados separadamente. Use `docker compose down` para parar os serviços e manter os dados do Docker.

## Administrador da cantina

Todo cadastro novo comeca como `aluno`, por seguranca. Para administrar o cardapio:

1. Registre no site uma conta com login `admincantina` e senha forte.
2. No banco, conceda a funcao de administrador:

```bash
docker compose exec db psql -U postgres -d estulanches -c "UPDATE usuario SET papel = 'admin' WHERE login = 'admincantina';"
```

3. Saia e entre novamente. A area administrativa permitira cadastrar, editar,
retirar produtos do cardapio e atualizar a situacao dos pedidos. Em producao,
conceda essa permissao somente a funcionarios autorizados.

## Testes

Execute **depois** que os dois containers estiverem saudaveis:

```bash
docker compose exec app npm run test:unit
docker compose exec app npm run test:integration
```

- **Unitarios:** verificam IDs, validacao de produtos, quantidades e total em centavos.
- **Integração:** verifica página, imagem, banco, cadastro, login/JWT, acesso negado ao aluno
  para manutencao do cardapio, pedido e baixa de estoque.
- O teste de integracao cadastra um usuario de teste e faz **um pedido real** no
  banco demonstrativo, por isso o estoque diminui 1 unidade a cada execucao.
- Para repetir com dados limpos em laboratorio, remova o volume **somente se
  puder perder todos os dados**: `docker compose down -v` e `docker compose up -d --build`.

## Rotas principais

| Metodo | Endpoint | Funcao | Acesso |
|---|---|---|---|
| GET | `/saude` | Estado da aplicacao e do banco | Publico |
| POST | `/registro` | Criar conta | Publico |
| POST | `/login` | Entrar | Publico |
| POST | `/logout` | Sair | Publico |
| GET | `/me` | Sessao atual | Logado |
| GET | `/produtos` | Ler cardapio | Publico |
| POST/PUT/DELETE | `/produtos` e `/produtos/:id` | Alterar cardapio | Admin |
| POST | `/pedidos` | Fazer pedido | Logado |
| GET | `/pedidos` | Consultar pedidos proprios | Logado |
| GET | `/pedidos/todos` | Consultar pedidos gerais | Admin |
| PUT | `/pedidos/:id` | Alterar situacao | Admin |

## Decisoes de arquitetura

- **Node + Express:** serve front e API no mesmo container, seguindo o exemplo.
- **PostgreSQL + `pg`:** usa `Pool`, SQL com `$1`, `$2`, etc. para evitar injeção SQL.
- **Banco isolado:** a porta 5432 nao esta publicada no host; o app se conecta ao
  servico `db` pela rede interna do Compose, usando `DB_HOST=db`.
- **Persistencia:** o volume `postgres_dados` preserva o banco entre recriacoes.
- **Transacoes e bloqueio `FOR UPDATE`:** confirmacao de pedido e baixa de estoque
  acontecem juntas, evitando venda de estoque insuficiente.
- **Seguranca:** bcrypt na senha, JWT com validade de 1 hora, cookie `HttpOnly`
  e `SameSite=Strict`, validacao no servidor, permissoes para admin, `.env` ignorado.
- **HTTPS:** o exemplo roda em HTTP local. Para publicacao na internet,
  configurar um proxy HTTPS e `COOKIE_SECURE=true`. Docker Compose isoladamente
  nao fornece TLS, backup automatico ou escalabilidade nacional.

## Comandos uteis

```bash
docker compose ps                 # Status e portas
docker compose logs -f app        # Logs da aplicacao
docker compose logs -f db         # Logs do banco
docker compose restart app        # Reinicia a aplicacao
docker compose up -d --build      # Reconstroi e atualiza
docker compose down              # Para sem apagar os dados
```

## Escalabilidade: 1 milhao de usuarios, 100 mil simultaneos (conceitual)

Esse Compose com uma instancia **nao suporta, por si so, 100 mil acessos simultaneos**.
Em um cenario nacional, o sistema precisaria de muitas instancias Node/Express
sem estado, um balanceador distribuindo as requisicoes, ajuste dos pools de
conexao, indices no PostgreSQL, replicas para consultas, backups, monitoramento,
limites de requisicao e testes de carga. Pedidos continuariam exigindo transacoes
para manter estoque consistente. O dimensionamento dependeria dos testes reais.

## Entrega da SA

Arquivos obrigatorios: `Dockerfile`, `docker-compose.yml`, `docs/RDM_EstuLanches.pdf`
e um **video autoral gravado de 2 a 5 minutos**. Use `docs/Roteiro_Video.md`.
Suba estes arquivos ao **seu** repositorio GitHub, sem `node_modules` e `.env`,
e coloque o link do repositorio nos comentarios da atividade.

> A Ficha RDM foi preparada como modelo preenchido com o que foi verificado nesta
> entrega. Os campos de implantacao Docker e testes de integracao ficam pendentes
> ate a execucao real. Nao marque como 'aprovado' sem apresentar os comandos e logs.

## Como enviar ao GitHub

Crie um repositorio vazio chamado `EstuLanches` na sua conta do GitHub.
Na pasta do projeto, execute (substituindo `SEU-USUARIO`):

```bash
git init
git add .
git status --short
git commit -m "Implantacao EstuLanches com Docker"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/EstuLanches.git
git push -u origin main
```

**Nao inclua** o `.env` real ou videos contendo segredos. Depois grave o video,
suba-o ao repositorio (ou forneca o link em `README.md`) e envie o link nos
comentarios da atividade.
