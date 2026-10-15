defmodule MessagingWeb.SupportChatChannel do
  @moduledoc """
  Manages support communication channels between customers/drivers and operational dispatch agents.
  """

  use Phoenix.Channel

  @impl true
  def join("chat:support:" <> _ticket_id, _params, _socket),
    do: {:error, %{reason: "support ticket authorization is not configured"}}
end
