FROM buildkite/puppeteer:latest

COPY . /usr/src/app
WORKDIR /usr/src/app

RUN npm install

EXPOSE 3000

