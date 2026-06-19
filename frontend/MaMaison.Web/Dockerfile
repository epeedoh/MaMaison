FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build -- --configuration production

# ── Serve avec nginx ──────────────────────────────────────────
FROM nginx:1.25-alpine AS final
COPY --from=build /app/dist/MaMaison.Web/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
