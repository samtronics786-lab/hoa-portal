FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
ENV API_PROXY_TARGET=http://server:5000
ENV RUNTIME_API_BASE_URL=/api
COPY nginx.template.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
COPY public/runtime-config.template.js /usr/share/nginx/html/runtime-config.template.js
EXPOSE 3000
CMD ["/bin/sh", "-c", "envsubst '$API_PROXY_TARGET' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && envsubst '$RUNTIME_API_BASE_URL' < /usr/share/nginx/html/runtime-config.template.js > /usr/share/nginx/html/runtime-config.js && nginx -g 'daemon off;'"]
