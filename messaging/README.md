# Local messaging service

Phoenix Channels provides ephemeral, real-time ride chat. It verifies the
backend-issued JWT at WebSocket connect, then asks the ride-share backend to
authorize the authenticated user for the specific trip before joining its chat
room. Messages are broadcast to connected room members and are not persisted.

## Environment

The local development defaults match the backend's development access-token
secret and API URL. To use your own values, set these in the same terminal
before starting Phoenix:

```powershell
$env:JWT_ACCESS_SECRET = "the-backend-JWT_ACCESS_SECRET"
$env:BACKEND_API_URL = "http://localhost:5000/api/v1"
$env:PORT = "4000"
```

[.env.example](./.env.example) documents the values, but Mix does not
automatically load a `.env` file. Do not commit a real `.env` file.

## Run outside Docker

Install Elixir 1.15+ and Erlang/OTP, then start MongoDB and the Node backend.
From the `messaging` directory:

```powershell
mix deps.get
mix phx.server
```

Check the service:

```powershell
Invoke-RestMethod http://localhost:4000/health
```

Run the mobile app or Ops web locally, sign in through the main backend, open
an actual trip, and use its chat. The messaging service checks access by
calling `GET /api/v1/trips/:id` with the same bearer token. A trip customer,
assigned driver, Operations user, or Admin can join according to backend trip
authorization.

For an Android emulator, use `EXPO_PUBLIC_MESSAGING_URL=ws://10.0.2.2:4000`.
For a physical phone, use the computer's LAN address, such as
`ws://192.168.1.20:4000`. In Ops web, set
`NEXT_PUBLIC_MESSAGING_URL=ws://localhost:4000`. For production behind Nginx,
set the app's messaging URL to the public host origin (for example,
`wss://2go.example.com`); Nginx routes `/socket/websocket` to this service.

The `mix phx.server` development server binds to `0.0.0.0:4000`. If a phone
cannot connect, allow inbound port 4000 through the development machine's
firewall or route the connection through the local Nginx port 80.

Chat messages exist only while participants are connected. Durable message
history, media uploads, support-ticket authorization, and automated messaging
tests are not implemented yet.
