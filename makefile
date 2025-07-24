up:
	docker compose -f docker/docker-compose.dev.yml up -d

up-build:
	docker compose -f docker/docker-compose.dev.yml up -d --build

up-recreate:
	docker compose -f docker/docker-compose.dev.yml up -d --build --force-recreate

down:
	docker compose -f docker/docker-compose.dev.yml down

build:
	docker compose -f docker/docker-compose.dev.yml build

logs:
	docker compose -f docker/docker-compose.dev.yml logs -f