# builder image
FROM golang:1.13-alpine3.11 as builder

WORKDIR /src/
COPY go.mod go.sum /src/
RUN go mod download

COPY ./jamhub.go /src/

RUN CGO_ENABLED=0 GOOS=linux go build -a -o /bin/main .

# generate clean, final image for end users
FROM alpine:3.11.3
COPY --from=builder /bin/main .

# executable
ENTRYPOINT [ "./main" ]