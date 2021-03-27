FROM node:lts-buster-slim
WORKDIR /opt/hello-world
COPY hello-world.js /opt/hello-world/hello-world.js
ENTRYPOINT ["node","hello-world.js"]