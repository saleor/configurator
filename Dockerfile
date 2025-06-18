FROM node:20-alpine

WORKDIR /app

# Copy package.json and lock file
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm@8

# Install dependencies
RUN pnpm install

# Copy the rest of the application
COPY . .

# Ensure the schema is fetched
RUN pnpm run fetch-schema

# Set environment variables
ENV NODE_ENV=production

# Command to run the application
CMD ["sh", "-c", "pnpm bootstrap && tail -f /dev/null"] 