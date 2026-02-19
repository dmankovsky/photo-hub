# Makefile for running MongoDB, frontend, and backend services
run: run-mongo run-frontend run-backend
	@echo "Running all services..."
	@echo "MongoDB is running on port 27017"
	@echo "Frontend is running on port 3000"
	@echo "Backend is running on port 5001"
	@echo "All services are running!"

run-mongo:
	# MEDIUM-1 fix: credentials are read from environment variables, not hardcoded.
	# Set MONGO_USERNAME and MONGO_PASSWORD in your shell or .env before running this target.
	docker ps -a --format '{{.Names}}' | grep -w mongo-container >/dev/null 2>&1 || \
	docker run --name mongo-container -d -p 27017:27017 \
	-e MONGO_INITDB_ROOT_USERNAME=$(MONGO_USERNAME) \
	-e MONGO_INITDB_ROOT_PASSWORD=$(MONGO_PASSWORD) \
	mongo

run-frontend:
	export NODE_OPTIONS=--openssl-legacy-provider && npm start

run-backend:
	export NODE_OPTIONS=--openssl-legacy-provider && npx nodemon backend/server.js
