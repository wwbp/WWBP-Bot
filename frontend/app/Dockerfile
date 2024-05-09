# Build environment
FROM node:14 as builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . ./

# Set the REACT_APP_API_URL environment variable
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# Production environment
FROM nginx:stable-alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]