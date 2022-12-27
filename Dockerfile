FROM node:19

# install libs
RUN apt-get update && apt-get install -y libreoffice-dev imagemagick graphicsmagick unoconv

COPY . /opt/app
WORKDIR /opt/app
RUN npm install 

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start", "run"]