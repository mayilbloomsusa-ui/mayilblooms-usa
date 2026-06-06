FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the static catalog files to the nginx html directory
COPY . /usr/share/nginx/html

# Production env.js — overrides the dev version
# Uses relative /api path since everything is served from the same IP:80
RUN echo 'window.ENV = { API_URL: "/api" };' > /usr/share/nginx/html/env.js

# Expose port 80
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
