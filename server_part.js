require('dotenv').config();
const initExpressApp = require('./public/js/express_app.js');
const { initdb, db_client } = require('./public/js/database/db.js');
const AmazonCloud = require('./public/js/aws/amazon.js');
const createSocketServer = require('./public/js/socket_io.js');

const protobuf = require('protobufjs');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { fromPath } = require('pdf2pic');
const { getDocument } = require('pdfjs-dist');
const unoconv = require('awesome-unoconv');
const glob = require('glob');

const witeboardServiceHost = encodeURIComponent(process.env.WITEBOARD_SERVICE_HOST);
const { server } = initExpressApp(witeboardServiceHost);

var jsonDescriptor = require('./public/awesome.json'); // exemplary for node

var root = protobuf.Root.fromJSON(jsonDescriptor);
let boards_schema = root.lookupType('awesomepackage.AwesomeMessage');
// let pathOffset_schema = root.lookupType('awesomepackage.pathOffset');
let buf_encoded = boards_schema.encode({ board_id: 123, bc: '#ffff' }).finish();
let buf_decoded = boards_schema.decode(buf_encoded);

const port = process.env.PORT || 3000;

initdb();

const AWSCloud = new AmazonCloud({
  endpoint: process.env.S3_ENDPOINT_URL,
  accessKeyId: process.env.S3_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_AWS_SECRET_ACCESS_KEY,
  bucket: process.env.S3_BUCKET,
});

createSocketServer(server, db_client);

server.listen(port, () => {
  console.log(`Server running at port ` + port);
});

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Конвертируем файл в массив картинок и загружаем в облако
 * @param {*} file_
 * @socket_id - айди доски для формирования пути в облаке
 * @uid_ - айди папки с файлами
 */
async function convertPDFToImages(file_, uid_, socket_id_) {
  let fileContent = fs.readFileSync(file_);
  let pdf_params = await getPdfFormatInfo(fileContent);

  let opts = {
    format: 'jpeg',
    saveFilename: 'page',
    savePath: path.dirname(file_),
    density: 300,
    quality: 78,
  };

  // задаем правильный размер pdf
  if (pdf_params) {
    opts['height'] = pdf_params.finalHeight;
    opts['width'] = pdf_params.finalWidth;
  }

  let result = await fromPath(file_, opts).bulk(-1, false);

  if (result) {
    fs.unlinkSync(file_);
    return saveImagesFromPathToCloud(uid_, socket_id_);
  }
  return [];
}

/**
 * Конвертируем презентацию в массив картинок и загружаем в облако
 * @param {*} file_
 */
function convertPPTToImages(file_, uid_, socket_id_) {
  return unoconv
    .convert(file_, { output: file_ + '.pdf', format: 'pdf' }) // or format: 'html'
    .then((result) => {
      console.log(`File save at ${result}`);
      return result;
    })
    .catch((err) => {
      console.log(err);
    });
}

/**
 * сохраняем картики из папки в облако и удаляем их из папки
 * @param {String} uid_ айди папки
 * @returns
 */
async function saveImagesFromPathToCloud(uid_, socket_id_) {
  let images = [];
  var promises = [];
  let dir = './uploaded/' + uid_ + '/';

  if (fs.existsSync(dir)) {
    let files = glob.sync(dir + '*.jpeg');

    if (files) {
      var i = 0;
      for (const file of files) {
        let fileContent = fs.readFileSync(file);
        let one = await AWSCloud.upload({
          file: fileContent,
          path: 'images/' + socket_id_ + '/' + uid_,
          fileName: path.basename(file),
          type: 'image/jpeg',
        }).then((data) => {
          fs.unlinkSync(file);
          return data.Location;
        });
        images.push(one);
        // );

        i++;
      }
    }

    fs.rmSync(dir, { recursive: true, force: true });
  }

  return images;
}

// returns size and resolution of the pdf
async function getPdfFormatInfo(dataBuffer) {
  const pdfDocument = await getDocument({ data: dataBuffer }).promise;
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 1 });

  const width = Math.floor(viewport.width);
  const height = Math.floor(viewport.height);
  const finalHeight = 800;
  const finalWidth = (finalHeight / height) * width;

  return {
    numPages: pdfDocument.numPages,
    width,
    height,
    finalWidth,
    finalHeight,
  };
}
