<div align="center">

<!-- GitHub Status Badges -->
![GitHub Stars](https://www.shieldcn.dev/github/stars/bgluis/feeder.svg?variant=secondary&size=sm)
![GitHub Forks](https://www.shieldcn.dev/github/forks/bgluis/feeder.svg?variant=secondary&size=sm)
![Watchers](https://www.shieldcn.dev/github/watchers/bgluis/feeder.svg?variant=secondary&size=sm)
![Contributors](https://www.shieldcn.dev/github/contributors/bgluis/feeder.svg?theme=emerald&size=sm)
![License](https://www.shieldcn.dev/github/license/bgluis/feeder.svg?variant=ghost&size=sm)

<br/>

<!-- Technology Badges -->
![TypeScript](https://www.shieldcn.dev/badge/TypeScript-3178C6?logo=typescript&variant=branded&size=sm)
![NestJS](https://www.shieldcn.dev/badge/NestJS-E0234E?logo=nestjs&variant=branded&size=sm)
![Angular](https://www.shieldcn.dev/badge/Angular-DD0031?logo=angular&variant=branded&size=sm)
![MySQL](https://www.shieldcn.dev/badge/MySQL-4479A1?logo=mysql&variant=branded&size=sm)
![Redis](https://www.shieldcn.dev/badge/Redis-DC382D?logo=redis&variant=branded&size=sm)

  <h3>Feeder</h3>
  A platform to easily aggregate and keep track of your daily news.
</div>

*Leia em [Português](README.md).*

# 📖 About
**Feeder** is a modern news aggregator built with a focus on organization. The architecture is divided into an interactive frontend developed with Angular and a robust backend in NestJS. The system uses MySQL for data persistence and Redis combined with BullMQ for queue management and caching, ensuring high performance and scalability.

# 📋 Motivation
This project was born as a way to better keep track of my own news, centralizing information efficiently in a single place.

# 💻 Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (Recommended)
- [Node.js](https://nodejs.org/) (Recommended version 24.14.0)

### Installation

1. Clone the project repository:
  ```sh
  git clone https://github.com/bgluis/feeder.git
  ```

2. Navigate to the project directory:
  ```sh
  cd feeder
  ```

3. Create the environment variables file based on the example:
  ```sh
  cp .env.example .env
  ```

#### Method 1: Via Docker Compose (Recommended)

With Docker installed, you can spin up the entire infrastructure (MySQL, Redis, Backend, and Frontend) with a single command:

```sh
docker-compose up -d
```
Access the application at `http://localhost:4200` and the API at `http://localhost:3000`.

#### Method 2: Manual / Native Execution

If you prefer to run the services separately on your machine:

1. Start MySQL and Redis (you can use their respective containers if you wish).
2. Install dependencies and start the Backend:
  ```sh
  cd backend
  npm install
  npm run start:dev
  ```
3. In another terminal, install dependencies and start the Frontend:
  ```sh
  cd frontend
  npm install
  npm start
  ```

# ⚙️ Environment Variables

The following environment variables are used in this project. Configure them in your `.env` file:

| Variable | Description | Default Value (Example) |
|---|---|---|
| `NODE_ENV` | Node execution environment | `development` |
| `PORT` | Backend port | `3000` |
| `DB_HOST` | MySQL host (use `mysql` in Docker, or `localhost` locally) | `localhost` |
| `DB_PORT` | MySQL database port | `3306` |
| `DB_ROOT_PASSWORD` | MySQL root password | `rootpassword` |
| `DB_NAME` | Main database name | `feeder` |
| `DB_USER` | Database user | `feederuser` |
| `DB_PASSWORD` | Database password | `feederpassword` |
| `REDIS_HOST` | Redis host (use `redis` in Docker, or `localhost` locally) | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | Secret key for JWT signing | `sua_chave_secreta_super_segura` |
| `JWT_EXPIRATION` | JWT expiration time | `1d` |
| `RP_NAME` | WebAuthn provider name (Passkeys) | `Feeder App` |
| `RP_ID` | WebAuthn provider ID | `localhost` |
| `ORIGIN` | Allowed origin for Frontend | `http://localhost:4200` |
| `PHPMYADMIN_PORT` | PhpMyAdmin exposed port (docker-compose.tools.yml) | `8080` |
| `REDISCOMMANDER_PORT`| Redis Commander exposed port (docker-compose.tools.yml)| `8081` |

# 🤝 Contributors
 <a href="https://github.com/bgluis/feeder/graphs/contributors">
   <img src="https://contrib.rocks/image?repo=bgluis/feeder"/>
 </a>
