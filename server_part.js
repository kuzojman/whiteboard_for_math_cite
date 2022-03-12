const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendfile("/index.html");
});

io.on("connection", (socket) => {
  //array_all_users.push(socket.id);
  fs.readFile("saved_data.json", "utf-8", (err, data) => {
    if (err) throw err;
    socket.emit("take_data_from_json_file", data);
  });

  socket.on("mouse:move", (e) => {
    socket.broadcast.emit("mouse:move", e);
  });

  socket.on("color:change", (colour) => {
    socket.broadcast.emit("color:change", colour);
  });

  socket.on("width:change", (width_pass) => {
    socket.broadcast.emit("width:change", width_pass);
  });

  socket.on("circle:edit", (circle_pass) => {
    socket.broadcast.emit("circle:edit", circle_pass);
  });

  socket.on("circle:add", (circle_pass) => {
    socket.broadcast.emit("circle:add", circle_pass);
  });

  socket.on("rect:edit", (rect_pass) => {
    socket.broadcast.emit("rect:edit", rect_pass);
  });

  socket.on("rect:add", (rect_pass) => {
    socket.broadcast.emit("rect:add", rect_pass);
  });

  socket.on("line:edit", (line_pass) => {
    socket.broadcast.emit("line:edit", line_pass);
  });

  socket.on("line:add", (line_pass) => {
    socket.broadcast.emit("line:add", line_pass);
  });

  socket.on("picture:add", (img_pass) => {
    socket.broadcast.emit("picture:add", img_pass);
  });

  socket.on("image:add", (img_pass) => {
    socket.broadcast.emit("image:add", img_pass);
  });

  socket.on("object:moving", (object_pass) => {
    socket.broadcast.emit("object:moving", object_pass);
  });

  socket.on("object:modified", (object_pass) => {
    socket.broadcast.emit("object:modified", object_pass);
  });

  socket.on("object:scaling", (object_pass) => {
    socket.broadcast.emit("object:scaling", object_pass);
  });

  socket.on("object:rotating", (object_pass) => {
    socket.broadcast.emit("object:rotating", object_pass);
  });

  socket.on("figure_delete", (object_pass) => {
    socket.broadcast.emit("figure_delete", object_pass);
  });

  socket.on("figure_copied", (object_pass) => {
    socket.broadcast.emit("figure_copied", object_pass);
  });

  socket.on("text:add", (object_pass) => {
    socket.broadcast.emit("text:add", object_pass);
  });

  socket.on("canvas_save_to_json", (canvas_pass) => {
    //socket.broadcast.emit('canvas_save_to_json', canvas_pass);
    const data_saved = JSON.stringify(canvas_pass, null, "\t");

    fs.writeFile("saved_data.json", data_saved, (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log("saved");
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(port, () => {
  console.log(`Server running at port ` + port);
});
