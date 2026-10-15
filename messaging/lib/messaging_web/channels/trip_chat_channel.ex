defmodule MessagingWeb.TripChatChannel do
  @moduledoc """
  Manages in-trip instant messaging between Rider, Driver, and Operations desk.
  """

  use Phoenix.Channel
  alias MessagingWeb.Presence
  alias Messaging.TripAccess
  require Logger

  @impl true
  def join("chat:trip:" <> trip_id, _params, socket) do
    if TripAccess.authorized?(socket.assigns.access_token, trip_id) do
      send(self(), :after_join)
      Logger.info("User #{socket.assigns.user_id} joined trip chat: #{trip_id}")

      {:ok, %{status: "connected", trip_id: trip_id},
       assign(socket, :trip_id, trip_id)}
    else
      {:error, %{reason: "not authorized for this trip"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    push(socket, "presence_state", Presence.list(socket))

    {:ok, _} =
      Presence.track(socket, socket.assigns.user_id, %{
        online_at: inspect(System.system_time(:second)),
        role: socket.assigns.role,
        email: socket.assigns.email
      })

    {:noreply, socket}
  end

  @impl true
  def handle_in("new_msg", %{"body" => body} = params, socket)
      when is_binary(body) and byte_size(body) > 0 and byte_size(body) <= 2000 do
    message_payload = %{
      id: "MSG-" <> Integer.to_string(System.system_time(:millisecond)),
      trip_id: socket.assigns.trip_id,
      from_user_id: socket.assigns.user_id,
      sender_role: socket.assigns.role,
      body: body,
      media_url: Map.get(params, "media_url"),
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    }

    broadcast!(socket, "new_msg", message_payload)
    {:reply, {:ok, message_payload}, socket}
  end

  def handle_in("new_msg", _params, socket) do
    {:reply, {:error, %{reason: "message body must be 1 to 2000 bytes"}}, socket}
  end

  @impl true
  def handle_in("typing", %{"is_typing" => is_typing}, socket)
      when is_boolean(is_typing) do
    broadcast_from!(socket, "user_typing", %{
      user_id: socket.assigns.user_id,
      role: socket.assigns.role,
      is_typing: is_typing
    })

    {:noreply, socket}
  end

  def handle_in("typing", _params, socket) do
    {:reply, {:error, %{reason: "is_typing must be a boolean"}}, socket}
  end

  @impl true
  def handle_in("read_receipt", %{"message_id" => msg_id}, socket) do
    broadcast_from!(socket, "message_read", %{
      message_id: msg_id,
      read_by: socket.assigns.user_id,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    {:noreply, socket}
  end
end
