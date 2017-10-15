FROM node:8.5.0-alpine

RUN mkdir -p /app
WORKDIR /app

ENV NODE_ENV local

COPY package.json /app
RUN npm install --only=production && npm install -g nodemon

COPY . /app
CMD [ "npm", "run", "serve" ]
