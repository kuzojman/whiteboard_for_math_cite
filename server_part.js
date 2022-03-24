const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const path = require("path");
const fs = require("fs");
const mustacheExpress = require('mustache-express');

require('dotenv').config()

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3001;

////////////////////work with postresql start
const { Client } = require('pg');
const { Console } = require("console");
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



io.on("connection", async socket => {
  //array_all_users.push(socket.id);
  //var board_id = 1;

  socket.on("board:board_id",async (e) => {
    board_id = e;

    socket.board_id = board_id;
    socket.join(board_id);

    console.log('>>', board_id, e);
    console.log('>>', 'before select -- board_id = ' + board_id);
    const res = await client.query('SELECT * from boards WHERE id=$1',[board_id]);
    socket.emit("take_data_from_json_file", res.rows[0].board_stack);
  });


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
    console.log(rect_pass);
  });

  socket.on("rect:add", (rect_pass) => {
    socket.broadcast.to(socket.board_id).emit("rect:add", rect_pass);
    console.log(rect_pass);
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

  socket.on("text:add", (object_pass) => {
    socket.broadcast.to(socket.board_id).emit("text:add", object_pass);
  });

  socket.on("canvas_save_to_json", async canvas_pass => {

    //socket.broadcast.emit('canvas_save_to_json', canvas_pass);
    const data_saved = JSON.stringify(canvas_pass, null, "\t");
//    console.log(canvas_pass);
    //await client.connect()
    //const res = await client.query("UPDATE boards set board_stack = '"+ JSON.stringify(canvas_pass)+"' WHERE id=1" );
    const res = await client.query("UPDATE boards set board_stack = $1 WHERE id=$2 ",[canvas_pass["canvas"],canvas_pass["board_id"]]);
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

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(port, () => {
  console.log(`Server running at port ` + port);
});
