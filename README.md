# StockFlow API

API para gestionar inventario, productos, categorías y movimientos de stock. StockFlow permite registrar entradas y salidas de productos y mantener actualizado el nivel disponible de cada artículo.

## Stack tecnológico

- Node.js
- TypeScript
- NestJS 11
- Prisma ORM 7
- PostgreSQL 17
- Docker y Docker Compose
- pnpm
- `@nestjs/config` y Joi para configuración y validación de variables de entorno

## Requisitos previos

Antes de comenzar, debes tener instalado:

- Node.js 20.19 o superior
- pnpm
- Docker Desktop o Docker Engine con Docker Compose

Puedes comprobar las versiones instaladas con:

```bash
node --version
pnpm --version
docker --version
docker compose version
```

## Instalación de dependencias

Instala las dependencias del proyecto:

```bash
pnpm install
```

## Configuración de variables de entorno

Copia el archivo de ejemplo para crear tu configuración local:

```bash
cp .env.example .env
```

Variables disponibles:

| Variable            | Descripción                                           | Valor de ejemplo                                                             |
| ------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `POSTGRES_USER`     | Usuario de PostgreSQL                                 | `stockflow`                                                                  |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL                              | `stockflow`                                                                  |
| `POSTGRES_DB`       | Nombre de la base de datos                            | `stockflow_db`                                                               |
| `POSTGRES_PORT`     | Puerto de PostgreSQL en la máquina local              | `5433`                                                                       |
| `DATABASE_URL`      | URL utilizada por Prisma para conectarse a PostgreSQL | `postgresql://stockflow:stockflow@localhost:5433/stockflow_db?schema=public` |
| `PORT`              | Puerto HTTP de la API                                 | `3000`                                                                       |

`DATABASE_URL` es obligatoria y debe usar el esquema `postgres` o `postgresql`. La aplicación también valida que `PORT` sea un puerto válido.

## Configuración de PostgreSQL

Inicia PostgreSQL 17 con Docker Compose:

```bash
docker compose up -d
```

El puerto `5433` de la máquina local se conecta con el puerto `5432` del contenedor.

Comprueba el estado del servicio:

```bash
docker compose ps
```

Para consultar los registros de PostgreSQL:

```bash
docker compose logs -f postgres
```

Para detener los servicios sin eliminar los datos:

```bash
docker compose down
```

## Migraciones de Prisma

Para crear y aplicar una nueva migración durante el desarrollo:

```bash
pnpm prisma:migrate --name nombre_de_la_migracion
```

Por ejemplo:

```bash
pnpm prisma:migrate --name init
```

Después de cambiar el esquema o ejecutar una migración, genera Prisma Client:

```bash
pnpm prisma:generate
```

Para aplicar migraciones existentes en un entorno de producción:

```bash
pnpm exec prisma migrate deploy
```

## Iniciar el servidor

Inicia la API en modo desarrollo con recarga automática:

```bash
pnpm start:dev
```

La API estará disponible en:

```text
http://localhost:3000
```

Para compilar y ejecutar la versión de producción:

```bash
pnpm build
pnpm start:prod
```
