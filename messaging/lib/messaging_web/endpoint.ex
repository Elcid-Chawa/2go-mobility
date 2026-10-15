defmodule MessagingWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :messaging

  # WebSocket endpoint
  socket "/socket", MessagingWeb.UserSocket,
    websocket: [
      timeout: 45_000,
      check_origin: false
    ],
    longpoll: false

  # CORS middleware
  plug CORSPlug,
    origin: ["*"],
    headers: ["Authorization", "Content-Type", "Accept", "Origin", "User-Agent"]

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug MessagingWeb.Router
end

