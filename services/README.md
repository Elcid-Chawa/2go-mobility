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
database name. Delivery supports customer booking and pricing, Operations
dispatch, driver execution and location updates, and Operations payment
confirmation. The Docker Compose stack currently runs these databases on the
existing MongoDB server; production can move each service to its own MongoDB
deployment by changing that service's `MONGODB_URI`.

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

The Car Rentals service provides an agency marketplace with Operations-reviewed
agency applications, vehicles, drivers, and rates. Customer and partner requests
are authenticated against the central backend's `/auth/me` endpoint; the rental
service stores its own domain records and does not duplicate identity credentials.
Configure `AUTH_API_URL` for the network location of that backend.
Uploaded customer licence documents are kept outside MongoDB in `UPLOAD_DIR`;
the Compose service persists them in the `rental-uploads` volume and only serves
them through an authenticated, owner/Operations-checked download route. Files
are encrypted with AES-256-GCM at rest. Generate a private key with
`openssl rand -base64 32`, store it in the runtime environment as
`RENTAL_DOCUMENT_ENCRYPTION_KEY`, and keep a protected backup of that key:
documents cannot be recovered without it. The rental service refuses document
uploads if a valid encryption key is not configured.

The Movers service uses the same central identity service, with a separate
`MOVER_PARTNER` agency account. Customers create scheduled move requests with
addresses, move type, inventory notes, vehicle preference, access/floor details,
and requested crew size. Approved agencies choose an active vehicle and send a
quote; a customer can accept one quote, which reserves that vehicle for the
requested move window. Operations can approve agencies/vehicles, create a
platform-managed provider without an agency login, monitor requests and quotes,
and record cash payment after completion. Quotes are manually priced by each
agency; online payments and GPS tracking are not part of this MVP.

Set `EXPO_PUBLIC_RENTALS_API_URL` for the mobile app and
`NEXT_PUBLIC_RENTALS_API_URL` for Operations. For local development these point
to port 5103; behind Nginx they can point to the same host's
`/api/v1/car-rentals` path. Browser origins must be included in the rental
service's comma-separated `CORS_ORIGINS` setting. The current testing
configuration uses `*`; native mobile requests do not use browser CORS.

For Movers, set `EXPO_PUBLIC_MOVERS_API_URL` and `NEXT_PUBLIC_MOVERS_API_URL`.
Locally these point to port 5101; behind Nginx they can use the same host's
`/api/v1/movers` path. Agency partners can apply at `/movers/apply` and manage
their fleet and quotes at `/movers`. Operations can create agencies and trucks,
quote for platform-managed agencies, monitor the move lifecycle, and record
cash payment from the same Operations page.

## Delivery workflow

Customers enter pickup and destination addresses, recipient contact details,
parcel size and weight, and handling notes in the mobile Delivery tab. The
mobile app resolves addresses to coordinates and requests an authenticated,
server-calculated fare. The MVP estimate uses a straight-line distance with an
Operations-configured road factor, per-kilometre fee, base fee, and per-kilogram
fee; it is an estimate, not a navigation route. Delivery orders are created
with a fare snapshot and start in `REQUESTED`.

Operations users and Dispatchers can review orders in `/delivery`, adjust the
tariff, assign an approved active driver who is online and available, cancel
active orders, and record cash or mobile-money payment after delivery. A
successful assignment also marks the driver's central ride-hailing availability
as busy so the dispatch engine cannot offer that driver another ride or
delivery at the same time. Drivers see assigned jobs in the mobile Deliveries
tab, confirm pickup, start transit, and confirm delivery. Driver GPS updates
are shared with Operations and the customer while the job is active. Customers
can cancel only before assignment and can rate a delivered parcel once.

Delivery API routes include `POST /api/v1/delivery/pricing/estimate`,
`POST /api/v1/delivery/orders`, `GET /api/v1/delivery/orders/mine`,
`GET /api/v1/delivery/driver/orders`, and the `/admin` operations endpoints.
Configure `EXPO_PUBLIC_DELIVERY_API_URL` for mobile and
`NEXT_PUBLIC_DELIVERY_API_URL` for Operations. Local defaults use port 5104;
behind Nginx use `/api/v1/delivery`.

For the current testing period, `CORS_ALLOW_ALL` defaults to `true` for the
central API and domain services. This allows wildcard CORS origins (`*`) and
does not enable credentialed browser requests; clients authenticate with
bearer tokens. Before public production use, set `CORS_ALLOW_ALL=false` and
provide trusted origins through `CORS_ORIGIN`, `MOVERS_CORS_ORIGINS`,
`RENTALS_CORS_ORIGINS`, and `DELIVERY_CORS_ORIGINS`. Native mobile HTTP
clients do not enforce browser CORS.

## Car-rental MVP workflow

1. A prospective agency creates a `RENTAL_PARTNER` account and applies in the
   Operations web app at `/rentals/apply`.
2. Operations approves the agency. The agency partner portal then accepts
   vehicle, driver, and hourly/daily/weekly rate submissions.
3. Operations can also create an approved agency directly in the rentals
   console. Leave the partner user ID blank to make it Operations-managed; this
   supports 2GO-owned inventory or agencies without a partner account. Operations
   can add active vehicles and active rates for any approved agency. Partner
   submissions continue to require Operations review. Only active listings from
   approved agencies with an active rate are visible to customers.
4. Customers submit driving-licence details for manual Operations verification
   before self-drive quotes. Chauffeur bookings require an available approved
   agency driver.
5. A booking is held pending agency confirmation. Customers can cancel only
   while awaiting confirmation. Cash is recorded manually by Operations; a
   confirmed booking is completed only after its end date and payment record.

Pricing assumption for this MVP: the service selects hourly billing below 24
hours, daily billing from 24 to below 168 hours, and weekly billing at 168 hours
or longer, rounding partial units up. Chauffeur charges are rounded up by day;
the security deposit is included in the upfront amount due. Currency conversion,
online payment, deposit refunds, cancellation after agency confirmation, mileage
limits, and timezone-specific cutoff rules are not implemented. Agencies should
configure their rates and customer-facing details with those limits in mind.
MongoDB creates collections and indexes when the service first connects and
writes; connecting alone does not create collections.
