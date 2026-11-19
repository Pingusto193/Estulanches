# Ficha Simplificada de Registro de Mudança (RDM)

**Projeto:** EstuLanches — implantação local com Docker Compose

**Versão implantada:** 1.0.0, revisão `fc828a4`.

**Data e horário:** 19/11/2026, às 11h46min54s (horário de Brasília, UTC−03), início do contêiner da aplicação. Validação concluída às 11h47min01s.

## Parâmetros da implantação

- Aplicação em Node.js 22 Alpine, com `NODE_ENV=production` e porta interna 3000. No ambiente de validação, `APP_PORT=0` atribuiu a porta local 32768. O padrão do projeto é 3001.
- PostgreSQL 17 Alpine, com `DB_HOST=db`, banco `estulanches` e usuário `postgres`. Banco acessível pela rede interna do Compose, com volume próprio e inicialização por `sql.sql`.
- `COOKIE_SECURE=false` para HTTP local. Senha do banco e segredo JWT fornecidos via `.env`.

## Testes de validação

- **Inicialização e saúde:** `docker compose up -d --build --wait` concluiu com `app` e `db` saudáveis. `GET /saude` retornou HTTP 200, aplicação e banco com status `ok` e versão 1.0.0.
- **Testes unitários:** 4 de 4 aprovados. Validação de IDs, produto, itens do pedido e cálculo do total.
- **Testes de integração:** 2 de 2 aprovados. Página, imagem, banco, cardápio, cadastro, sessão, permissões, pedido, histórico e baixa de estoque.
- **Evidência:** `docker compose -p estulanches-rdm-20261119 exec -T app npm test` terminou com código 0.

## Status final

**Implantação aprovada no ambiente local de validação.** Os contêineres de validação foram encerrados após os testes. A instância local preexistente permaneceu saudável na porta 3001. Publicação em produção fora do escopo desta validação.
