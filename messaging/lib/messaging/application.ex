defmodule Messaging.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Phoenix.PubSub, name: Messaging.PubSub},
      MessagingWeb.Presence,
      MessagingWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: Messaging.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    MessagingWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end

