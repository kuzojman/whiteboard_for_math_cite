const express = require('express');
const http = require('http');
const mustacheExpress = require('mustache-express');
const path = require('path');

const initExpressApp = (witeboardServiceHost) => {
  const app = express();
  const server = http.createServer(app);

  // Register '.html' extension with The Mustache Express
  app.engine('html', mustacheExpress());

  app.set('view engine', 'mustache');
  app.set('views', __dirname + '../');

  app.get('/', (req, res) => {
    let board_id = req.query.board_id;
    if (!board_id) {
      board_id = 1;
    }
    res.render(path.join(__dirname, '../index.html'), {
      board_id: board_id,
      siteAddress: encodeURIComponent(process.env.SITE_ADDRESS),
      backUrl: encodeURIComponent(process.env.BACK_URL),
      witeboardServiceHost,
    });
  });

  // Download the file to save on the board
  app.get('/download/:urldata', (req, response) => {
    let url_ = Buffer.from(req.params.urldata, 'base64').toString();
    const request = https.get(url_, (res_) => {
      res_.setEncoding('binary');
      response.contentType(res_.headers['content-type']);
      res_.on('data', (body) => {
        response.write(body, 'binary');
      });
      res_.on('end', () => {
        response.end();
      });
    });
  });

  app.use(express.static(path.join(__dirname, '../')));

  return { server };
};

module.exports = initExpressApp;