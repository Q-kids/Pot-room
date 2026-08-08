FROM node:18-slim
RUN apt-get update && apt-get install -y chromium ffmpeg && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
WORKDIR /usr/src/app
COPY . .
RUN npm install
EXPOSE 3000
CMD [ "npm", "start" ]
