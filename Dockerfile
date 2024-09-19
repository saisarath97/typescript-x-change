# Use an official Node.js 14 image as a base
FROM node:14

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the TypeScript files
COPY . .

# Compile TypeScript to JavaScript
RUN npx tsc

# Expose the port
EXPOSE 3001

# Run the compiled JavaScript code
CMD ["node", "app.js"]
