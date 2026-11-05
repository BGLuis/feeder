<div align="center">

<!-- Badges de Status do GitHub -->
![GitHub Stars](https://www.shieldcn.dev/github/stars/bgluis/feeder.svg?variant=secondary&size=sm)
![GitHub Forks](https://www.shieldcn.dev/github/forks/bgluis/feeder.svg?variant=secondary&size=sm)
![Watchers](https://www.shieldcn.dev/github/watchers/bgluis/feeder.svg?variant=secondary&size=sm)
![Contributors](https://www.shieldcn.dev/github/contributors/bgluis/feeder.svg?theme=emerald&size=sm)
![License](https://www.shieldcn.dev/github/license/bgluis/feeder.svg?variant=ghost&size=sm)

<br/>

<!-- Badges das Tecnologias Utilizadas -->
![TypeScript](https://www.shieldcn.dev/badge/TypeScript-3178C6?logo=typescript&variant=branded&size=sm)
![NestJS](https://www.shieldcn.dev/badge/NestJS-E0234E?logo=nestjs&variant=branded&size=sm)
![Angular](https://www.shieldcn.dev/badge/Angular-DD0031?logo=angular&variant=branded&size=sm)
![MySQL](https://www.shieldcn.dev/badge/MySQL-4479A1?logo=mysql&variant=branded&size=sm)
![Redis](https://www.shieldcn.dev/badge/Redis-DC382D?logo=redis&variant=branded&size=sm)

  <h3>Feeder</h3>
  Uma plataforma para agregar e acompanhar melhor as suas notícias diárias.
</div>

*Read this in [English](README.en.md).*

# 📖 Sobre
O **Feeder** é um agregador de notícias moderno construído com foco em organização. A arquitetura divide-se em um frontend interativo desenvolvido com Angular e um backend robusto em NestJS. O sistema utiliza MySQL para persistência de dados e Redis em conjunto com BullMQ para gerenciamento de filas e cache, garantindo alta performance e escalabilidade.

# 📋 Motivo
Este projeto nasceu como uma maneira de acompanhar melhor as minhas próprias notícias, centralizando as informações de forma eficiente em um único lugar.

# 💻 Como iniciar

### Requisitos
- [Docker](https://docs.docker.com/get-docker/) e Docker Compose (Recomendado)
- [Node.js](https://nodejs.org/) (Recomendado versão 24.14.0)

### Instalação

1. Clone o repositório do projeto:
  ```sh
  git clone https://github.com/bgluis/feeder.git
  ```

2. Navegue até o diretório do projeto:
  ```sh
  cd feeder
  ```

3. Crie o arquivo de variáveis de ambiente com base no exemplo:
  ```sh
  cp .env.example .env
  ```

#### Método 1: Via Docker Compose (Recomendado)

Com o Docker instalado, você pode subir o ambiente de desenvolvimento (MySQL, Redis, Backend com watch e Frontend com reload) com:

```sh
docker compose up -d
```
Acesse a aplicação em `http://localhost:4200`, a API em `http://localhost:3000`, a documentação Swagger em `http://localhost:3000/api/docs` e o health check em `http://localhost:3000/health`.

Para rodar o ambiente de produção otimizado:
```sh
docker compose -f docker-compose.prod.yml up -d
```

#### Método 2: Execução Manual / Nativa

Se preferir rodar os serviços separadamente na sua máquina:

1. Inicie o MySQL e o Redis (você pode usar os containers se desejar).
2. Instale as dependências e inicie o Backend:
  ```sh
  cd backend
  npm install
  npm run start:dev
  ```
3. Em outro terminal, instale as dependências e inicie o Frontend:
  ```sh
  cd frontend
  npm install
  npm start
  ```

# ⚙️ Variáveis de Ambiente

As seguintes variáveis de ambiente são utilizadas neste projeto. Configure-as no seu arquivo `.env`:

| Variável | Descrição | Valor Padrão (Exemplo) |
|---|---|---|
| `NODE_ENV` | Ambiente de execução do Node (`development`, `production`, `test`) | `development` |
| `PORT` | Porta do backend | `3000` |
| `DB_HOST` | Host do MySQL (use `mysql` via Docker, ou `localhost` localmente) | `localhost` |
| `DB_PORT` | Porta do banco de dados MySQL | `3306` |
| `DB_ROOT_PASSWORD` | Senha root do MySQL | `rootpassword` |
| `DB_NAME` | Nome do banco de dados principal | `feeder` |
| `DB_USER` | Usuário do banco de dados | `feederuser` |
| `DB_PASSWORD` | Senha do banco de dados | `feederpassword` |
| `REDIS_HOST` | Host do Redis (use `redis` via Docker, ou `localhost` localmente) | `localhost` |
| `REDIS_PORT` | Porta do Redis | `6379` |
| `REDIS_PASSWORD` | Senha do Redis (opcional) | `""` |
| `JWT_SECRET` | Chave secreta para assinatura de JWT (mínimo 32 caracteres) | `sua_chave_secreta_super_segura_min_32` |
| `JWT_EXPIRATION` | Tempo de expiração do token JWT | `1d` |
| `ENCRYPTION_KEY` | Chave AES-256-GCM de 32 bytes em hex (64 caracteres) para dados em repouso | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` |
| `RP_NAME` | Nome do provedor WebAuthn (Passkeys) | `Feeder App` |
| `RP_ID` | ID do provedor WebAuthn | `localhost` |
| `ORIGIN` | Origem permitida para o Frontend (WebAuthn) | `http://localhost:4200` |
| `ALLOWED_ORIGINS` | Lista CSV de origens permitidas via CORS | `http://localhost:4200` |
| `SSRF_ALLOWED_HOSTS` | Lista CSV de hostnames que ignoram o guard SSRF | `""` |
| `ENABLE_SWAGGER` | Habilita a documentação OpenAPI/Swagger em `/api/docs` | `true` |
| `PHPMYADMIN_PORT` | Porta exposta do PhpMyAdmin (docker-compose.tools.yml) | `8080` |
| `REDISCOMMANDER_PORT`| Porta exposta do Redis Commander (docker-compose.tools.yml)| `8081` |

# 🤝 Contribuidores
 <a href="https://github.com/bgluis/feeder/graphs/contributors">
   <img src="https://contrib.rocks/image?repo=bgluis/feeder"/>
 </a>
