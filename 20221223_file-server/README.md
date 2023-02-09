# File server

## Requirements

- docker
- docker-compose
- node v16.15.0 (development)
- fd (development)

## Usage

### (Re)compiling TypeScript and starting the service

```bash
./bin/start
```

### Running migrations

```bash
# Assuming `mysql` service is running
./bin/migrate   # or `./bin/migrate-again` to reapply the last migration
```

### Running tests

```bash
# Assuming `app` service is running
./bin/test
```

**Warning**: Running tests resets the database.
