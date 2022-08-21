const protobuf = require("protobufjs");
const express = require("express");
const axios = require('axios');
const { Server } = require("socket.io");
const http = require("http");
const path = require("path");
const fs = require("fs");
const mustacheExpress = require('mustache-express');
const S3 = require('aws-sdk/clients/s3');



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




//app.use(express.static(path.join(__dirname, "public"),{index: false}));


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
  res.render(path.join(__dirname,"public/index.html"), {board_id: board_id});
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



//  console.log('>>', 'before select -- board_id = ' + board_id);
//  const res = await client.query('SELECT * from boards WHERE id=$1',[board_id]);

//  socket.emit("take_data_from_json_file", res.rows[0].board_stack);

  /*
  fs.readFile("saved_data.json", "utf-8", (err, data) => {
    if (err) throw err;
    socket.emit("take_data_from_json_file", data);
  });
*/

  socket.on("mouse:move", (e) => {
    socket.broadcast.to(socket.board_id).emit("mouse:move", e);
  });
  socket.on("mouse:down", (e) => {
    socket.broadcast.to(socket.board_id).emit("mouse:down", e);
  });
  socket.on("mouse:up", (e) => {
    socket.broadcast.to(socket.board_id).emit("mouse:up", e);
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

  socket.on("text:added", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("text:added", object_pass);
  });

  socket.on("canvas_save_to_json", async canvas_pass => {

    //socket.broadcast.emit('canvas_save_to_json', canvas_pass);
    const data_saved = JSON.stringify(canvas_pass);
    // console.log(data_saved);
    //await client.connect()
    //const res = await client.query("UPDATE boards set board_stack = '"+ JSON.stringify(canvas_pass)+"' WHERE id=1" );
    const res = await client.query("UPDATE boards set board_stack = $1 WHERE id=$2 ",[data_saved,canvas_pass["board_id"]]);
    //console.log(res) // Hello world!
    //await client.end()  
   // done()

/*
    fs.writeFile("saved_data.json", data_saved, (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log("saved");
      }
    });
*/

  });


  socket.on('upload_to_aws', (image_pass,callback) =>{

        var s3 = new S3({
            accessKeyId: process.env.ACCESS_KEY,
            secretAccessKey: process.env.SECRET_ACCESS_KEY,
            endpoint: process.env.END_POINT,
            apiVersion: 'latest'
        });
        //s3.createBucket()
        // Загрузить объект
        const fileContent = Buffer.from(image_pass.replace('data:image/jpeg;base64,',"").replace('data:image/png;base64,',""),'base64')  ;
        // console.log('start_upload');

        let name_obj = makeid(32)+'.jpg';
        var params = {
            Bucket: 'hot_data_kuzovkin_info_private',
            Key: name_obj,
            ContentType:'image/jpeg',
            Body: fileContent
        };
        
        s3.upload(params, (err, data) => {
            if (err) 
            {
                console.log(err, err.stack);
            } else 
            {
                global.loca=data['Location']; 
                console.log(loca);
                
            }
        });
      
        callback ('https://hb.bizmrg.com/hot_data_kuzovkin_info_private/'+name_obj);
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