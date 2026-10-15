defmodule Messaging.TokenVerifier do
  @moduledoc """
  Validates incoming Node.js JWT access tokens using HS256 and the shared JWT_ACCESS_SECRET.
  """

  use Joken.Config

  @impl true
  def token_config do
    default_claims(skip: [:aud, :iss])
  end

  @doc """
  Verifies a JWT string against the configured JWT_ACCESS_SECRET.
  Returns `{:ok, claims}` or `{:error, reason}`.
  """
  def verify_token(token) do
    secret = Application.get_env(:messaging, :jwt_secret, "2go_prod_jwt_access_secret_key_32chars_min")
    signer = Joken.Signer.create("HS256", secret)
    Joken.verify(token, signer)
  end
end

