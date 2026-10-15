# 2GO Domain Services

The ride-share API in `backend/` remains the identity and ride-hailing service.
The following services are separate Node.js/Express/TypeScript applications:

| Service | Directory | API prefix | MongoDB database | Local port |
| --- | --- | --- | --- | --- |
| Movers | `services/movers` | `/api/v1/movers` | `2go_movers` | 5101 |
| Shopping | `services/shopping` | `/api/v1/shopping` | `2go_shopping` | 5102 |
| Car rentals | `services/car-rentals` | `/api/v1/car-rentals` | `2go_car_rentals` | 5103 |
| Delivery | `services/delivery` | `/api/v1/delivery` | `2go_delivery` | 5104 |

Each service has an independent package, Docker image, process, and MongoDB
database name. The Docker Compose development/deployment stack currently runs
these databases on the existing MongoDB server; production can move each service
to its own MongoDB deployment by changing that service's `MONGODB_URI`.

## Run locally

Start MongoDB, then in a service directory:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

For example, Movers runs on port 5101. Its health endpoints are
`http://localhost:5101/health` and `http://localhost:5101/api/v1/movers/health`.
Use `npm run build` to type-check and compile, then `npm start` to run the build.

## Run the complete Docker stack

From the `docker` directory:

```powershell
docker compose up --build
```

The new APIs are routed through Nginx:

- `http://localhost/api/v1/movers/health`
- `http://localhost/api/v1/shopping/health`
- `http://localhost/api/v1/car-rentals/health`
- `http://localhost/api/v1/delivery/health`

The starter services only expose health endpoints. Domain-specific models,
routes, authorization rules, and workflows should be added as each service's
requirements are agreed. MongoDB creates a database/collection after the
service writes its first document; connecting alone does not create collections.
