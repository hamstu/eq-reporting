FROM node:7.9.0-alpine

RUN mkdir -p /app
WORKDIR /app

ENV NODE_ENV local

COPY package.json /app
RUN npm install --only=production && npm cache clean && npm install -g nodemon

COPY . /app
CMD [ "npm", "run", "serve" ]