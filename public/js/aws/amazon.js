const AWS = require('aws-sdk');

class AmazonCloud {
  constructor({ endpoint, accessKeyId, secretAccessKey, bucket }) {
    this.aws = new AWS.S3({
      endpoint: endpoint,
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      httpOptions: {
        timeout: 100000,
        connectTimeout: 100000,
      },
    });

    this.bucket = bucket;
  }

  upload = async ({ file, path, fileName, fileType }) => {
    try {
      // const fileContent = Buffer.from(file.replace('data:image/jpeg;base64,',"").replace('data:image/png;base64,',""),'base64')  ;
      const params = {
        Bucket: this.bucket, // название созданного bucket
        Key: `${path}/${fileName}`, // путь и название файла в облаке (path без слэша впереди)
        Body: file, // сам файл
        ContentType: fileType, // тип файла
      };
      const result = await new Promise((resolve, reject) => {
        this.aws.upload(params, function (err, data) {
          if (err) return reject(err);
          return resolve(data);
        });
      });
      return result;
    } catch (e) {
      console.error(e);
    }
  };
}

module.exports = AmazonCloud;
