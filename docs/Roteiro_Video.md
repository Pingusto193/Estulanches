# Roteiro do video - EstuLanches (aprox. 3 min e 30 s)

Grave a tela do VS Code, Docker e navegador, e apresente-se com seu nome.
O video precisa ter **entre 2 e 5 minutos** e explicar todos os itens abaixo.

**00:00-00:25 | Autor e problema**

"Meu nome e [seu nome] e este e o EstuLanches. A cantina precisa organizar
seus produtos e pedidos sem depender de anotacoes em papel. O sistema permite
que alunos entrem na conta, consultem o cardapio e facam pedidos. O admin
controla produtos e andamento dos pedidos."

**00:25-01:00 | Tecnologias e arquitetura**

"Usei JavaScript, HTML, CSS, Node.js, Express e PostgreSQL, seguindo a base
que o professor indicou. O `server.js` concentra as rotas, o `db.js` usa o
Pool do `pg`, o `sql.sql` cria as tabelas e o front usa `fetch` em arquivos
separados. Nao usei React nem Prisma."

**01:00-01:35 | Docker**

"O Dockerfile parte da imagem Node, instala as dependencias, copia o codigo e
inicia o servidor na porta 3000 interna. No navegador, abro http://127.0.0.1:3001.
O Docker Compose cria o app e o PostgreSQL,
aguarda a saude do banco, isola a porta 5432 e usa um volume para manter os
dados. Vou mostrar `docker compose ps` e os logs."

**01:35-02:15 | Codigo e testes**

"As senhas usam bcrypt e a sessao usa JWT dentro de cookie HttpOnly. O SQL usa
parametros, evitando concatenar dados do usuario. Ao criar pedido, a
transacao atualiza estoque e pedido juntos. Os testes unitarios verificam
validacoes e calculo; os de integracao testam o cadastro, login, banco, pedido
e estoque. Agora executo ambos e mostro os resultados reais no terminal."

**02:15-02:55 | Demonstracao do sistema**

Mostre cadastro/login, cardapio, adicionar um produto ao carrinho, finalizar,
visualizar historico. Se houver conta admin, mostre cadastrar/editar produto
e alterar situacao do pedido.

**02:55-03:15 | Ficha RDM e seguranca**

"Aqui esta a Ficha de Registro de Mudanca com versao 1.0.0, parametros, data,
resultados dos testes e status final. A senha do banco e a chave JWT ficam
no `.env`, que nao vai para o GitHub. Para producao real seria necessario HTTPS."

**03:15-03:40 | Escalabilidade conceitual**

"Para chegar a 1 milhao de usuarios e picos de 100 mil simultaneos, uma
instancia nao basta. Precisariamos de multiplos servidores Node atras de
balanceamento de carga, banco otimizado com indices, replicas de consulta,
monitoramento, backups e testes de carga. O Docker local e so a primeira etapa."

**Dica:** nao afirme que todos os testes passaram se eles nao passaram.
Mostre efetivamente `docker compose ps`, os logs e os testes ao gravar.
