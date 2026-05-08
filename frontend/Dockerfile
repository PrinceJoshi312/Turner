# Frontend Dockerfile
FROM node:20-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# For dev, we might just run npm run dev. 
# For production we'd build and serve.
# This Dockerfile assumes we want to serve for now.
CMD ["npm", "run", "dev", "--", "--host"]
