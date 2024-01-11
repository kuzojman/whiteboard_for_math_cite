import { fromPath } from 'pdf2pic';
import getDocument from 'pdfjs-dist';
import fs from 'fs';
import unoconv from 'awesome-unoconv';
import glob from 'glob';
import { AWSCloud } from './aws/amazon.js';


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

/**
 * Конвертируем файл в массив картинок и загружаем в облако
 * @param {*} file_
 * @socket_id - айди доски для формирования пути в облаке
 * @uid_ - айди папки с файлами
 */
export async function convertPDFToImages(file_, uid_, socket_id_) {
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
export function convertPPTToImages(file_, uid_, socket_id_) {
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
