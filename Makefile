# Photo Hub — local development

# Start both backend and frontend (run in separate terminals)
backend:
	export NODE_OPTIONS=--openssl-legacy-provider && npx nodemon backend/server.js

frontend:
	export NODE_OPTIONS=--openssl-legacy-provider && npm start

# Build frontend for production
build:
	export NODE_OPTIONS=--openssl-legacy-provider && npm run build

# Optional: start local MongoDB via Docker (only needed if not using MongoDB Atlas)
mongo:
	docker ps -a --format '{{.Names}}' | grep -w mongo-container >/dev/null 2>&1 || \
	docker run --name mongo-container -d -p 27017:27017 mongo
