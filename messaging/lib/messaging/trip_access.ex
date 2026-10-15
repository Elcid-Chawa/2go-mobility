defmodule Messaging.TripAccess do
  @moduledoc false

  def authorized?(token, trip_id) when is_binary(token) and is_binary(trip_id) do
    if Regex.match?(~r/\A[0-9a-fA-F]{24}\z/, trip_id) do
      verify_with_backend(token, trip_id)
    else
      false
    end
  end

  def authorized?(_token, _trip_id), do: false

  defp verify_with_backend(token, trip_id) do
    base_url =
      Application.get_env(
        :messaging,
        :backend_api_url,
        "http://localhost:5000/api/v1"
      )

    url = String.trim_trailing(base_url, "/") <> "/trips/" <> trip_id
    headers = [{~c"authorization", String.to_charlist("Bearer " <> token)}]

    case :httpc.request(
           :get,
           {String.to_charlist(url), headers},
           [timeout: 3_000, connect_timeout: 2_000],
           [{:body_format, :binary}]
         ) do
      {:ok, {{_http_version, 200, _reason}, _response_headers, body}} ->
        case Jason.decode(body) do
          {:ok, %{"success" => true, "data" => data}} when is_map(data) -> true
          _ -> false
        end

      _ ->
        false
    end
  end
end
