//const { set } = require("express/lib/application");

//import { canvas } from "./some_functions.js"
const canvas = new fabric.Canvas(document.getElementById("canvasId"));
//const canvas = new fabric.Canvas(document.getElementById("canvasId"),{ renderOnAddRemove: false });
const as = document.querySelector(".scale__value");
window.canvas = canvas;

let isCursorMove = false;

function get_board_id() {
  const board_id =  document.getElementById("board_id").attributes["board"].value;
  console.log('>>>>>>' + board_id);
  return board_id;
}

let board_id = get_board_id();
let isDown = false;



const buttonCursorMove = document.querySelector('#moving_our_board'); 
console.log(buttonCursorMove);



let isRendering = false;
const render = canvas.renderAll.bind(canvas);

canvas.renderAll = () => {
    if (!isRendering) {
        isRendering = true;
        requestAnimationFrame(() => {
            render();
            isRendering = false;
        });
    }
};





const handleDownKeySpace = (event) => {
  if (event.code === 'Space' && !event.repeat && !isDown) {
      event.preventDefault();
      canvas.toggleDragMode();
      canvas.isDrawingMode = false;
      buttonCursorMove.classList.add('settings-panel__button-cursor-move_active');
      buttonCursorMove.classList.add('settings-panel__button-cursor-move_disabled');
      isCursorMove = true;
  }
}           // Нажатие на пробел
const handleUpKeySpace = (event) => {
  if (event.code === 'Space' && !isDown) {
      event.preventDefault();
      canvas.toggleDragMode();
      canvas.isDrawingMode = true;
      buttonCursorMove.classList.remove('settings-panel__button-cursor-move_active');
      buttonCursorMove.classList.remove('settings-panel__button-cursor-move_disabled');
      isCursorMove = false;
      if(!isCursorMove) {
          document.body.addEventListener('keydown', handleDownKeySpace)
      }
  }
}             // Отпускание пробела





//
//const socket = io('62.113.99.98:3000',{transports:['websocket']});

const socket = io();

function chunk (arr, len) {

  var chunks = [],
      i = 0,
      n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }

  return chunks;
}





const pathUsualGrid = "./images/grids/usual-grid.svg";
const pathTriangularGrid = "./images/grids/triangular-grid.svg";

fabric.Canvas.prototype.toggleDragMode = function () {
  const STATE_IDLE = "idle";
  const STATE_PANNING = "panning";
  // Remember the previous X and Y coordinates for delta calculations
  let lastClientX;
  let lastClientY;
  // Keep track of the state

  let deltaX;
  let deltaY;

  let state = STATE_IDLE;
  // We're entering dragmode
  if (canvas.isDrawingMode) {
      this.off('mouse:move');
      // Discard any active object
      canvas.discardActiveObject();
      // Set the cursor to 'move'
      this.defaultCursor = "move";
      // Loop over all objects and disable events / selectable. We remember its value in a temp variable stored on each object
      this.forEachObject(function (object) {
          object.prevEvented = object.evented;
          object.prevSelectable = object.selectable;
          object.evented = false;
          object.selectable = false;
      });
      // Remove selection ability on the canvas
      this.selection = false;
      // // When MouseUp fires, we set the state to idle
      this.on("mouse:up", function (e) {
          state = STATE_IDLE;

      });
      // // When MouseDown fires, we set the state to panning
      this.on("mouse:down", (e) => {
          state = STATE_PANNING;
          lastClientX = e.e.clientX;
          lastClientY = e.e.clientY;
      });
      // When the mouse moves, and we're panning (mouse down), we continue
      this.on("mouse:move", (e) => {
          if (state === STATE_PANNING && e && e.e) {
              // let delta = new fabric.Point(e.e.movementX, e.e.movementY); // No Safari support for movementX and movementY
              // For cross-browser compatibility, I had to manually keep track of the delta
              // console.log(e.e)
              // Calculate deltas

              if (lastClientX) {
                  deltaX = e.e.clientX - lastClientX; // смещение по оси X
                                                      // (если вниз передвигаемся, то
                                                      // это значение уменьшается иначе увеличивается)
              }
              if (lastClientY) {
                  deltaY = e.e.clientY - lastClientY; // смещение по оси Y
                                                      // (если влево передвигаемся, то
                                                      // это значение увеличивается иначе уменьшается)
              }
              // Update the last X and Y values
              lastClientX = e.e.clientX;
              lastClientY = e.e.clientY;
              let delta = new fabric.Point(deltaX, deltaY);
              this.relativePan(delta);
              // this.trigger("moved");
          }
      });
  } else {
      // When we exit dragmode, we restore the previous values on all objects
      this.forEachObject(function (object) {
          object.evented = object.prevEvented !== undefined ? object.prevEvented : object.evented;
          object.selectable = object.prevSelectable !== undefined ? object.prevSelectable : object.selectable;
      });
      // Reset the cursor
      this.defaultCursor = "default";
      // Remove the event listeners
      this.off("mouse:up");
      this.off("mouse:down");
      this.off("mouse:move");
      this.on("mouse:move", (event) => handleMouseMovement(event))
      // Restore selection ability on the canvas
      this.selection = true;
  }
};


const freeDrawingButton   = document.querySelector('#free_drawing_button');
freeDrawingButton.onclick = enableFreeDrawing;
const selectionButton     = document.querySelector('#selection_button');
selectionButton.onclick   = enableSelection;



const downloadImage = () =>
  {
   const ext = "png";
   const base64 = canvas.toDataURL({
     format: ext,
     enableRetinaScaling: true
   });
   const link = document.createElement("a");
   link.href = base64;
   link.download = `eraser_example.${ext}`;
   link.click();
 };


/*
function downloadImage()
{
  let dataURL = canvas.toDataURL();
  alert(typeof dataURL);
  console.log(type(dataURL));
}
*/





const circleDrawingButton = document.querySelector('#circle_drawing_empty_button');
circleDrawingButton.addEventListener("click",(e) => 
{
  drawcle("empty");
});
const circleDrawingButtonDotted = document.querySelector('#circle_with_stroke_line_button');
circleDrawingButtonDotted.addEventListener("click",(e) => 
{
  drawcle("empty_with_stroke_line");
});
const circleDrawingButtonFilled = document.querySelector('#circle_filled');
circleDrawingButtonFilled.addEventListener("click",(e) => 
{
  drawcle("filled");
});
const rectangleDrawingButton = document.querySelector('#rectangle_drawing_empty_button');
rectangleDrawingButton.addEventListener("click",(e) => 
{
  drawrec("empty");
});
const rectangleDrawingButtonDotted = document.querySelector('#rectangle_with_stroke_line_button');
rectangleDrawingButtonDotted.addEventListener("click",(e) => 
{
  drawrec("empty_with_stroke_line");
});
const rectangleDrawingButtonFilled = document.querySelector('#rectangle_filled');
rectangleDrawingButtonFilled.addEventListener("click",(e) => 
{
  drawrec("filled");
});

const lineDrawingButton = document.querySelector('#line_drawing_button');
lineDrawingButton.addEventListener("click",(e) => 
{
  drawLine('trivial');
});

const lineDrawingButtonDOtted = document.querySelector('#line_drawing_button_dotted');
lineDrawingButtonDOtted.addEventListener("click",(e) => 
{
  drawLine('dotted');
});


socket.on( 'connect', function()
{
    socket.emit("board:board_id",board_id);
    socket.on('mouse:up', function(pointer)
    {
      canvas.freeDrawingBrush.onMouseUp({e:{}});
    });

    socket.on('mouse:down', function(pointer)
    {
      canvas.freeDrawingBrush.onMouseDown(pointer,{e:{}});
    });


    socket.on('mouse:move', function(e)
    {
      /*
      canvas.freeDrawingBrush._points = e.map(item => 
        {
          console.log(item);
        return new fabric.Point(item.x, item.y)
      })
      */
      //canvas._onMouseUpInDrawingMode({target: canvas.upperCanvasEl}) ;
      console.log(e);
      canvas.freeDrawingBrush.onMouseMove(e,{e:{}});
      console.log('recieved',  canvas.freeDrawingBrush._points.length)
    });
    socket.on('color:change', function(colour_taken)
    {
        console.log('recieved colour',colour_taken)
        canvas.freeDrawingBrush.color = colour_taken
    });

    socket.on('width:change', function(width_taken)
    {
        console.log('width:change',width_taken)
        canvas.freeDrawingBrush.width = width_taken
    });

let circle ;
    socket.on('circle:edit', function(circle_taken)
    {
      circle.set({
        radius: circle_taken.radius
      });
      canvas.renderAll();

        console.log('circle:edit',circle_taken)
        //'canvas.freeDrawingBrush.width = width_taken'
    });
    
    socket.on('circle:add', function(circle_taken)
    {
        console.log('circle:add',circle_taken)
        circle = new fabric.Circle(circle_taken)
        canvas.add(circle)
          
        //'canvas.freeDrawingBrush.width = width_taken'
    });

    let rect ;

    socket.on('rect:edit', function(rect_taken)
    {

      rect.set({
        top: rect_taken.top
      });
      rect.set({
        left: rect_taken.left
      });
      rect.set({
        width: rect_taken.width
      });
      rect.set({
        height: rect_taken.height
      });
      canvas.renderAll();
      console.log('rect:edit',rect_taken)
    });
    socket.on('rect:add', function(rect_taken)
    {

        rect = new fabric.Rect(rect_taken)
        canvas.add(rect)
          
        //'canvas.freeDrawingBrush.width = width_taken'
    });

    let line ;

    socket.on('line:edit', function(line_taken)
    {
      line.set({
        x1: line_taken.x1,
        y1: line_taken.y1,
        x2: line_taken.x2,
        y2: line_taken.y2
      });
      canvas.renderAll();
      console.log('line:edit',line_taken.x2, line_taken.y2,line_taken,line)

      //console.log('line:edit',line_taken.x2)
        //'canvas.freeDrawingBrush.width = width_taken'
    });
    socket.on('line:add', function(line_taken)
    {
        console.log('line:add',line_taken)

        line = new fabric.Line(line_taken.points, {
          strokeWidth: line_taken.width,
          fill: line_taken.fill,//'#07ff11a3',
          stroke: line_taken.stroke,//'#07ff11a3',
          originX: 'center',
          originY: 'center',
          strokeDashArray: line_taken.strokeDashArray,
          selectable: false
        });
        //line = new fabric.Line(line_taken)
        canvas.add(line)
        //'canvas.freeDrawingBrush.width = width_taken'
    });


    socket.on('picture:add', function(img_taken)
    {
      canvas.loadFromJSON(img_taken);
    /*  
      console.log("picture:add",img);
        var img = new fabric.Image(img_taken);       
        canvas.add(img)          
*/
    });

    socket.on('image:add', function(img_taken)
    {
      
        var img = new fabric.Image(img_taken);       
        canvas.add(img);
        console.log("image:add",img);        
        //'canvas.freeDrawingBrush.width = width_taken'
    });

    socket.on('take_data_from_json_file',function(data)
    {
      console.log(data,'init_canvas');
      let chunks = chunk(data.objects,30);
      console.log(chunks);
      let chunk_index = 0;
      if(data)
      {
        
        let init_interval = setInterval(function(){
            let chunk = chunks[chunk_index];
            if(!chunk){
              clearInterval(init_interval)
            }
            fabric.util.enlivenObjects(chunk,function(objects)
            {
              console.log(objects);
              objects.forEach(function(object)
              {
                canvas.add(object);
              })
              canvas.renderAll();
            });
            chunk_index++;
        },50)


        //canvas.loadFromJSON(data);
      }
    })

    canvas.on('object:modified', e =>
    {
      socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
      send_part_of_data(e);
    });


    canvas.on('object:added',e =>
    {
      let object = e.target;
      if(!object.id)
      {
        object.set('id',Date.now().toString(36) + Math.random().toString(36).substring(2));
        object.toJSON = (function(toJSON){
          return function(){
            return fabric.util.object.extend(toJSON.call(this),{"id":this.id})
          }
        })(object.toJSON)
        console.log(e);
        if(object.path)
        {
          let massiv_of_points = object.path.map(function(item)
          {
            if(item[0]=='M'||item[0]=='L')
            {
              return [item[1],item[2]];
            }
            else{
              return [item[1],item[2]];
              //return [item[1],item[2],item[3],item[4]];
            }
            
          })
          const error = 10;
          let bezierCurves = fitCurve(massiv_of_points, error);
          
          let bezierProcessedPath = [
            ['M',...bezierCurves[0][0]]
          ];

          for (let i = 0; i < bezierCurves.length; i++)
          {
              bezierProcessedPath.push(['C',...bezierCurves[i][1],...bezierCurves[i][2],...bezierCurves[i][3]]);
          }

          object.path = bezierProcessedPath.map(function(item){
            if(item.length==3){
              return [item[0],Math.round(item[1]),Math.round(item[2])];

            }
            if (item.length==7)
            {
              return [item[0],Math.round(item[1]),Math.round(item[2]),Math.round(item[3]),Math.round(item[4]),Math.round(item[5]),Math.round(item[6])];
            }
          });
        }
      }

      //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
      //send_part_of_data(e);
    });


    canvas.on('object:moving',e =>
    {
      socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
      send_part_of_data(e);
    });


    socket.on('object:moving', e =>
    {
        recive_part_of_data(e);
    });

    socket.on('figure_delete', e =>
    {
        console.log('figure_delete',e)
        e.forEach(function(id)
        {
          canvas._objects.forEach(function(object,index)
          {
            if(index==id)
            {
              canvas.remove(object);
            }
          })
        })
        //canvas.loadFromJSON(e);
    });

    socket.on('figure_copied', e =>
    {
        console.log('figure_copied',e,new fabric.Object(e));
        
        canvas.add(new fabric.Object(e));
        canvas.renderAll();
        //canvas.loadFromJSON(e);
    });
    

    canvas.on('object:scaling',e =>
    {
      socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
      send_part_of_data(e);
    });


    socket.on('object:scaling', e =>
    {
        recive_part_of_data(e);
    });

    canvas.on('object:rotating',e =>
    {
      socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
      send_part_of_data(e);
    });


    socket.on('object:rotating', e =>
    {
        console.log('object:rotating',e);
        recive_part_of_data(e);
        //canvas.loadFromJSON(e);
    });

    socket.on('text:add', e =>
    {
        console.log('text:add',e);
        canvas.loadFromJSON(e);
    });


    socket.on('object:modified', e =>
    {
        console.log('object:modified','fuck yeaa!!!',e);
        
        recive_part_of_data(e);
    });


});


function enableFreeDrawing()
{
  let array_of_points = [];
  removeEvents();
  canvas.isDrawingMode = true;

  canvas.freeDrawingBrush.color = drawingColorEl.value;
  canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);


  let isDrawing = false

  canvas.on('mouse:down', e => 
  {
    isDrawing = true;
    const pointer = canvas.getPointer(e);


    //const newline = new fabric.Point(e.pointer.x,e.pointer.y);
    //const newline = canvas.freeDrawingBrush._points[0];
    ///array_of_points.push(newline);
    ///console.log(array_of_points);
    //socket.emit('mouse:down', e);
    socket.emit('mouse:down', pointer);
  })
  canvas.on('mouse:up', e => 
  {
    isDrawing = false;
    const pointer = canvas.getPointer(e);
    //socket.emit('canvas_save_to_json',canvas.toJSON(['id']));
    // let board_id = get_board_id();
    socket.emit('mouse:up',pointer);
    //array_of_points = [];
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});

  })
  canvas.on('mouse:move', function (e)
  {
    if (isDrawing) 
    {
      const pointer = canvas.getPointer(e);
      socket.emit('mouse:move',pointer );//canvas.freeDrawingBrush._points); 
      console.log(pointer);
      //console.log(array_of_points);
      //console.log(canvas.freeDrawingBrush._points);
      //socket.emit('mouse:move', canvas.freeDrawingBrush._points);       
    }
  })
}


function enableSelection() {
  removeEvents();
  changeObjectSelection(true);
  canvas.selection = true;

  canvas.on("mouse:down", (e) => {
    let d = canvas.getActiveObject();
  });
}


function drawrec(type_of_rectangle) {


  var rect, isDown, origX, origY;
  removeEvents();
  changeObjectSelection(false);

  colour_inside = 'Black';
  let stroke_line   = 0;
  drawingColorEl.onchange = function() 
  {
    colour_inside = drawingColorEl.value;
  };

  if (type_of_rectangle == "empty")
  {
    colour_inside = hexToRgbA('#000dff',5);
    stroke_line   = 0;
  }
  else if(type_of_rectangle == "empty_with_stroke_line")
  {
    colour_inside = hexToRgbA('#000dff',5);
    stroke_line = 20;
  }
  else if (type_of_rectangle == "filled")
  {
    colour_inside = drawingColorEl.value;
    stroke_line = 0;
  }



  canvas.on("mouse:down", function (o) {
    isDown = true;
    var pointer = canvas.getPointer(o.e);
    origX = pointer.x;
    origY = pointer.y;
    var pointer = canvas.getPointer(o.e);
    rect = new fabric.Rect({
      left: origX,
      top: origY,
      originX: "left",
      originY: "top",
      width: pointer.x - origX,
      height: pointer.y - origY,
      angle: 0,
      selectable: false,
      
      fill: colour_inside,//hexToRgbA(drawing_color_fill.value, drawing_figure_opacity.value),
      stroke: 'Black',//drawing_color_border.value,
      strokeDashArray: [stroke_line, stroke_line],
      transparentCorners: false,
    });
    canvas.add(rect);
    socket.emit("rect:add", rect);
  });

  //strokeWidth: 2,//drawing_figure_width.value,


  canvas.on("mouse:move", function (o) {
    if (!isDown) return;
    var pointer = canvas.getPointer(o.e);

    if (origX > pointer.x) {
      rect.set({
        left: Math.abs(pointer.x),
      });
    }
    if (origY > pointer.y) {
      rect.set({
        top: Math.abs(pointer.y),
      });
    }

    rect.set({
      width: Math.abs(origX - pointer.x),
    });
    rect.set({
      height: Math.abs(origY - pointer.y),
    });

    socket.emit("rect:edit", rect);
    canvas.renderAll();
  });

  canvas.on("mouse:up", function (o) {
    isDown = false;
    rect.setCoords();
    //socket.emit("canvas_save_to_json", canvas.toJSON(['id']));
    // let board_id = get_board_id();
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
  });
}


function drawcle(type_of_circle) {
  
  colour_inside = 'Black';
  let stroke_line   = 0;
  drawingColorEl.onchange = function() 
  {
    colour_inside = drawingColorEl.value;
  };
  if (type_of_circle == "empty")
  {
        colour_inside = hexToRgbA('#000dff',5);//hexToRgbA(drawing_color_fill.value, drawing_figure_opacity.value),
        stroke_line   = 0;
  }
  else if(type_of_circle == "empty_with_stroke_line")
  {
    colour_inside = hexToRgbA('#000dff',5);
    stroke_line = 20;
  }
  else if (type_of_circle == "filled")
  {
    colour_inside = drawingColorEl.value;
    stroke_line = 0;
  }



  var circle, isDown, origX, origY;
  removeEvents();
  changeObjectSelection(false);
  canvas.on("mouse:down", function (o) {
    isDown = true;
    var pointer = canvas.getPointer(o.e);
    origX = pointer.x;
    origY = pointer.y;
    circle = new fabric.Circle({
      left: pointer.x,
      top: pointer.y,
      radius: 1,
      strokeWidth: 2,//drawing_figure_width.value,
      fill: colour_inside,
      stroke: 'Black',
      strokeDashArray: [stroke_line, stroke_line],//drawing_color_border.value,strokeDashArray: [stroke_line, stroke_line],
      selectable: false,
      originX: "center",
      originY: "center",
    });
    canvas.add(circle);
    socket.emit("circle:add", circle);
  });

  canvas.on("mouse:move", function (o) {
    if (!isDown) return;
    var pointer = canvas.getPointer(o.e);
    circle.set({
      radius: Math.abs(origX - pointer.x),
    });
    socket.emit("circle:edit", circle);
    canvas.renderAll();
  });

  canvas.on("mouse:up", function (o) {
    isDown = false;
    circle.setCoords();
    //socket.emit("canvas_save_to_json", canvas.toJSON(['id']));
    // let board_id = get_board_id();
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
  });
}

canvas.setBackgroundColor(
    {
      source: pathUsualGrid,
      repeat: "repeat",
      scaleX: 1,
      scaleY: 1,
    },
    canvas.renderAll.bind(canvas)
);


window.addEventListener("resize", resizeCanvas, false);

function resizeCanvas() {
  canvas.setHeight(window.innerHeight);
  canvas.setWidth(window.innerWidth);
  canvas.renderAll();
}

// resize on init
resizeCanvas();




canvas.isDrawingMode = false;
//canvas.freeDrawingBrush.width = 5;
//canvas.freeDrawingBrush.color = '#00aeff';

function handle_mouse_move(e) {
  canvas.freeDrawingBrush._points = e.map((item) => {
    return new fabric.Point(item.x, item.y);
  });
  canvas._onMouseUpInDrawingMode({ target: canvas.upperCanvasEl });

  console.log("recieved", canvas.freeDrawingBrush._points.length);
}

function change_colour_of_brush(colour_taken) {
  console.log("recieved colour", colour_taken);
  canvas.freeDrawingBrush.color = colour_taken;
}

function handle_editing_rectangle(rect_taken) {
  rect.set({
    top: rect_taken.top,
  });
  rect.set({
    left: rect_taken.left,
  });
  rect.set({
    width: rect_taken.width,
  });
  rect.set({
    height: rect_taken.height,
  });
  canvas.renderAll();
  console.log("rect:edit", rect_taken);
}

function editing_passing_rectangle(rect_taken) {
  rect = new fabric.Rect(rect_taken);
  canvas.add(rect);
  //'canvas.freeDrawingBrush.width = width_taken'
}

function adding_line_to_partner_board(line_taken) {
  console.log("line:add", line_taken);

  line = new fabric.Line(line_taken, {
    strokeWidth: 15,
    fill: "#07ff11a3",
    stroke: "#07ff11a3",
    originX: "center",
    originY: "center",
    selectable: false,
  });
  //line = new fabric.Line(line_taken)
  canvas.add(line);
  //'canvas.freeDrawingBrush.width = width_taken'
}

function editing_added_line_to_board(line_taken) {
  line.set({
    x1: line_taken.x1,
    y1: line_taken.y1,
    x2: line_taken.x2,
    y2: line_taken.y2,
    stroke: line_taken.stroke,
    fill: line_taken.fill
  });
  canvas.renderAll();
  console.log("line:edit", line_taken.x2, line_taken.y2, line_taken, line);

  //console.log('line:edit',line_taken.x2)
  //'canvas.freeDrawingBrush.width = width_taken'
}

function width_of_line_passed_taken(width_taken) {
  console.log("width:change", width_taken);
  canvas.freeDrawingBrush.width = width_taken;
}

function circle_passed_to_board(circle_taken) {
  circle.set({
    radius: circle_taken.radius,
  });
  canvas.renderAll();

  console.log("circle:edit", circle_taken);
  //'canvas.freeDrawingBrush.width = width_taken'
}

function adding_circle_on_the_board(circle_taken) {
  console.log("circle:add", circle_taken);
  circle = new fabric.Circle(circle_taken);
  canvas.add(circle);

  //'canvas.freeDrawingBrush.width = width_taken'
}

let stroke_line = 0;

var drawing_color_fill = document.getElementById("drawing-color-fill"),
  drawing_color_border = document.getElementById("drawing-color-border"),
  drawing_figure_width = document.getElementById("drawing-figure-width"),
  drawing_figure_opacity = document.getElementById("opacity");

  var  drawingColorEl = document.getElementById("drawing-color"),
  drawingLineWidthEl = document.getElementById("drawing-line-width");

canvas.freeDrawingBrush.color = drawingColorEl.value;
canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);

drawingColorEl.oninput = function() 
{
  console.log("color:change",drawingColorEl.value);
  canvas.freeDrawingBrush.color = drawingColorEl.value;
  socket.emit("color:change",drawingColorEl.value);
};

drawingLineWidthEl.oninput = function() 
{
  canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);
  socket.emit("width:change", canvas.freeDrawingBrush.width);
};







function drawLine(type_of_line) {
  canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);
  console.log(drawingLineWidthEl.value,canvas.freeDrawingBrush.width);
  canvas.freeDrawingBrush.color = drawingColorEl.value;
  drawingLineWidthEl.onchange = function() 
  {
    canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10) ;
    socket.emit("width:change", canvas.freeDrawingBrush.width);
  };
  let line, isDown;

  drawingColorEl.onchange = function() 
  {
    canvas.freeDrawingBrush.color = drawingColorEl.value;
    socket.emit("color:change",drawingColorEl.value);
  };
  console.log(type_of_line);
  if (type_of_line == "trivial")
  {
    colour_inside = hexToRgbA('#000dff',5);
    stroke_line   = 0;
  }
  else if(type_of_line == "dotted")
  {
    colour_inside = hexToRgbA('#000dff',5);
    stroke_line = 20;
  }

  console.log(stroke_line);

  removeEvents();
  changeObjectSelection(false);
  canvas.on("mouse:down", function (o) {
    isDown = true;
    let pointer = canvas.getPointer(o.e);
    let points = [pointer.x, pointer.y, pointer.x, pointer.y];
    line = new fabric.Line(points, {
      strokeWidth: canvas.freeDrawingBrush.width,//drawing_figure_width.value,
      //fill: hexToRgbA(drawing_color_fill.value,drawing_figure_opacity.value),
      stroke: canvas.freeDrawingBrush.color,//hexToRgbA(drawing_color_fill.value, drawing_figure_opacity.value),
      strokeDashArray: [stroke_line, stroke_line],
      ///stroke: '#07ff11a3',
      originX: "center",
      originY: "center",
      selectable: false,
    });
    canvas.add(line);
    socket.emit("line:add", {
      points: points,
      fill:line.fill,
      width: line.strokeWidth,
      strokeDashArray: [stroke_line, stroke_line],
      stroke: line.stroke});
    console.log("line:add", points);
  });
  canvas.on("mouse:move", function (o) {
    if (!isDown) return;
    let pointer = canvas.getPointer(o.e);
    line.set({
      x2: pointer.x,
      y2: pointer.y,
    });
    canvas.renderAll();
    socket.emit("line:edit", {
      x1: line.x1,
      y1: line.y1,
      x2: line.x2,
      y2: line.y2,
      stroke: line.stroke,
      fill: line.fill
    });
    //socket.emit("line:edit",line);
    console.log(
      "line:edit",
      { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 },
      line
    );
  });

  canvas.on("mouse:up", function (o) {
    isDown = false;
    line.setCoords();
    //socket.emit("canvas_save_to_json", canvas.toJSON(['id']));
    // let board_id = get_board_id();
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
  });
}




function changeObjectSelection(value) {
  canvas.forEachObject(function (obj) {
    obj.selectable = value;
  });
  canvas.renderAll();
}

function removeEvents() {
  canvas.isDrawingMode = false;
  canvas.selection = false;
  canvas.off("mouse:down");
  canvas.off("mouse:up");
  canvas.off("mouse:move");
}

function hexToRgbA(hex, figures_opacity) {
  var c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split("");
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = "0x" + c.join("");
    return (
      "rgba(" +
      [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",") +
      "," +
      figures_opacity / 100 +
      ")"
    );
  }
  throw new Error("Bad Hex");
}

var drawingOptionsEl = document.getElementById("drawing-mode-options-2");

function print_Text() {
  var textbox = new fabric.Textbox("This is a Textbox object", {
    left: 20,
    top: 50,
    fill: "#880E4F",
    strokeWidth: 2,
    stroke: "#D81B60",
  });

  canvas.add(textbox);
  socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
  socket.emit("text:add", canvas.toJSON(['id']));
}

function find_object_index(target_object) {
  let target_index; 
  let objects = canvas.getObjects();
  console.log(objects,'objects',target_object)
  objects.forEach(function (object, index) {
    if (object.id == target_object.id) {
      target_index = index;
    }
  });
  if(!target_index)
  {
    objects.forEach(function (object, index) {
      if (object.id == target_object.id) {
        target_index = index;
      }
    });
  }
  console.log(target_index,'target_index')
  return target_index;
}

function send_part_of_data(e) {
  if (e.target._objects) {
    let data = { objects: [] };
    let json_canvas = canvas.toJSON(['id']);
    console.log(e,'send_part_of_data');
    if(e.transform.target.type=='group')
    {
        let object_index = find_object_index(e.transform.target);
        //console.log('group_index',find_object_index(e.transform.target));
        e.transform.target.object_index = find_object_index(e.transform.target);
        data.objects.push({
          index: object_index,
          object:e.transform.target,
          top_all: json_canvas.objects[object_index].top,
          left_all: json_canvas.objects[object_index].left,
          angle: json_canvas.objects[object_index].angle,
          scaleX: json_canvas.objects[object_index].scaleX,
          scaleY: json_canvas.objects[object_index].scaleY,
        })
    }else{   
      e.transform.target._objects.forEach((object) => {
        let object_index = find_object_index(object);
        object.object_index = object_index;
        data.objects.push({
          object: object,
          index: object_index,
          top_all: json_canvas.objects[object_index].top,
          left_all: json_canvas.objects[object_index].left,
          angle: json_canvas.objects[object_index].angle,
          scaleX: json_canvas.objects[object_index].scaleX,
          scaleY: json_canvas.objects[object_index].scaleY,
        });
      });
    }
    socket.emit("object:modified", data);
    console.log("data send", data);
    //console.log('e send',e);
  } else {
    let object_index = find_object_index(e.target);

    e.target.object_index = object_index;

    socket.emit("object:modified", {
      object: e.target,
      index: object_index,
    });
  }
}







function recive_part_of_data(e) {
  console.log("get something", e);
  if (e.objects) {
    for (const object of e.objects) {
      let d = canvas.item(object.index);

      d.set({
        top: object.top_all, //+object.object.top,
        left: object.left_all, //+object.object.left
        angle: object.angle,
        scaleX: object.scaleX,
        scaleY: object.scaleY,
      });
    }
  } else {
    let d = canvas.item(e.index);
    //d.set(e.object);
    d.set({
      top: e.object.top, //+object.object.top,
      left: e.object.left, //+object.object.left
      angle: e.object.angle,
      scaleX: e.object.scaleX,
      scaleY: e.object.scaleY,
    });
  }
  canvas.renderAll();
}

document.body.addEventListener('keydown', handleDownKeySpace);
document.body.addEventListener('keyup', handleUpKeySpace);


const handleButtonCursorMoveClick = () => {
  console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!jdasjdkjdkajsdkajkdjasdkajd')
  isCursorMove = !isCursorMove;
  console.log(isCursorMove)
  if(isCursorMove){
      document.body.removeEventListener('keydown', handleDownKeySpace);
  } else {
      document.body.addEventListener('keydown', handleDownKeySpace);
  }
  canvas.toggleDragMode();
  buttonCursorMove.classList.toggle('settings-panel__button-cursor-move_active');
  canvas.isDrawingMode = !canvas.isDrawingMode;
} 
buttonCursorMove.addEventListener('click', handleButtonCursorMoveClick);


const toolPanelList = document.querySelector('.tool-panel__list');

let selectedButton = freeDrawingButton;


toolPanelList.addEventListener('click', (event) => {
    let currentButton = event.target.closest('.tool-panel__item-button');
    if(selectedButton === currentButton) {
        selectedButton?.classList.toggle('settings-panel__button_active');
    } else {
        if(currentButton) currentButton.classList.toggle('settings-panel__button_active');
        if(selectedButton) {
            selectedButton.classList.remove('settings-panel__button_active');
        }
        selectedButton = currentButton;
    }
})



const buttonText = document.querySelector('.tool-panel__item-button-text'); // *
const formTextTextarea = document.querySelector('.form-text__textarea');
const modalTextWrapper = document.querySelector('.modal-text-wrapper');
const formTextInput = document.querySelector('.form-text__input');
const textSettings = document.querySelector('.text-settings');
const formTextButtonSubmit = document.querySelector('.form-text__button-submit');

const buttonFontSizeUp = document.querySelector('.text-settings__button-font-size-up');
const buttonFontSizeDown = document.querySelector('.text-settings__button-font-size-down');
//const fontSizeValue = document.querySelector('.text-settings__font-size-value');
const buttonOpenListFontFamily = document.querySelector('.text-settings__button-open-list');
const fontFamilyListWrapper = document.querySelector('.text-settings__font-family-list_wrapper');
//const fontFamilyList = document.querySelector('.text-settings__font-family-list');


//let selectedFontFamily = "Open Sans";
//let newFontSizeValue = "25";
/*
fontFamilyList.addEventListener('click', (event) => {
    selectedFontFamily = event.target.textContent;
    formTextInput.style.fontFamily = selectedFontFamily;
})
*/
/*
buttonOpenListFontFamily.addEventListener('click', () => {
    fontFamilyListWrapper.classList.toggle('text-settings__font-family-list_wrapper_active');
})
buttonFontSizeUp.addEventListener('click',() => {
    const currentFontSize = Number(fontSizeValue.textContent);
    newFontSizeValue = currentFontSize + 1;
    fontSizeValue.textContent = newFontSizeValue + '';
    formTextInput.style.fontSize = newFontSizeValue + 'px';
});
buttonFontSizeDown.addEventListener('click', () => {
    const currentFontSize = Number(fontSizeValue.textContent);
    const newFontSizeValue = currentFontSize - 1;
    fontSizeValue.textContent = newFontSizeValue + '';
    formTextInput.style.fontSize = newFontSizeValue + 'px';
})
*/

let mouseCursorCoordinatesCanvas = {
    x: 0,
    y: 0,
}
/*
formTextTextarea.addEventListener('input', () => {
    formTextInput.value = formTextTextarea.value;
})
formTextButtonSubmit.addEventListener('click', (event) => {
    event.preventDefault();
    console.log(selectedFontFamily, newFontSizeValue)
    const text = new fabric.Text(formTextInput.value, {
        left: mouseCursorCoordinatesCanvas.x,
        top: mouseCursorCoordinatesCanvas.y,
        fill: 'black',
        fontFamily: selectedFontFamily,
        fontSize: newFontSizeValue
    })
    canvas.add(text);
    canvas.renderAll();
    mouseCursorCoordinatesCanvas = {
        x: 0,
        y: 0
    };
    formTextTextarea.value ='';
    formTextInput.value = '';
})
buttonText.addEventListener('click', (event) => {
    let origX, origY;
    buttonText.classList.add('settings-panel__button_active');
    textSettings.classList.toggle('text-settings_active');
    console.log(isDown)
    if(isDown) {
        console.log('dddd')
        buttonText.classList.remove('settings-panel__button_active');
        canvas.off('mouse:down');
        canvas.off('mouse:up');
    }
    changeObjectSelection(false);
    console.log(canvas.__eventListeners);
    removeEvents();
    if(modalTextWrapper.classList.contains('modal-text-wrapper_active')) {
        removeEvents();
        modalTextWrapper.classList.remove('modal-text-wrapper_active');
        return;
    }
    canvas.on('mouse:down', function(o) {
        console.log('mouse:down');
        const pointer = canvas.getPointer(o.e);
        if(formTextTextarea.value !== ''){
            canvas.renderAll();
            modalTextWrapper.classList.remove('modal-text-wrapper_active');
        } else {
            mouseCursorCoordinatesCanvas = {
                x: pointer.x,
                y: pointer.y,
            }
            origX = o.pointer.x;
            origY = o.pointer.y;
            modalTextWrapper.style.left = origX + 'px';
            modalTextWrapper.style.top = origY + 'px';
            modalTextWrapper.classList.add('modal-text-wrapper_active');
        }
    });
    canvas.on('mouse:up', function(o) {
        console.log('mouse:up')
        formTextInput.value = '';
        formTextTextarea.value ='';
        // isDown = false;
        // removeEvents();
    });
    isDown = true;
})
const inputChangeColor = document.querySelector('.sub-tool-panel__item-list-color-selection > input');
const subToolPanel = inputChangeColor.closest('.sub-tool-panel__change-color');
const handleClickOpenInputChangeColor = () => {
  subToolPanel.classList.add('sub-tool-panel_visible');
}
const handleClickCloseInputChangeColor = (event) => {
  if (event.target !== inputChangeColor) {
      subToolPanel?.classList.remove('sub-tool-panel_visible');
  }
}
window.addEventListener('click', handleClickCloseInputChangeColor);
inputChangeColor.addEventListener('click', handleClickOpenInputChangeColor);
*/

let selectedFontFamily = "Open Sans";
let newFontSizeValue = 40;

const buttonFontFamily = document.querySelector('.setting-item__button-font-family');
const fontFamilyList = document.querySelector('.setting-item__font-family-list-wrapper');
const fontSizeValue = document.querySelector('.setting-item__font-size-value');
const fontColorInput = document.querySelector('.setting-item__input-font-color > input');
const fontColorListWrapper = document.querySelector('.setting-item__font-color-list-wrapper');
const buttonFontStyleDiv = document.querySelector('.setting-item__font-color-list-wrapper > div');


fontColorInput.addEventListener('click', () => {
    fontColorListWrapper.classList.add('active');
})

fontColorInput.addEventListener('change', (e) => {
    canvas.getActiveObject().set("fill", e.target.value);
})

textSettings.addEventListener('click', (e) => {
    switch(e.target.tagName) {
        case "LI":
            if(e.target.classList.contains('setting-item__font-family-item')) {
              
                selectedFontFamily = e.target.textContent;
                buttonFontFamily.textContent = e.target.textContent;
                e.target.classList.toggle('text-settings__font-item_active');
                console.log(selectedFontFamily)
                canvas.getActiveObject().set('fontFamily', selectedFontFamily);
                canvas.renderAll();
            } else if(e.target.classList.contains('setting-item__font-style-item')) {
                const text = canvas.getActiveObject();
                switch(+e.target.dataset.item) {
                    case 1: {
                        
                        const currentFontWeight = getStyle(text,'fontWeight')
                        const newFontWeight = currentFontWeight === "bold" ? "normal" : "bold";
                        e.target.classList.toggle('text-settings__font-item_active')
                        canvas.getActiveObject().set("fontWeight", newFontWeight);
                        canvas.renderAll();
                        console.log('1');
                        return;
                    }
                    case 2: {
                        const currentFontStyle = getStyle(text,'fontStyle');
                        const newFontStyle = currentFontStyle === "italic" ? "normal" : "italic";
                        canvas.getActiveObject().set("fontStyle", newFontStyle);
                        e.target.classList.toggle('text-settings__font-item_active')
                        canvas.renderAll();
                        console.log('2');
                        return;
                    }
                    case 3: {
                        const currentUnderline = getStyle(text,'underline');
                        const newUnderline = !currentUnderline;
                        canvas.getActiveObject().set("underline", newUnderline);
                        e.target.classList.toggle('text-settings__font-item_active')
                        canvas.renderAll();
                        console.log('3');
                        return;
                    }
                    case 4: {
                        const currentLinethrough = getStyle(text,'linethrough');
                        const newLinethrough = !currentLinethrough
                        canvas.getActiveObject().set("linethrough", newLinethrough);
                        e.target.classList.toggle('text-settings__font-item_active')
                        canvas.renderAll();
                        console.log('4');
                        return;
                    }
                }
            }
            canvas.renderAll();
        case 'BUTTON':
            if(e.target.classList.contains('setting-item__button-font-size-down')){
                newFontSizeValue-=2;
                fontSizeValue.textContent = newFontSizeValue
                canvas.getActiveObject().set('fontSize', newFontSizeValue)

            } else if(e.target.classList.contains('setting-item__button-font-size-up')){
                newFontSizeValue+=2;
                fontSizeValue.textContent = newFontSizeValue
                canvas.getActiveObject().set('fontSize', newFontSizeValue)
            }
            canvas.renderAll();
        default:
            return

    }
    
})



  
const getStyle = (object, styleName) => {
    return object[styleName];
}

const onSelectionChanged = () => {
    changeObjectSelection(false);
    const obj = canvas.getActiveObject();
    if (obj.selectionStart>-1) {
      console.log(getStyle(obj,'fontSize'));
    }
}


canvas.on('text:selection:changed', onSelectionChanged);

const showTextEditPanel = () => {
    buttonText.classList.add('settings-panel__button_active');
    textSettings.classList.add('text-settings_active');
}

const hideTextEditPanel = () => {
    textSettings.style.left = '';
    textSettings.style.top = '';
    isDown = false;
    removeEvents();
    changeObjectSelection(true);
    buttonText.classList.remove('settings-panel__button_active');
    textSettings.classList.remove('text-settings_active');
    fontColorListWrapper.classList.remove('active');
}


let pageX, pageY;

document.addEventListener('mousemove', (e) => {
    pageX = e.pageX;
    pageY = e.pageY;
}, false);



buttonText.addEventListener('click', () => {
    
    selectedButton.classList.remove('settings-panel__button_active');
    selectedButton = buttonText;
    removeEvents();
    console.log('buttonText > click');
    isDown = !isDown;
    let isEditing = false;
    let firstTouch = false;
    console.log(isDown)

    buttonText.classList.toggle('settings-panel__button_active');

    if(isDown) {
        changeObjectSelection(false);
        canvas.isDrawingMode = false;
        canvas.on('mouse:down', function(o) {
            if(!isEditing) {
                textSettings.classList.add('text-settings_active');
                console.log('mouse:down');
                const pointer = canvas.getPointer(o.e);
                const text = new fabric.IText('Tap and Type', { 
                    fontFamily: selectedFontFamily,
                    fontSize: newFontSizeValue,
                    left: pointer.x, 
                    top: pointer.y,
                    textDecoration: 'underline',
                    editable: true,
                })
                canvas.add(text);
                canvas.setActiveObject(text);
                text.enterEditing();
                text.selectAll();
                isEditing = text.isEditing;
            }

        });

        canvas.on('mouse:up', function(o) {
            if(o.target !== null){
                if(o.target.isType('i-text') && isEditing) {
                    console.log('IT IS TEXT!!!! - 1');
                }
                else {
                    if(!firstTouch) {
                        firstTouch = true;
                    } else {
                        console.log('NOT TEXT!!!! - 1');
                        hideTextEditPanel();
                        firstTouch = false;
                    }
                }
            } else {
                if(isEditing && !firstTouch) {
                    console.log('IT IS TEXT!!!! - 2')
                    firstTouch = true;

                } else {
                    console.log('NOT TEXT!!!! - 2');
                    hideTextEditPanel();
                    isEditing = false;
                }
                
            }
            console.log('mouse:up')
        });

    } else {
        canvas.isDrawingMode = false;
        textSettings.classList.remove('text-settings_active');
        changeObjectSelection(true);
        removeEvents();
    }
})

canvas.on('text:editing:entered', () => {
    console.log('text:editing:entered')
    showTextEditPanel();
    isDown = true;
    document.body.addEventListener('keyup', (e) => {
        if(e.code === 'Escape') {
            hideTextEditPanel();    
        }
    }, { once: true })
    canvas.on('mouse:down', function(o) {
        console.log('mouse:up')
        if(o.target === null ? true : !o.target.isType('i-text')){
            hideTextEditPanel();
        }
    });
});