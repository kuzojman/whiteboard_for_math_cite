//import { canvas } from "./some_functions.js"
const canvas = new fabric.Canvas(document.getElementById("canvasId"));
const as = document.querySelector(".scale__value");

let isCursorMove = false;

const buttonCursorMove = document.querySelector('#moving_our_board'); 
console.log(buttonCursorMove);

const handleDownKeySpace = (event) => {
  if (event.code === 'Space' && !event.repeat) {
      event.preventDefault();
      canvas.toggleDragMode();
      canvas.isDrawingMode = false;
      buttonCursorMove.classList.add('settings-panel__button-cursor-move_active');
      buttonCursorMove.classList.add('settings-panel__button-cursor-move_disabled');
      isCursorMove = true;
  }
}           // Нажатие на пробел
const handleUpKeySpace = (event) => {
  if (event.code === 'Space') {
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


const socket = io();


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
  drawLine();
});

const cylinderAddButton = document.querySelector('#draw_cylinder');
cylinderAddButton.addEventListener("click",(e) => 
{
  add_3d_figure('add_cylinder');
});

const hexagonAddButton = document.querySelector('#draw_hexagon');
hexagonAddButton.addEventListener("click",(e) => 
{
  add_3d_figure('add_hexagon');
});





const uploadButton = document.querySelector('.tool-panel__item-button-uploader');
uploadButton.addEventListener("click",(e) => {
  //document.getElementById("uploader").onchange = function(e) 
  //{
    var reader = new FileReader();
    reader.onload = function(e) 
    {
      var image = new Image();
      image.src = e.target.result;
      image.onload = function() 
      {
        var img = new fabric.Image(image);
        img.set(
        {
          left: 100,
          top: 60
        });
        img.scaleToWidth(600);
        canvas.add(img).setActiveObject(img).renderAll();
        socket.emit('canvas_save_to_json',canvas.toJSON());
        socket.emit("picture:add",canvas.toJSON());
        console.log("picture:add",img);
        console.log("работает!!!!!!!!!!!!!!!!!! загружается картинка!");
      }
    }
    reader.readAsDataURL(e.target.files[0]);
  //}
  
}) 


socket.on( 'connect', function()
{
    socket.on('mouse:move', function(e)
    {
      canvas.freeDrawingBrush._points = e.map(item => 
        {
        return new fabric.Point(item.x, item.y)
      })
      canvas._onMouseUpInDrawingMode({target: canvas.upperCanvasEl}) 

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
          strokeWidth: 5,
          fill: line_taken.fill,//'#07ff11a3',
          stroke: line_taken.stroke,//'#07ff11a3',
          originX: 'center',
          originY: 'center',
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
      if(data)
      {
        canvas.loadFromJSON(data);
      }
    })

    canvas.on('object:modified', e =>
    {
      socket.emit('canvas_save_to_json',canvas.toJSON());
      send_part_of_data(e);
      //socket.emit('object:modified', canvas.toJSON())
    });



    canvas.on('object:moving',e =>
    {
      socket.emit('canvas_save_to_json',canvas.toJSON());
      send_part_of_data(e);
    });


    socket.on('object:moving', e =>
    {
        recive_part_of_data(e);
    });

    socket.on('figure_delete', e =>
    {
        console.log('figure_delete',e)
        canvas.loadFromJSON(e);
    });

    socket.on('figure_copied', e =>
    {
        console.log('figure_copied',e)
        canvas.loadFromJSON(e);
    });
    

    canvas.on('object:scaling',e =>
    {

      socket.emit('canvas_save_to_json',canvas.toJSON());
      send_part_of_data(e);
    });


    socket.on('object:scaling', e =>
    {
        recive_part_of_data(e);
    });

    canvas.on('object:rotating',e =>
    {
      socket.emit('canvas_save_to_json',canvas.toJSON());
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
  removeEvents();
  canvas.isDrawingMode = true;
  drawingColorEl.onchange = function() 
  {
    canvas.freeDrawingBrush.color = drawingColorEl.value;
    socket.emit("color:change",drawingColorEl.value);
  };
  
  drawingLineWidthEl.onchange = function() 
  {
    canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10) || 1;
    socket.emit("width:change", canvas.freeDrawingBrush.width);
  };
  let isDrawing = false

  canvas.on('mouse:down', e => 
  {
    isDrawing = true;
    socket.emit('mouse:down', e)
  })
  canvas.on('mouse:up', e => 
  {
    isDrawing = false;
    socket.emit('canvas_save_to_json',canvas.toJSON());

  })
  canvas.on('mouse:move', function (e)
  {
    if (isDrawing) 
    {
      socket.emit('mouse:move', canvas.freeDrawingBrush._points);       
    }
  })
}

/*
  
function drawLine() 
{
  console.log('line ,y!!!!!!!!')
  let line, isDown;

  removeEvents();
  changeObjectSelection(false);
  canvas.on('mouse:down', function(o) {
    isDown = true;
    let pointer = canvas.getPointer(o.e);
    let points = [pointer.x, pointer.y, pointer.x, pointer.y];
    line = new fabric.Line(points, {
      strokeWidth: drawing_figure_width.value,
      //fill: hexToRgbA(drawing_color_fill.value,drawing_figure_opacity.value),
      //stroke: hexToRgbA(drawing_color_fill.value,drawing_figure_opacity.value),
      //strokeDashArray: [stroke_line, stroke_line],
      stroke: '#07ff11a3',
      originX: 'center',
      originY: 'center',
      selectable: false
    });
    canvas.add(line);
    socket.emit("line:add",points);
    console.log("line:add",points);
  });
  canvas.on('mouse:move', function(o) {
    if (!isDown) return;
    let pointer = canvas.getPointer(o.e);
    line.set({
      x2: pointer.x,
      y2: pointer.y
    });
    canvas.renderAll();
    socket.emit("line:edit",{x1:line.x1,y1:line.y1,x2:line.x2,y2:line.y2});
    //socket.emit("line:edit",line);
    console.log("line:edit",{x1:line.x1,y1:line.y1,x2:line.x2,y2:line.y2},line);
  });

  canvas.on('mouse:up', function(o) {
    isDown = false;
    line.setCoords();
    socket.emit('canvas_save_to_json',canvas.toJSON());
  });
}




*/










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
    socket.emit("canvas_save_to_json", canvas.toJSON());
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
    socket.emit("canvas_save_to_json", canvas.toJSON());
  });
}

document.getElementById("uploader").onchange = function(e) 
{
  var reader = new FileReader();
  reader.onload = function(e) 
  {
    var image = new Image();
    image.src = e.target.result;
    image.onload = function() 
    {
      var img = new fabric.Image(image);
      img.set(
      {
        left: 100,
        top: 60
      });
      img.scaleToWidth(600);
      canvas.add(img).setActiveObject(img).renderAll();
      socket.emit('canvas_save_to_json',canvas.toJSON());
      socket.emit("picture:add",canvas.toJSON());
      console.log("picture:add",img);
      console.log("работает!!!!!!!!!!!!!!!!!!");
    }
  }
  reader.readAsDataURL(e.target.files[0]);
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
    strokeWidth: 5,
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

// drawingModeEl = document.getElementById("drawing-mode"),
//  drawingOptionsEl = document.getElementById("drawing-mode-options"),
  var  drawingColorEl = document.getElementById("drawing-color"),
  drawingLineWidthEl = document.getElementById("drawing-line-width");
/*
  drawingModeEl.addEventListener('click',()=>{
    canvas.isDrawingMode = !canvas.isDrawingMode;
    if (canvas.isDrawingMode) {
      drawingModeEl.innerHTML = "Cancel drawing mode";
      drawingOptionsEl.style.display = "";
    } else {
      drawingModeEl.innerHTML = "Enter drawing mode";
      drawingOptionsEl.style.display = "none";
    }
  })  

*/
//document.getElementById('drawing-mode-selector-2').addEventListener('change', function()




function drawLine() {


  let line, isDown;

  removeEvents();
  changeObjectSelection(false);
  canvas.on("mouse:down", function (o) {
    isDown = true;
    let pointer = canvas.getPointer(o.e);
    let points = [pointer.x, pointer.y, pointer.x, pointer.y];
    line = new fabric.Line(points, {
      strokeWidth: 2,//drawing_figure_width.value,
      //fill: hexToRgbA(drawing_color_fill.value,drawing_figure_opacity.value),
      stroke: 'Black',//hexToRgbA(drawing_color_fill.value, drawing_figure_opacity.value),
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
    socket.emit("canvas_save_to_json", canvas.toJSON());
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
/*
document
  .getElementById("drawing-mode-selector-2")
  .addEventListener("change", function () {
    if (this.value === "━━━") {
      alert("━━━");
      stroke_line = 0;
    } else if (this.value === "- - - - -") {
      alert("- - - - -");
      stroke_line = 20;
    }
  });
*/
document.getElementById("uploader").onchange = function (e) {
  var reader = new FileReader();
  reader.onload = function (e) {
    var image = new Image();
    image.src = e.target.result;
    image.onload = function () {
      var img = new fabric.Image(image);
      img.set({
        left: 100,
        top: 60,
      });
      img.scaleToWidth(600);
      canvas.add(img).setActiveObject(img).renderAll();
      socket.emit("canvas_save_to_json", canvas.toJSON());
      socket.emit("picture:add", canvas.toJSON());
      console.log("picture:add", img);
    };
  };
  reader.readAsDataURL(e.target.files[0]);
};

function print_Text() {
  var textbox = new fabric.Textbox("This is a Textbox object", {
    left: 20,
    top: 50,
    fill: "#880E4F",
    strokeWidth: 2,
    stroke: "#D81B60",
  });

  canvas.add(textbox);
  socket.emit("canvas_save_to_json", canvas.toJSON());
  socket.emit("text:add", canvas.toJSON());
}




function find_object_index(target_object) {
  let target_index;
  let objects = canvas.getObjects();
  objects.forEach(function (object, index) {
    if (object == target_object) {
      target_index = index;
    }
  });
  return target_index;
}

function send_part_of_data(e) {
  if (e.target._objects) {
    let data = { objects: [] };
    let json_canvas = canvas.toJSON();

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

      //console.log('!!!!!!!', object.index,object,object.object.top,object.top_all,object.object.top+object.top_all);

      // d.set(object.object);
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
  //return d;
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




function add_3d_figure(figure)
{
  let width_changed = 4;
  function draw_l(x_first,y_first,x_last,y_last,dotted_maybe)
  {
     function dotted_function(d)
     {
        if (d)
        {
          return 15;
        }else
        {
          return 0;
        }
     }
     let line = new fabric.Line([ x_first,y_first,x_last,y_last,dotted_maybe ],{
         strokeWidth: width_changed,
         fill: 'blue',
         stroke: 'blue',
         originX: 'center',
         originY: 'center',
         strokeDashArray: [dotted_function(dotted_maybe), dotted_function(dotted_maybe)]
       });
     return line;
  }
  function draw_el(top_input,left_input)
  {
     let elip = new fabric.Ellipse(
      {
       top: top_input,
       left: left_input,
       rx: 75,
       ry: 50,
       fill: '',
       stroke: 'blue',
       strokeWidth: width_changed
      });
     return elip;
  }
  if (figure == 'add_cylinder')
  {
    var eli_1  = draw_el(150,400); 
    var eli_2  = draw_el(350,400);
    var line_2 = draw_l(402, 200, 402, 400, false);  
    var line_3 = draw_l(552, 200, 552, 400, false);   
    let cylinder_added = new fabric.Group([ eli_1,eli_2,line_2,line_3 ]);
 
    cylinder_added.set({left: 100,top: 60});
    canvas.add(cylinder_added);
  }else if (figure == 'add_hexagon')
  {
    var line_1  = draw_l(402, 200, 402, 400, false) ;
    var line_2  = draw_l(202, 200, 202, 400, false) ;
    var line_3  = draw_l(202, 200, 402, 200, false) ;
    var line_4  = draw_l(202, 400, 402, 400, false) ;
    var line_5  = draw_l(402, 400, 502, 350, false) ;
    var line_7  = draw_l(402, 200, 502, 150, false) ;
    var line_8  = draw_l(202, 200, 302, 150, false) ;
    var line_9  = draw_l(302, 150, 500, 150, false) ;
    var line_11 = draw_l(300, 150, 300, 350, false) ;
    var line_6  = draw_l(202, 400, 302, 350, true) ;
    var line_10 = draw_l(302, 350, 500, 350, true) ;
    var line_11 = draw_l(500, 150, 500, 350, false) ;
    var line_12 = draw_l(300, 150, 300, 350, true) ;
  
  var group2 = new fabric.Group([ line_1,line_2,line_3,line_4,line_5,line_6,line_7,line_8,line_9,line_10,line_11,line_12], { left: 200, top: 200 });
  canvas.add(group2) 
  }
  socket.emit('canvas_save_to_json',canvas.toJSON());
  socket.emit("picture:add",canvas.toJSON());
  canvas.renderAll();
}



// Перемещение с помощью кнопки
/*
socket.on('object:modified', e =>
{
    console.log('object:modified',e)
    if (e.objects)
    {
      for (const object of e.objects)
      {
        let d = canvas.item(object.index);
        d.set(object.object);
        //canvas._objects[object.object_index]=object;

      }
    }
    else
    {
      let d = canvas.item(e.index);
      d.set(e.object);
      /*d.set(
        {
          left: e.object.left,
          top: e.object.top
        });*/
//canvas._objects[e.target.object_index]=e.target;
// }

//canvas.loadFromJSON(e);
/*let d = canvas.item(e.object_index);

    //console.log('dddd1212d',d.type);
  // console.log('object:modified',e.target,e.target.type);
    d.set(
        {
          left: e.target.left,
          top: e.target.top
        });
        */
//   canvas.renderAll();

//});

/*
 */

/*
  let activeObject = canvas.getActiveObject();
  activeObject.set('fill','rgba(50,50,25,0.51)');
  canvas.renderAll();*/

/*
  let activeObject = canvas.getActiveObject();
  canvas._objects[7].set('fill','rgba(50,50,25,0.51)');
  canvas.renderAll();*/





