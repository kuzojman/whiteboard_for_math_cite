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
  //socket.emit('canvas_save_to_json',canvas.toJSON());
  // let board_id = get_board_id();
  socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON()});
  socket.emit("picture:add",canvas.toJSON());
  canvas.renderAll();
}

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
        //socket.emit('canvas_save_to_json',canvas.toJSON());
        // let board_id = get_board_id();
        socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON()});
        socket.emit("picture:add",canvas.toJSON());
        console.log("picture:add",img);
        console.log("работает!!!!!!!!!!!!!!!!!! загружается картинка!");
      }
    }
    reader.readAsDataURL(e.target.files[0]);
  //}
  
}) 