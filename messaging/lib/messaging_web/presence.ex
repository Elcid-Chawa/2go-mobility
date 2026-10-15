defmodule MessagingWeb.Presence do
  @moduledoc """
  Provides real-time presence tracking and typing status across Phoenix Channels.
  """

  use Phoenix.Presence,
    otp_app: :messaging,
    pubsub_server: Messaging.PubSub
end

