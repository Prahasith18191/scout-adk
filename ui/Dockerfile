# Serve the prebuilt Vite static site on Cloud Run (nginx on $PORT=8080).
FROM nginx:1.27-alpine
COPY dist /usr/share/nginx/html
RUN printf 'server {\n  listen 8080;\n  root /usr/share/nginx/html;\n  location / { try_files $uri /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
