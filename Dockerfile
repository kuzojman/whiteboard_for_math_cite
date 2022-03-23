FROM node:12-alpine

COPY . /opt/app
WORKDIR /opt/app
RUN npm install 

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start", "run"]