defmodule MessagingWeb.UserSocket do
  use Phoenix.Socket
  require Logger

  # Channels
  channel "chat:trip:*", MessagingWeb.TripChatChannel
  channel "chat:support:*", MessagingWeb.SupportChatChannel

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    case Messaging.TokenVerifier.verify_token(token) do
      {:ok, %{"userId" => user_id} = claims} ->
        role = Map.get(claims, "role", "CUSTOMER")
        email = Map.get(claims, "email", "")
        Logger.info("WebSocket authenticated for user: #{user_id} (#{role})")

        {:ok,
         socket
         |> assign(:user_id, user_id)
         |> assign(:role, role)
         |> assign(:email, email)
         |> assign(:access_token, token)}

      {:error, reason} ->
        Logger.warning("WebSocket authentication rejected: #{inspect(reason)}")
        :error
    end
  end

  def connect(_params, _socket, _connect_info) do
    Logger.warning("WebSocket connection attempt missing token parameter")
    :error
  end

  @impl true
  def id(socket), do: "users_socket:#{socket.assigns.user_id}"
end
