FROM nginx:alpine

# Remove default nginx static assets and default site config
RUN rm -rf /usr/share/nginx/html/* && \
    rm -f /etc/nginx/conf.d/default.conf

# Copy the static catalog files to the nginx html directory
COPY . /usr/share/nginx/html

# Install our custom nginx config (proper cache-control headers for all asset types)
COPY nginx.conf /etc/nginx/conf.d/catalog.conf

# Production env.js — overrides the dev version
# Uses relative /api path since everything is served from the same IP:80
RUN echo 'window.ENV = { API_URL: "/api" };' > /usr/share/nginx/html/env.js

# Expose port 80
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
