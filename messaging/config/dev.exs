import Config

# For development, we configure the endpoint to listen on port 4000
config :messaging, MessagingWeb.Endpoint,
  http: [ip: {0, 0, 0, 0}, port: 4000],
  check_origin: false,
  debug_errors: true,
  code_reloader: false

config :messaging,
  jwt_secret: System.get_env("JWT_ACCESS_SECRET") ||
    "2go_fallback_access_secret_key_32chars_min",
  backend_api_url: System.get_env("BACKEND_API_URL") ||
    "http://localhost:5000/api/v1"

config :logger, :console, format: "[$level] $message\n"
