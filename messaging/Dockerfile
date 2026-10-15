# Multi-stage Dockerfile for Elixir / Phoenix Messaging Microservice
FROM hexpm/elixir:1.17.3-erlang-27.1-alpine-3.20.3 AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache build-base git

# Install hex and rebar
RUN mix local.hex --force && \
    mix local.rebar --force

ENV MIX_ENV=prod

# Copy mix files and fetch dependencies
COPY mix.exs ./
RUN mix deps.get --only prod
RUN mix deps.compile

# Copy configuration and application source
COPY config config
COPY lib lib

# Compile and assemble release
RUN mix compile
RUN mix release

# -------------------------------------------------------------
# Runtime stage
# -------------------------------------------------------------
FROM alpine:3.20.3 AS runner

RUN apk add --no-cache libstdc++ openssl ncurses-libs

WORKDIR /app
ENV MIX_ENV=prod
ENV PORT=4000

# Copy release from builder
COPY --from=builder /app/_build/prod/rel/messaging ./

EXPOSE 4000

CMD ["bin/messaging", "start"]

