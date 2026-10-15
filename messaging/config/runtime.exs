import Config

if config_env() == :prod do
  port = String.to_integer(System.get_env("PORT") || "4000")
  jwt_secret =
    System.get_env("JWT_ACCESS_SECRET") ||
      raise """
      environment variable JWT_ACCESS_SECRET is missing.
      This secret must match the Node.js backend JWT_ACCESS_SECRET.
      """

  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      Set a unique, randomly generated secret for the Phoenix endpoint.
      """

  backend_api_url =
    System.get_env("BACKEND_API_URL") ||
      raise """
      environment variable BACKEND_API_URL is missing.
      It must point to the ride-share API base URL, for example
      http://backend:5000/api/v1 when running in Docker Compose.
      """

  config :messaging, MessagingWeb.Endpoint,
    http: [ip: {0, 0, 0, 0}, port: port],
    secret_key_base: secret_key_base,
    server: true

  config :messaging,
    jwt_secret: jwt_secret,
    backend_api_url: backend_api_url
end
