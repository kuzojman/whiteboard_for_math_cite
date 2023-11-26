const protobuf = require("protobufjs");
const express = require("express");
const axios = require('axios');
const { Server } = require("socket.io");
const http = require("http");
const https = require("https");
const path = require("path");
const fs = require("fs");
const mustacheExpress = require('mustache-express');
const S3 = require('aws-sdk/clients/s3');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { fromPath } = require("pdf2pic");
const { getDocument } = require("pdfjs-dist");
const unoconv = require('awesome-unoconv');
const glob = require("glob")


var jsonDescriptor = require("./public/awesome.json"); // exemplary for node

var root = protobuf.Root.fromJSON(jsonDescriptor);
let boards_schema = root.lookupType("awesomepackage.AwesomeMessage")

let pathOffset_schema = root.lookupType("awesomepackage.pathOffset")
//console.log(pathOffset_schema);


let buf_encoded = boards_schema.encode({board_id:123,bc:'#ffff'}).finish();
//console.log(buf_encoded);

let buf_decoded = boards_schema.decode(buf_encoded);
//console.log(buf_decoded);


require('dotenv').config()

const arrayAllUsers = [];
const arrayOfUserCursorCoordinates = [];

// все запросы пользователей на добавление к доске
// для каждого пользователя/доски содается комната, в которую складываются все реквесты
// реквесты не убираются пока создатель доски не нажмет "одобрить" или "отклонить"
// эти реквесты постоянно передаются на фронтетд
const roomRequestFromUser = {};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e7
});

const port = process.env.PORT || 3000;

////////////////////work with postresql start
const { Client } = require('pg');
const { Console } = require("console");
const { response } = require("express");
// console.log(process.env);
const client = new Client({
  user: process.env.DB_USER, 
  host: process.env.DB_HOST,
  database: process.env.DB_DB,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

async function initdb(){
  await client.connect()
  const res = await client.query('SELECT * from boards')
  //console.log(res.rows[0]) // Hello world!
  //await client.end()  
}
initdb()
////////////////////////work with postresql end


/**
 *
 * Доступ к яндекс облаку 
 *
 */
class YandexCloud {
  constructor () {
    this.aws = new AWS.S3({
      endpoint: 'https://storage.yandexcloud.net', 
      accessKeyId: process.env.YA_STORAGE_ACCESS_KEY, // берем ключ из переменной окружения
      secretAccessKey: process.env.YA_STORAGE_SECRET_KEY, // берем секрет из переменной окружения
      region: 'ru-central1',
      httpOptions: {
        timeout: 10000,
        connectTimeout: 10000
      },
    });
  }

  upload = async ({file,path,fileName,fileType}) =>  {
    try {
      const params = {
        Bucket: process.env.YA_BUCKET_NAME, // название созданного bucket
        Key: `${path}/${fileName}`, // путь и название файла в облаке (path без слэша впереди)
        Body: file, // сам файл
        ContentType: fileType, // тип файла
      }
      const result = await new Promise((resolve, reject)=> {
        this.aws.upload(params, function(err, data) {
          if (err) return reject(err);
          return resolve(data);
        });
      });
      return result;
    } catch (e) {
      console.error(e);
    }
  }
}

class AmazonCloud {
  constructor () {
    this.aws = new AWS.S3({
      endpoint: process.env.END_POINT, 
      accessKeyId: process.env.ACCESS_KEY, // берем ключ из переменной окружения
      secretAccessKey: process.env.SECRET_ACCESS_KEY, // берем секрет из переменной окружения
      httpOptions: {
        timeout: 100000,
        connectTimeout: 100000
      },
    });
  }

  upload = async ({file,path,fileName,fileType}) =>  {
    try {
      // console.log(file);
      // const fileContent = Buffer.from(file.replace('data:image/jpeg;base64,',"").replace('data:image/png;base64,',""),'base64')  ;
      const params = {
        Bucket: 'hot_data_kuzovkin_info_private', // название созданного bucket
        Key: `${path}/${fileName}`, // путь и название файла в облаке (path без слэша впереди)
        Body: file, // сам файл
        ContentType: fileType, // тип файла
      }
      const result = await new Promise((resolve, reject)=> {
        this.aws.upload(params, function(err, data) {
          if (err) return reject(err);
          return resolve(data);
        });
      });
      return result;
    } catch (e) {
      console.error(e);
    }
  }
}

let AWSCloud = null;
if ( process.env.YA_STORAGE_SECRET_KEY!==undefined ){
  AWSCloud = new YandexCloud();
} else{
  AWSCloud = new AmazonCloud();
}


//app.use(express.static(path.join(__dirname, "public"),{index: false}));

// const cookieParser = require('cookie-parser');
// app.use(cookieParser());

// Register '.html' extension with The Mustache Express
app.engine('html', mustacheExpress());

app.set('view engine', 'mustache');
app.set('views', __dirname + '/public');

app.get("/", (req, res) => {
  //console.log(req.query);
  //res.send({});
  //return;
  let board_id = req.query.board_id;
  if (!board_id) {
    board_id = 1;
  }
  let role = req.query.role;
  // res.cookie('user_id', '1');
  // console.log('cookie exists', req.cookies.user_id);
  res.render(
    path.join(__dirname,"public/index.html"), 
    {
      board_id: board_id, 
      siteAddress: encodeURI(process.env.SITE_ADDRESS),
      backUrl: process.env.BACK_URL
    }
    );
});

/**
 * перескачиваем файл для сохранения на доске
 */
app.get("/download/:urldata", (req, response) => {
  // console.log(req.params.urldata);
  let url_ = Buffer.from(req.params.urldata, 'base64').toString()
  // console.log(url_);
  // if ( url_.indexOf('https://')==-1 && url_.indexOf('https:/')==0 ){
  //   url_ = url_.replace('https:/','https://')
  // }else if ( url_.indexOf('http://')==-1 && url_.indexOf('http:/')==0 ){
  //   url_ = url_.replace('http:/','http://')
  // }
  // console.log(url_);
  const request = https.get(url_, (res_)=>{
    res_.setEncoding('binary');
    response.contentType( res_.headers['content-type'] );
    res_.on('data',  (body) =>{
      response.write(body,'binary')
    });
    res_.on('end',()=> {
      response.end()
    })
  } )
});

app.use(express.static(path.join(__dirname, "public")));

async function getUserData(user_id){
  let response = {
    user:user_id,
    username:'',
    email:'',
  }
  res = await client.query("SELECT users.username,users.email FROM users WHERE  users.id=$1",[user_id])
    if ( res.rows.length>0 ){
      let r_                = res.rows[0];
          response.username = r_.username;
          response.email    = r_.email;
    }
  return response;
}

io.on("connection", async socket => {
  //array_all_users.push(socket.id);
  //var board_id = 1;
  // let user_id=false;
  // const response = await axios.get('http://localhost:5000/check_user_id/');
  // console.log( response.data );

  arrayAllUsers.push(socket.id);
  
  arrayOfUserCursorCoordinates.push({
      userId: socket.id,
      username: '',
      email: '',
      cursorCoordinates: {
          x: 0,
          y: 0,
      },
  });
  socket.on('cursor-data', (data) => {
    const cursorDataUser = arrayOfUserCursorCoordinates.find(item => item.userId === data.userId);
    if(cursorDataUser) 
    {
        cursorDataUser.cursorCoordinates = data.coords;
        if ( data.cursor!==undefined ){
          cursorDataUser.cursor = data.cursor
        }else{
          cursorDataUser.cursor = ""
        }
        socket.broadcast.to(socket.board_id).emit('cursor-data', cursorDataUser);
    }
  });

  socket.on("width:changed", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("width:changed", object_pass);
  });

  socket.on("color:changed", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("color:changed", object_pass);
  });

  socket.on("slider:change", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("slider:change", object_pass);
  });

  /**
   * Загрузка иображений в облако
   * @data - { name: 'filename.jpg', file: ByteArray<>, type: mimetype }
   */
  socket.on('cloud:image:add', (data) =>{
    
    let fileFormat = data.name.split('.');
    let savePath = makeid(32) + '.' + fileFormat[fileFormat.length - 1];
    AWSCloud.upload({
      file: data.file, // файл
      path: 'images/'+socket.board_id,
      fileName: savePath,
      type: data.type
    }).then( (data)=> {
      socket.emit('cloud:image:saved', data)
    } )
    
  } )

  socket.on('cloud:image:list', (data) =>{

  } )

  socket.on("user:user_id",async (e) => {
    // user:e.user, board:board_id
    // console.log(e);
    socket.user_id = e.user;
    
    let userdata = await getUserData(e.user);
    const cursorDataUser = arrayOfUserCursorCoordinates.find(item => item.userId === e.socket_id);
    cursorDataUser.username = userdata.username;
    cursorDataUser.email = userdata.email;

    // socket.join(e);
    const admin_board_id = 'board_'+e.board+'/user_'+e.user;
    // console.log(admin_board_id, Object.keys(roomRequestFromUser), Object.keys(roomRequestFromUser).indexOf(admin_board_id)!==-1);
    
    if ( Object.keys(roomRequestFromUser).indexOf(admin_board_id)!==-1 && Object.keys(roomRequestFromUser[admin_board_id]).length>0 ){
      // отправляем один реквест администратору
      let keys_ = Object.keys(roomRequestFromUser[admin_board_id])

      // console.log("keys", keys_[0]);
      // console.log("request", roomRequestFromUser[admin_board_id][keys_[0]]);

      socket.join(admin_board_id);
      io.sockets.in(admin_board_id).emit("creator:request", roomRequestFromUser[admin_board_id][keys_[0]] ); 
    }
  });


  socket.on("board:board_id",async (e) => {
    board_id = e;

    socket.board_id = board_id;
    socket.join(board_id);

   // console.log('>>', board_id, e);
  //  console.log('>>', 'before select -- board_id = ' + board_id);
    const res = await client.query('SELECT * from boards WHERE id=$1',[board_id]);
    if ( res.rows.length>0 ){
      socket.emit("take_data_from_json_file", res.rows[0].board_stack);
    }
  });

  // запрос на разрешение к доске
  socket.on("access:request", async (e)=>{
    let response = {
      role:'',
      user:e.user,
      board:e.board,
      username:'',
      email:'',
    }

    
    if ( e.user==false || isNaN(e.user) || parseInt(e.user) <= 0 ){
      return;
    }
    e.user = parseInt(e.user);

    // console.log('board_'+e.board+'/user_'+e.user)
    socket.join('board_'+e.board+'/user_'+e.user);
    

    let res = await client.query('SELECT boards_users.* from boards_users  WHERE boards_users.boards_id=$1 and boards_users.users_id=$2;',[e.board, e.user]);
    if ( res.rows.length>0 ){
      let r_                = res.rows[0];
          response.role     = r_.role;
    }
    // получаем информацию от пользователя 
    let r_            = await getUserData(e.user);
    response.username = r_.username;
    response.email    = r_.email;
    // console.log(response);
    // проверяем, что роли нет, тогда отправляем запрос в комнату создателя
    if ( response.role=='' ){
      res = await client.query('SELECT * from boards_users WHERE boards_id=$1 and role=\'creator\'',[response.board]);
      
      if ( res.rows.length>0 ){
        for (let l = 0; l < res.rows.length; l++) {
          const r_ = res.rows[l];
          const admin_board_id = 'board_'+e.board+'/user_'+r_.users_id;
          // инициируем комнату
          if ( Object.keys(roomRequestFromUser).indexOf(admin_board_id)===-1 ){
            roomRequestFromUser[admin_board_id] = {}
          }
          // добавляем в массив
          if ( Object.keys(roomRequestFromUser[admin_board_id]).indexOf(e.user)===-1 ){
            roomRequestFromUser[admin_board_id][e.user] = { board_id:e.board, user_id:e.user, username:response.username, email:response.email };
          }

          // console.log('-> board_'+e.board+'/user_'+r_.users_id);
          io.sockets.in(admin_board_id).emit("creator:request",{ board_id:e.board, user_id:e.user, username:response.username, email:response.email }); 
        }
      }
    }

    // console.log('---> board_'+e.board+'/user_'+e.user);
    io.sockets.in('board_'+e.board+'/user_'+e.user).emit("access:response",response)
  })

  // ответ от администратора комнаты
  socket.on("creator:response", async (e)=>{
    // creator_id
    // user_id
    // board_id
    // role (accept)
    
    const res = await client.query('INSERT INTO boards_users (boards_id, users_id, role) VALUES ($1,$2,$3)',[e.board_id,e.user_id,e.role]);
    let response = {
      role:e.role,
      user:e.user_id,
      board:e.board_id,
    }
    io.sockets.in('board_'+e.board_id+'/user_'+e.user_id).emit("access:response",response)
    // убираем из массива ожидания
    const admin_board_id = 'board_'+e.board_id+'/user_'+e.creator_id;
    if ( Object.keys(roomRequestFromUser).indexOf(admin_board_id)!==-1 ){
      if ( Object.keys(roomRequestFromUser[admin_board_id]).indexOf(e.user_id)!==-1 ){
        // console.log(roomRequestFromUser[admin_board_id], e.user_id);
        if ( roomRequestFromUser[admin_board_id]!==undefined ){
          delete roomRequestFromUser[admin_board_id][e.user_id];
        }
        if ( Object.keys(roomRequestFromUser[admin_board_id]).length>0 ){
          // отправляем один реквест администратору
          let keys_ = Object.keys(roomRequestFromUser[admin_board_id])
          io.sockets.in(admin_board_id).emit("creator:request", roomRequestFromUser[admin_board_id][keys_[0]] ); 
        }
      }
    }
  })

  /**
   * Убираем из листа ожидания
   */
  socket.on("creator:decline", async (e)=>{
    // console.log(e);
    // убираем из массива ожидания
    const admin_board_id = 'board_'+e.board_id+'/user_'+e.creator_id;
    // console.log(admin_board_id);
    // удаляем отклоненного пользователя
    if ( roomRequestFromUser[admin_board_id]!==undefined ){
      delete roomRequestFromUser[admin_board_id][e.user_id];
      // console.log(roomRequestFromUser[admin_board_id]);
      if ( Object.keys(roomRequestFromUser[admin_board_id]).length>0 ){
        // отправляем все реквесты администратору
        // отправляем один реквест администратору
        let keys_ = Object.keys(roomRequestFromUser[admin_board_id])
        // console.log("send requrst", roomRequestFromUser[admin_board_id][keys_[0]]  );
        io.sockets.in(admin_board_id).emit("creator:request", roomRequestFromUser[admin_board_id][keys_[0]] ); 
      }
    }
  })

  socket.on("mouse:move", (e) => {
    socket.broadcast.to(socket.board_id).emit("mouse:move", e);
  });
  socket.on("mouse:draw", (e) => {
    socket.broadcast.to(socket.board_id).emit("mouse:draw", e);
  });
  socket.on("mouse:down", (e) => {
    socket.broadcast.to(socket.board_id).emit("mouse:down", e);
  });
  socket.on("mouse:up", (e) => {
    socket.broadcast.to(socket.board_id).emit("mouse:up", e);
  });

  socket.on("path:created", (e) => {
    socket.broadcast.to(socket.board_id).emit("path:created", e);
  });

  socket.on("color:change", (colour) => {
    socket.broadcast.to(socket.board_id).emit("color:change", colour);
  });

  socket.on("width:change", (width_pass) => {
    socket.broadcast.to(socket.board_id).emit("width:change", width_pass);
  });

  socket.on("circle:edit", (circle_pass) => {
    socket.broadcast.to(socket.board_id).emit("circle:edit", circle_pass);
  });

  socket.on("circle:add", (circle_pass) => {
    socket.broadcast.to(socket.board_id).emit("circle:add", circle_pass);
  });

  socket.on("rect:edit", (rect_pass) => {
    socket.broadcast.to(socket.board_id).emit("rect:edit", rect_pass);
    // console.log(rect_pass);
  });

  socket.on("rect:add", (rect_pass) => {
    socket.broadcast.to(socket.board_id).emit("rect:add", rect_pass);
    // console.log(rect_pass);
  });

  socket.on("line:edit", (line_pass) => {
    socket.broadcast.to(socket.board_id).emit("line:edit", line_pass);
  });

  socket.on("line:add", (line_pass) => {
    socket.broadcast.to(socket.board_id).emit("line:add", line_pass);
  });

  socket.on("picture:add", (img_pass) => {
    socket.broadcast.to(socket.board_id).emit("picture:add", img_pass);
  });

  socket.on("image:add", (img_pass) => {
    socket.broadcast.to(socket.board_id).emit("image:add", img_pass);
  });

  socket.on("object:moving", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("object:moving", object_pass);
  });

  socket.on("object:modified", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("object:modified", object_pass);
  });

  socket.on("object:scaling", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("object:scaling", object_pass);
  });

  socket.on("object:rotating", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("object:rotating", object_pass);
  });

  socket.on("figure_delete", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("figure_delete", object_pass);
  });

  socket.on("figure_copied", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("figure_copied", object_pass);
  });

  socket.on("slider:add", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("slider:add", object_pass);
  });

  socket.on("text:added", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("text:added", object_pass);
  });
  
  socket.on("canvas:clear", (e) => {
    socket.broadcast.to(socket.board_id).emit("canvas:clear",e);
  });

  socket.on("text:edited", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("text:edited", object_pass);
  });

  socket.on("formula:added", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("formula:added", object_pass);
  });
  
  socket.on("formula:edited", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("formula:edited", object_pass);
  });

  /**
   * Отправляем задание на доску
   */
  socket.on("send:task", async (object_pass) => {
    console.log(object_pass);
    const puppeteer = require('puppeteer-core')
    const {executablePath} = require('puppeteer')
    const { writeFile } = require('fs-extra')
    let board_id = object_pass.board_id ?? false;
    let task_id = object_pass.task_id ?? false;
    if ( board_id==false || task_id==false ){
      return false;
    }
    const tasks = await client.query('SELECT * from tasks WHERE id=$1',[task_id]).catch( ()=>{
      console.error("Cant quering for get tasks from DB")
      return false;
    } );
    if ( tasks.rows.length>0 ){
      let task_content = tasks.rows[0].task;
      let content = String.raw`
      <!DOCTYPE html><html><head>
      <link href="https://fonts.googleapis.com/css?family=Raleway:100,200,300,regular,500,600,700,800,900,100italic,200italic,300italic,italic,500italic,600italic,700italic,800italic,900italic" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css">
      <script>
        var math_loaded= false;
      </script>
      <script>
        MathJax = {
          loader: {
            load: ['[tex]/color','[tex]/cancel','input/asciimath', 'output/chtml', 'ui/menu']
          },
          tex: {
            packages: {'[+]': ['cancel', 'color']},
            inlineMath: [['$','$'], ['\\(','\\)']],
            preview: "none"
          },
          tex2jax: {
            inlineMath: [['$','$'], ['\\(','\\)']],
            preview: "none"
          },
          startup: {
            pageReady() {
              return MathJax.startup.defaultPageReady().then(function () {
                math_loaded=true;
              });
            }
          }
        };
        </script>
        <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
      </head><body>
      <div class="homework_div my-4 p-5 is-6" style="border: 1px solid #ACACAC;">
          <div class="homework_header">
              <a href="" class="is-size-6"> <span class="main has-text-weight-bold">№ `+String(task_id)+`</span></a>
          </div>
          <div class="homework_text my-4">`+task_content+`</div>
      </div>
      </body></html>`;
      
      try {
        const browser = await puppeteer.launch({
          args: ['--no-sandbox',],
          headless: true,
          ignoreHTTPSErrors: true,
          // add this
          executablePath: executablePath(),
        });
        const page = await browser.newPage();
        await page.setContent(content,{waitUntil: 'networkidle0'});
        await page.setViewport({
          width: 640,
          height: 480,
          deviceScaleFactor: 1,
        });
        // await page.waitFor(2000);
        await page.waitForFunction('math_loaded');
        const selector = 'body';
        await page.waitForSelector(selector);
        const element = await page.$(selector);
        const imageBuffer = await element.screenshot({});
        await page.close(); 
        await browser.close();
        // write file to disk as buffer
        // await writeFile('./image.png', imageBuffer);
        // console.log('The image was created successfully!')
        let image = await  AWSCloud.upload({
          file: imageBuffer, // файл
          path: 'images/',
          fileName: 'task_'+task_id+'.png',
          type: "image/png"
        }).then( (data)=> {
          return data.Location;
        } )
        socket.broadcast.to(object_pass.board_id).emit("send:task", image);
      } catch (error) {
          console.error(error);
      }
    }
    
  });

  socket.on("canvas_save_to_json", async canvas_pass => {
    const data_saved = JSON.parse(JSON.stringify(canvas_pass))
    // console.log(data_saved);
    //socket.broadcast.emit('canvas_save_to_json', data_saved);
    const res = await client.query("UPDATE boards set board_stack = $1 WHERE id=$2 ", [data_saved, canvas_pass["board_id"]]);
  });


  socket.on('upload_to_aws', (image_pass,callback) =>{
    let name_obj = makeid(32)
    AWSCloud.upload({
      file: image_pass, // файл
      path: 'images',
      fileName: savePath,
      type: data.type
    }).then( (data)=> {
      socket.emit('cloud:image:saved', data)
      callback ('https://hb.bizmrg.com/hot_data_kuzovkin_info_private/'+name_obj);
    } )
  })

  socket.on("object:added", async canvas_pass => {
    // console.log('SELECT * from boards WHERE id=',[canvas_pass.board_id]);
    const board = await client.query('SELECT * from boards WHERE id=$1',[canvas_pass.board_id]);
    let item_index=0;
    let board_stack;
    // console.log(board);
    if ( board.rows.length>0 ){
      board_stack = board.rows[0].board_stack;
    }
    if ( board_stack !==undefined && board_stack && board_stack.canvas!==undefined && board_stack.canvas.length>0 ){
      item_index = board_stack.canvas.indexOf(db_item => db_item.id==canvas_pass.id)
      // console.log(item_index);
    }
    
    if(item_index>=0)
    {
      
    } 
    else
    {
      board_stack.canvas.push(canvas_pass.object);
    }
    const data_saved = JSON.stringify(board_stack);
    const res = await client.query("UPDATE boards set board_stack = $1 WHERE id=$2 ",[data_saved,canvas_pass["board_id"]]);
    
  });

  /**
   * Загружаем и обрабатываем файл с презентацией или ПДФ
   */
  socket.on("slider:upload",(file, callback) =>{
    let uid_ = uuidv4();
    let fname = "./uploaded/"+uid_+"/src";
    let dir = path.dirname(fname);
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
    fs.writeFile(fname, file.file, (err) => {
      let imgs=[];
      // console.log(file.ftype);
      
      // application/pdf
      // application/vnd.openxmlformats-officedocument.presentationml.presentation
      // application/vnd.ms-powerpoint
      // для начала определить тип файла
      if ( file.ftype=='application/pdf' ){
        // сконвертировать в изображения
        // загрузить в облако
        convertPDFToImages(fname, uid_, socket.board_id ).then(res=>{
          imgs = res;
          // console.log('convertPDFToImages',imgs);
          // мы должны подготовить и отправить массив загруженных картинок с амазон клауда
          callback({ message: err ? "failure" : "success", images:imgs, error: err });
        })
      }else{
        // console.log(file.ftype);
        // сконвертировать в изображения
        // загрузить в облако
        convertPPTToImages(fname, uid_, socket.board_id, callback ).then( pdf_path=>{
          // console.log(pdf_path);
          convertPDFToImages(pdf_path, uid_, socket.board_id).then(res=>{
            imgs = res;
            // console.log('convertPDFToImages',imgs);
            // мы должны подготовить и отправить массив загруженных картинок с амазон клауда
            callback({ message: err ? "failure" : "success", images:imgs, error: err });
          })
        } );
        
        
        // console.log(imgs);
      }

      
    });
  } );

  socket.on('disconnect', () => {
    io.to(socket.board_id).emit('coursour_disconected', socket.id);
    //const index  = arrayAllUsers.findIndex(item => item === socket.id);
    //const index2 = arrayOfUserCursorCoordinates.findIndex(item => item.userId === socket.id);
/*
    if(index !== -1) {
        arrayAllUsers.splice(index, 1)
    }
    if(index2 !== -1){
        arrayOfUserCursorCoordinates.splice(index2, 1)
    }*/

  });
});

server.listen(port, () => {
  console.log(`Server running at port ` + port);
});


function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * 
charactersLength));
 }
 return result;
}

/**
 * Конвертируем файл в массив картинок и загружаем в облако
 * @param {*} file_ 
 * @socket_id - айди доски для формирования пути в облаке
 * @uid_ - айди папки с файлами
 */
async function convertPDFToImages(file_, uid_, socket_id_){
  let fileContent = fs.readFileSync(file_);
  let pdf_params = await getPdfFormatInfo(fileContent);

  let opts = {
    format: 'jpeg',
    saveFilename: "page",
    savePath: path.dirname(file_),
    density: 300,
    quality: 78,
  }

  // задаем правильный размер pdf
  if ( pdf_params ){
    opts['height'] = pdf_params.finalHeight;
    opts['width'] = pdf_params.finalWidth;
  }

  let result = await fromPath(file_, opts).bulk(-1, false);

  if (result){
    fs.unlinkSync(file_);
    // console.log("saveImagesFromPathToCloud");
    return saveImagesFromPathToCloud(uid_, socket_id_);
  }
  return [];
}

/**
 * Конвертируем презентацию в массив картинок и загружаем в облако
 * @param {*} file_ 
 */
function convertPPTToImages(file_,uid_, socket_id_){
  return unoconv.convert(file_, { output: file_+'.pdf', format: 'pdf' })  // or format: 'html'
    .then(result => {
      console.log(`File save at ${result}`);
      return result;
    })
    .catch(err => {
      console.log(err);
    });

  // const commandOffice = `"${office}" --headless --convert-to pdf --outdir "${path.dirname(file_)}" "${file_}"`;
  
  // console.log(result);
  return true;
}

/**
 * сохраняем картики из папки в облако и удаляем их из папки
 * @param {String} uid_ айди папки
 * @returns 
 */
async function saveImagesFromPathToCloud( uid_, socket_id_ ){
  let images = [];
  var promises = [];
  let dir = "./uploaded/"+uid_+"/";
  // console.log("saveImagesFromPathToCloud",dir,fs.existsSync(dir));
  
  if (fs.existsSync(dir)){
    // options is optional
    
    let files = glob.sync(dir+"*.jpeg");
    
    // console.log(files);
    if (files) {
      var i = 0;
      for (const file of files) {
        // console.log(file, path.basename(file));
        // promises.push(
        let fileContent = fs.readFileSync(file);
        let one = await  AWSCloud.upload({
            file: fileContent, // файл
            path: 'images/'+socket_id_+'/'+uid_,
            fileName: path.basename(file),
            type: "image/jpeg"
          }).then( (data)=> {
            fs.unlinkSync(file);
            // console.log(data.Location);
            return data.Location;
          } )
        images.push(one);
        // );
  
        i++;
      };
      // return Promise.allSettled(promises).then((a) => {
      //   console.log("promisec");
      //   fs.rmSync(dir, { recursive: true, force: true });
      //   return a;
      // });
    }
    
    
    fs.rmSync(dir, { recursive: true, force: true });
  }
  
  return images;
}

/** returns size and resolution of the pdf */
async function getPdfFormatInfo(dataBuffer){
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