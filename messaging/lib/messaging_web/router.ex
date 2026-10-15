defmodule MessagingWeb.Router do
  use Phoenix.Router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", MessagingWeb do
    pipe_through :api

    get "/health", HealthController, :check
  end
end

defmodule MessagingWeb.HealthController do
  use Phoenix.Controller

  def check(conn, _params) do
    json(conn, %{
      status: "UP",
      service: "2GO Messaging Microservice (Elixir/Phoenix)",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })
  end
end

