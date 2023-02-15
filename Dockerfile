FROM node:lts-alpine3.17
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
EXPOSE 1337
ENTRYPOINT ["node", "server.js"]
