
// для продакшна надо оставить пустым
let serverHostDebug = "http://localhost:5000/" //"https://kuzovkin.info"  //
// есть ли доступ к доске? и в качестве какой роли
let accessBoard = false;
// ожидаем ли мы одобрения от учителя?
let waitingOverlay = false;

const canvas = new fabric.Canvas(document.getElementById("canvasId"),{
  allowTouchScrolling: true,
});

let selectionTimer = null;

let selectedTool = "";

/**
 * Нажатие на кнопку выбора инструмента
 */
function selectTool(event){
    let currentButton = event.target.closest('.tool-panel__item-button');
    if( currentButton) {

      let currentAction = currentButton.dataset.tool;

      if ( currentAction ){
        if (currentAction==selectedTool){
          selectedTool=""
        }else{
          selectedTool=currentAction
        }
      }


      let siblings = getSiblings(currentButton);
      if ( siblings.length>0 ){
        if ( siblings.map(e=>e.classList).indexOf('sub-tool-panel') ){
          if(selectedButton === currentButton) {
            toolPanel.classList.toggle('full-screen');
          }else{
            toolPanel.classList.add('full-screen');
          }
        }else{
          toolPanel.classList.remove('full-screen')
        }
      }else{
        toolPanel.classList.remove('full-screen')
      }
    }else{
      toolPanel.classList.remove('full-screen')
    }

    if(selectedButton === currentButton && selectedButton) {
        if ( !selectedButton.classList.contains('js-modal-trigger') ){
          selectedButton.classList.toggle('settings-panel__button_active');
        }
    } else {
        if(currentButton) {
          if ( !currentButton.classList.contains('js-modal-trigger') ){
            currentButton.classList.toggle('settings-panel__button_active');
          }
        }
        if(selectedButton) {
            selectedButton.classList.remove('settings-panel__button_active');
        }
        selectedButton = currentButton;
    }

}

canvas.on('touch:gesture',function(e){
  isGestureEvent = true;
  if ( e.self.touches!==undefined && e.self.touches.length==2 ){
    this.selection = false;
    var lPinchScale = e.self.scale;  
    var scaleDiff = (lPinchScale -1)/10 + 1;  // Slow down zoom speed    
    const delta = e.self.scale-currentValueZoom;
    // alert(JSON.stringify(e.self));
    handleScale(delta);
    as.textContent = (currentValueZoom * 100).toFixed(0)+'%';
    canvas.zoomToPoint({x:e.self.x, y: e.self.y},currentValueZoom);
    selectionTimer = setTimeout( enableSelection , 500);
  }
  
});

const MAX_ZOOM_IN  = 4;
const MAX_ZOOM_OUT = 0.05;
const SCALE_STEP = 0.05;

let currentValueZoom = 1;

let currentRadiusCursor = 10;

const cursorUser = createCursor()

function createCursor(){
  let curs_ =  new fabric.Circle({              // Представление курсора
    radius: currentRadiusCursor,
    fill: 'red',
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
  });
  let text_ = new fabric.Text("Username", {
    fontFamily: 'Calibri',
    fontSize: 14,
    textAlign: 'left',
    originX: 'center',
    originY: 'center',
    left: currentRadiusCursor*2,
    top: currentRadiusCursor*2  });
  let cursor_ = new fabric.Group([curs_,text_],{
    left: -10,
    top: -10,
  })
  return cursor_
}


canvas.on('mouse:wheel',function(opt){
  const delta =opt.e.deltaY;
  handleScale(delta);
  as.textContent = (currentValueZoom * 100).toFixed(0)+'%';
  canvas.zoomToPoint({x:opt.e.offsetX, y: opt.e.offsetY},currentValueZoom);
  opt.e.preventDefault();
  opt.e.stopPropagation();
})

const toolPanel = document.querySelector('.tool-panel');

const handleChangeActiveButton = (newActiveButton) => {
  let button = newActiveButton;
  selectedButton.classList.remove('settings-panel__button_active');
  toolPanel.classList.remove('full-screen');
  if(button){
      selectedButton = button;
      selectedButton.classList.add('settings-panel__button_active');
      toolPanel.classList.add('full-screen');
  }
}     // Смена выбранной кнопки на другую актинвую


const handleDownKeySpace = (event) => {
  if (event.code === 'Space' && !event.repeat && !isDown) {
      event.preventDefault();
      canvas.isDrawingMode = false;
      isCursorMove = true;
      canvas.toggleDragMode();
      handleChangeActiveButton(buttonCursorMove)

  }
}           // Нажатие на пробел
const handleUpKeySpace = (event) => {
  if (event.code === 'Space' && !isDown) {
    isCursorMove = false;
    canvas.selection = true;
    event.preventDefault();
    canvas.toggleDragMode();
    handleChangeActiveButton()

    if(!isCursorMove) {
        document.body.addEventListener('keydown', handleDownKeySpace)
    }
  }
}             // Отпускание пробела


let cursorCoordinateOtherUsers;

const handleMouseMovement = (event) => {
  const cursorCoordinate = canvas.getPointer(event.e);
  let data = {
      userId: socket.id,
      coords: cursorCoordinate,
  }
  socket.emit('cursor-data', data);
}   

/**
 * Ловим курсор когда он вышел за пределы канваса
 * @param {*} ev 
 */
const handleMouseOut = (ev)=>{
  if (ev.e.type=='mouseout'){
    const cursorCoordinate = canvas.getPointer(ev.e);
    let data = {
        userId: socket.id,
        coords: cursorCoordinate,
        cursor:'leave'
    }
    socket.emit('cursor-data', data);
  }
}

let colors = ['#ff0000','#0f71d3','#14ff00'];
let color_index =0;                                            // Курсор
const getCursorData = (data) => {

  let existing_coursor = canvas._objects.find(item=>item.socket_id==data.userId)
  if(!existing_coursor)
  {
    
    cursorUser.socket_id=data.userId;
    cursorUser.item(0).fill=colors[color_index];
    cursorUser.item(1).text = data.username
    color_index++;
    if(!colors[color_index]){
      color_index=0;
    }
    //cursorUser.left = data.cursorCoordinates.x
    canvas.add(cursorUser);
  }else{
    existing_coursor.set({
      top:  data.cursorCoordinates.y,
      left: data.cursorCoordinates.x,
    }); 
    if ( data.cursor!==undefined && data.cursor=='leave' ){
      existing_coursor.set({
        opacity: 0.2
      })
    }else{
      existing_coursor.set({
        opacity: 1
      })
    }
  }
  canvas.renderAll();
}                                                   // Получение координат курсора



function handleScale (delta)
{
    if (delta<0)
    {
        if(currentValueZoom<=MAX_ZOOM_OUT)
        {
            return;
        }
        else
        {
            currentValueZoom = (parseFloat(currentValueZoom)-SCALE_STEP).toFixed(2);

        }
    }
    else
    {
        if(currentValueZoom>=MAX_ZOOM_IN)
        {
            return;
        }
        else
        {
            currentValueZoom = (parseFloat(currentValueZoom)+SCALE_STEP).toFixed(2);

        }
    }
}

//const canvas = new fabric.Canvas(document.getElementById("canvasId"),{ renderOnAddRemove: false });
const as = document.querySelector(".scale__value");
window.canvas = canvas;

let isCursorMove = false;

function get_board_id() {
  const board_id =  document.getElementById("board_id").attributes["board"].value;
  return board_id;
}

let board_id = get_board_id();
let isDown = false;

const buttonCursorMove = document.querySelector('#moving_our_board'); 

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

const menu_logo = document.querySelector(".top-panel__logo");
menu_logo.addEventListener('click', e=> e.currentTarget.classList.toggle('active') );

const menu_grid = document.querySelector(".grid-panel");
menu_grid.addEventListener('click', e=> e.currentTarget.classList.toggle('active') );



//

const socket = io('http://localhost:3000',{transports:['websocket']});

// const socket = io('https://kuzovkin.info',{transports:['websocket']});


// const socket = io();

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
  if (isCursorMove) {
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
          if ( e.e.changedTouches!==undefined && e.e.changedTouches.length==1 ){ 
            let lt_ = e.e.changedTouches[0];
            lastClientX = lt_.clientX;
            lastClientY = lt_.clientY;
          }else{
            lastClientX = e.e.clientX;
            lastClientY = e.e.clientY;
          }
      });
      // When the mouse moves, and we're panning (mouse down), we continue
      this.on("mouse:move", (e) => {
          if (state === STATE_PANNING && e && e.e) {
              let x_,y_;
              if ( e.e.changedTouches!==undefined && e.e.changedTouches.length==1 ){ 
                let lt_ = e.e.changedTouches[0];
                x_ = lt_.clientX;
                y_ = lt_.clientY;
              }else{
                x_ = e.e.clientX;
                y_ = e.e.clientY;
              }

              if (lastClientX) {
                  deltaX = x_ - lastClientX; // смещение по оси X
                                                      // (если вниз передвигаемся, то
                                                      // это значение уменьшается иначе увеличивается)
              }
              if (lastClientY) {
                  deltaY = y_ - lastClientY; // смещение по оси Y
                                                      // (если влево передвигаемся, то
                                                      // это значение увеличивается иначе уменьшается)
              }
              // Update the last X and Y values
              lastClientX=x_;
              lastClientY=y_;
              let delta = new fabric.Point(deltaX, deltaY);
              this.relativePan(delta);
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
      // Restore selection ability on the canvas
      this.selection = true;
  }
};


const freeDrawingButton   = document.querySelector('#free_drawing_button');
freeDrawingButton.onclick = enableFreeDrawing;
const freeEraseingButton   = document.querySelector('#free_erasing_button');
freeEraseingButton.onclick = enableEraser;
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


const circleDrawingButton = document.querySelector('#circle_drawing_empty_button');
circleDrawingButton.addEventListener("click",(e) =>  drawcle("empty"));

const circleDrawingButtonDotted = document.querySelector('#circle_with_stroke_line_button');
circleDrawingButtonDotted.addEventListener("click",(e) =>  drawcle("empty_with_stroke_line"));

const circleDrawingButtonFilled = document.querySelector('#circle_filled');
circleDrawingButtonFilled.addEventListener("click",(e) =>  drawcle("filled"));

const rectangleDrawingButton = document.querySelector('#rectangle_drawing_empty_button');
rectangleDrawingButton.addEventListener("click",(e) =>  drawrec("empty"));

const rectangleDrawingButtonDotted = document.querySelector('#rectangle_with_stroke_line_button');
rectangleDrawingButtonDotted.addEventListener("click",(e) => drawrec("empty_with_stroke_line"));

const rectangleDrawingButtonFilled = document.querySelector('#rectangle_filled');
rectangleDrawingButtonFilled.addEventListener("click",(e) =>  drawrec("filled"));

const lineDrawingButton = document.querySelector('#line_drawing_button');
lineDrawingButton.addEventListener("click",(e) => drawLine('trivial'));

const lineDrawingButtonDOtted = document.querySelector('#line_drawing_button_dotted');
lineDrawingButtonDOtted.addEventListener("click",(e) => drawLine('dotted'));

const waitingOverlayBlock = document.querySelector('#waiting-overlay');
// попап с подтверждением пользователя
const notifyPopup = document.querySelector('#accept_user_notify')

/**
 * Показываем оверлей ожидания
 */
function showWaitingOverlay(){
  waitingOverlay = true;
  waitingOverlayBlock.classList.remove('is-hidden')
}

/**
 * Скрываем оверлей ожидания
 */
function hideWaitingOverlay(){
  waitingOverlay = false;
  waitingOverlayBlock.classList.add('is-hidden')
}

/**
 * Проверяем залогинен ли пользователь
 */
function checkLoggedIn(){
  fetch(serverHostDebug+'/check_user_id/').then( data=>data.json()).then(e=>{
    // если пользователь не залогинен - перенаправляем на страницу логина
    if ( e===undefined || !e || e.user==false || e.user=='False' ){
      window.location.href=serverHostDebug+"/auth?parametr_enter=email";
      return;
    }
    // сохраняем пользователя через сокеты
    socket.emit("user:user_id",{user:e.user, board:board_id, socket_id: socket.id});
    // отправляем запрос на регистрацию на доске
    socket.emit("access:request", {user:e.user, board:board_id});
    // показываем оверлей ожидания
    showWaitingOverlay()
    
  });
}

function checkLoggedInCookie(){
  let user_id = Cookies.get('user_id');

  // если пользователь не залогинен - перенаправляем на страницу логина
  if ( user_id===undefined || !user_id || user_id==false ){
    window.location.href=serverHostDebug+"/auth?parametr_enter=email";
    return;
  }
  // сохраняем пользователя через сокеты
  socket.emit("user:user_id",{user:user_id, board:board_id, socket_id: socket.id});
  // отправляем запрос на регистрацию на доске
  socket.emit("access:request", {user:user_id, board:board_id});
  // показываем оверлей ожидания
  showWaitingOverlay()
}

/**
 * Разрешаю пользователю войти в доску
 * @param {*} e 
 */
function acceptAccess(e){
  let creator_id = Cookies.get('user_id');
  socket.emit("creator:response",{ board_id:e.currentTarget.dataset.board, user_id:e.currentTarget.dataset.user, creator_id: creator_id, role:'student' });
  notifyPopup.classList.add('is-hidden');
}

/**
 * Запрещаем доступ
 * @param {*} e 
 */
function declineAccess(e){
  let creator_id = Cookies.get('user_id');
  socket.emit("creator:decline",{ board_id:e.currentTarget.dataset.board, user_id:e.currentTarget.dataset.user, creator_id:creator_id });
  notifyPopup.classList.add('is-hidden');
  // 
}

socket.on( 'connect', function()
{
    // checkLoggedIn();
    checkLoggedInCookie()
    // получаем ответ на наш запрос - можно на доску заходить или нет?
    socket.on('access:response', function(data){
      if ( data.role!='' && data.role!='waiting' ){
        hideWaitingOverlay()
        socket.emit("board:board_id",board_id);
      }      
    });

    // запрос администратора на одобрение
    socket.on('creator:request', (e)=>{
      // { board_id:e.board, user_id:e.user }
      notifyPopup.classList.remove('is-hidden');
      let userid = "";
      if ( e.username && e.username!='' ){
        userid += String(e.username)
      }
      if ( e.email && e.email!='' ){
        userid += " ("+String(e.email)+")"
      }
      notifyPopup.querySelector('#user_name').textContent=userid
      notifyPopup.querySelector('#button-accept').dataset.user=e.user_id
      notifyPopup.querySelector('#button-accept').dataset.board=e.board_id
      notifyPopup.querySelector('#button-decline').dataset.user=e.user_id
      notifyPopup.querySelector('#button-decline').dataset.board=e.board_id
      notifyPopup.querySelector('#button-accept').addEventListener('click',acceptAccess, { once: true })
      notifyPopup.querySelector('#button-decline').addEventListener('click',declineAccess, { once: true })
    });

    socket.on('mouse:up', function(pointer)
    {
      canvas.remoteDrawingBrush.onMouseUp({e:{}});
    });

    socket.on('mouse:down', function(pointer)
    {
      if ( canvas.remoteDrawingBrush===undefined ){
        canvas.remoteDrawingBrush = new fabric.PencilBrush(canvas)
      }
      if (canvas.remoteDrawingBrush.btype ===undefined || canvas.remoteDrawingBrush.btype!='eraser' ){
        if (pointer.type!==undefined && pointer.type=='eraser'){
          canvas.remoteDrawingBrush = new fabric.EraserBrush(canvas)
          canvas.remoteDrawingBrush.btype = 'eraser'
        }
      }else{
        if (pointer.type!==undefined && pointer.type=='brush'){
          canvas.remoteDrawingBrush = new fabric.PencilBrush(canvas)
          canvas.remoteDrawingBrush.btype = 'brush'
        }
      }
      canvas.remoteDrawingBrush.color = pointer.color;
      canvas.remoteDrawingBrush.width = pointer.width;
      canvas.remoteDrawingBrush.onMouseDown(pointer.pointer,{e:{}});

    });


    socket.on('mouse:move', function(e)
    {
      canvas.remoteDrawingBrush.color = e.color;
      canvas.remoteDrawingBrush.width = e.width;
      canvas.remoteDrawingBrush.onMouseMove(e.pointer,{e:{}});
    });
    socket.on('color:change', function(colour_taken)
    {
        canvas.remoteDrawingBrush.color = colour_taken;
        
    });

    socket.on('width:change', function(width_taken)
    {
        canvas.remoteDrawingBrush.width = width_taken;

    });

let circle ;
    socket.on('circle:edit', function(circle_taken)
    {
      circle.set({
        radius: circle_taken.radius
      });
      canvas.renderAll();
    });
    
    socket.on('circle:add', function(circle_taken)
    {
        circle = new fabric.Circle(circle_taken)
        canvas.add(circle)
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
    });
    socket.on('line:add', function(line_taken)
    {
        line = new fabric.Line(line_taken.points, {
          id: line_taken.id,
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

    /**
     * добавляем произвольный штрих
     * @data {"board_id": board_id, "object": options }
     */
    socket.on("path:created", (data)=>{
      let compare_ = {...data.object.path};
      canvas.isWaitingPath = compare_;
    } );

    socket.on('picture:add', function(img_taken)
    {
      canvas.loadFromJSON(img_taken);
    });

    socket.on('image:add', function(img_taken)    {
      window.insertImageOnBoard(img_taken.src, true, img_taken.id_of);
    });

    socket.on('take_data_from_json_file',function(data)
    {
      if(!data)
      {
        return false;
      }
      else
      {
        let chunks = chunk(data?.canvas,30);
        let chunk_index = 0;
        let init_interval = setInterval(function(){
            let chunk = chunks[chunk_index];
            if(!chunk){
              clearInterval(init_interval)
              return false;
            }
            chunk.forEach((object,id)=>{
              chunk[id]=deserialize(object);
            });
            fabric.util.enlivenObjects(chunk,function(objects)
            {
              objects.forEach(function(object)
              {
                let obj_exists = false;

                canvas._objects.every(function(obj_,indx_){
                    if ( obj_.id==object.id ){
                      obj_exists = true;
                      return false
                    }
                    return true;
                });
                // если такого объекта еще нет на канвасе, то добавляем
                if ( obj_exists===false ){
                  if ( object.type=='image'  ){
                    if ( object.src!==undefined && object.src!='' ){
                      window.insertImageOnBoard(object.src, true, object.id, object);
                    }else{
                      if (object.formula!==undefined && object.formula!=''){
                        window.addFormula(object.formula, object.id, object,false)
                      }
                    }
                  }else{
                    canvas.add(object);
                  }
                }                
              })
              canvas.renderAll();
            });
            chunk_index++;
        },50)


        //canvas.loadFromJSON(data);
      }
    })

    canvas.on('object:modified', e =>    {
      socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
      send_part_of_data(e);
    });


    canvas.on('object:added',e =>
    {
      let object = e.target;
      if ( object.formula!==undefined ){
        return;
      }
      if(!object.id)
      {
        object.set('id',Date.now().toString(36) + Math.random().toString(36).substring(2));
        object.toJSON = (function(toJSON){
          return function(){
            return fabric.util.object.extend(toJSON.call(this),{"id":this.id})
          }
        })(object.toJSON)

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
          const error = 30;
          let bezierCurves = fitCurve(massiv_of_points, error);
          if(!bezierCurves[0]) {
            console.log('bezier error',bezierCurves,massiv_of_points);
          }
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
        if(!object.socket_id)
        {
          socket.emit("object:added", {"board_id": board_id, "object": serialize_object(object)});
        }

        //serialize_canvas(canvas);
      }
      
      //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
   //   

      //send_part_of_data(e);
    });


    canvas.on('object:moving',e =>
    {
      socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
      send_part_of_data(e);
    });


    socket.on('object:moving', e =>
    {
        recive_part_of_data(e);
    });

    socket.on('figure_delete', e =>
    {
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
        canvas.add(new fabric.Object(e));
        canvas.renderAll();
        //canvas.loadFromJSON(e);
    });
    

    canvas.on('object:scaling',e =>
    {
      //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
      socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
      send_part_of_data(e);
    });


    socket.on('object:scaling', e =>
    {
        recive_part_of_data(e);
    });

    canvas.on('object:rotating',e =>
    {
      socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
      //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
      send_part_of_data(e);
    });


    socket.on('object:rotating', e =>
    {
        recive_part_of_data(e);
        //canvas.loadFromJSON(e);
    });

    socket.on('text:added', e => {
      const text = new fabric.IText(e.object.text,e.object);
      canvas.add(text);
      canvas.renderAll();
    });

    /**
     * ловим изменения текста
     */
    socket.on('text:edited', e => {
      let t = canvas._objects.find( item => item.id==e.id )
      if ( t ){
        t.set({...e.object});
        canvas.renderAll();
      }
    });


    socket.on('formula:added', e => {
      window.addFormula( e.formula, e.object.id, e.object, false )
    });

    /**
     * ловим изменения текста
     */
    socket.on('formula:edited', e => {
      editFormula( e.formula, e.object.id )
    });

    socket.on('object:modified', e =>
    {
        recive_part_of_data(e);
    });

    /**
     * Эмитим событие когда закончили рисовать произвольный путь
     * прогблема в том, что на остальных досках во время рисования объект еще не создан, а когда
     * рисование завершено, то объект создается под своим айди на каждой доске. Поэтому редактирование и перемещение
     * на других досках не работает. Надо передать готовый объект и на досках пересвоить айди
     */
    canvas.on("path:created", function(options) {
      if ( canvas.isDrawingMode ){
        socket.emit("path:created", {"board_id": board_id, "object": options });
        return;
      }
      if ( canvas.isWaitingPath!==undefined && canvas.isWaitingPath!=false ){
        if ( compare_path(options.path,canvas.isWaitingPath) ){
          options.path.id = canvas.isWaitingPath.id;
        }
        canvas.isWaitingPath = false
      }
    });
});


function enableFreeDrawing()
{
  let array_of_points = [];
  removeEvents();
  canvas.freeDrawingBrush       = new fabric.PencilBrush(canvas);
  canvas.remoteDrawingBrush     = new fabric.PencilBrush(canvas);
  canvas.isDrawingMode          = true;
  canvas.freeDrawingBrush.btype = "brush"
  canvas.freeDrawingBrush.color = drawingColorEl.value;
  canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);

  let isDrawing = false

  canvas.on('mouse:down', e => {
    isDrawing = true;
    const pointer = canvas.getPointer(e);
    socket.emit('mouse:down', {pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'brush'});
  })
  canvas.on('mouse:up', e => {
    isDrawing = false;
    const pointer = canvas.getPointer(e);
    //socket.emit('canvas_save_to_json',canvas.toJSON(['id']));
    // let board_id = get_board_id();
    socket.emit('mouse:up',{pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'brush'});
    //array_of_points = [];
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
    //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});

  })
  canvas.on('mouse:move', function (e) {
    if (isDrawing) 
    {
      const pointer = canvas.getPointer(e);
      socket.emit('mouse:move',{pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'brush'});//canvas.freeDrawingBrush._points); 
    }
  })
}

/**
 * Выбираем ластик
 */
function enableEraser(){
  removeEvents();
  canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
  canvas.isDrawingMode = true;
  canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);

  let isDrawing = false

  canvas.on('mouse:down', e => {
    isDrawing = true;
    const pointer = canvas.getPointer(e);
    socket.emit('mouse:down', {pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'eraser'});
  })
  canvas.on('mouse:up', e => {
    isDrawing = false;
    const pointer = canvas.getPointer(e);
    socket.emit('mouse:up',{pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'eraser'});
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
  })
  canvas.on('mouse:move', (e)=> {
    if (isDrawing)     {
      const pointer = canvas.getPointer(e);
      socket.emit('mouse:move',{pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'eraser'});//canvas.freeDrawingBrush._points); 
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
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
    //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
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
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
    //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
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
}

function change_colour_of_brush(colour_taken) {
  canvas.freeDrawingBrush.color = colour_taken;
  localStorage.setItem("color",colour_taken);
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
}

function editing_passing_rectangle(rect_taken) {
  rect = new fabric.Rect(rect_taken);
  canvas.add(rect);
  //'canvas.freeDrawingBrush.width = width_taken'
}

function adding_line_to_partner_board(line_taken) {
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
}

function width_of_line_passed_taken(width_taken) {
  canvas.freeDrawingBrush.width = width_taken;
}

function circle_passed_to_board(circle_taken) {
  circle.set({
    radius: circle_taken.radius,
  });
  canvas.renderAll();
}

function adding_circle_on_the_board(circle_taken) {
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

let localStorageColour = localStorage.getItem('color');
let localStorageWidth  = localStorage.getItem('width');

if (localStorageColour)
{
  canvas.freeDrawingBrush.color = localStorageColour;
  drawingColorEl.value = localStorageColour;
}

if (localStorageWidth)
{
  canvas.freeDrawingBrush.width = localStorageWidth;
  drawingLineWidthEl.value = localStorageWidth;
}

drawingColorEl.oninput = function() 
{
  canvas.freeDrawingBrush.color = drawingColorEl.value;
  localStorage.setItem('color',drawingColorEl.value)
  socket.emit("color:change",drawingColorEl.value);
  
};

drawingLineWidthEl.oninput = function() 
{
  canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);
  socket.emit("width:change", canvas.freeDrawingBrush.width);
  localStorage.setItem('width',canvas.freeDrawingBrush.width)
};


function drawLine(type_of_line) {
  canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);
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
      id: line.id,
      points: points,
      fill:line.fill,
      width: line.strokeWidth,
      strokeDashArray: [stroke_line, stroke_line],
      stroke: line.stroke});
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
  });

  canvas.on("mouse:up", function (o) {
    isDown = false;
    line.setCoords();
    //socket.emit("canvas_save_to_json", canvas.toJSON(['id']));
    // let board_id = get_board_id();
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
    //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
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
  canvas.on("mouse:move", (event) => handleMouseMovement(event))

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
  socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
  //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
  socket.emit("text:add", canvas.toJSON(['id']));
}

function find_object_index(target_object) {
  let target_index; 
  let objects = canvas.getObjects();
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

  return target_index;
}

function send_part_of_data(e) {
  if (e.target._objects) {
    let data = { objects: [] };
    let json_canvas = canvas.toJSON(['id']);
    if(e.transform.target.type=='group')
    {
        let object_index = find_object_index(e.transform.target);
        e.transform.target.object_index = find_object_index(e.transform.target);
        data.objects.push({
          id: e.transform.target.id,
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
          id:object.id,
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
  } else {
    let object_index = find_object_index(e.target);

    e.target.object_index = object_index;
    socket.emit("object:modified", {
      //object: e.target,
      id: canvas._objects[object_index].id,
      object: canvas._objects[object_index],
      index: object_index,
    });
  }
}


function recive_part_of_data(e) {
  if (e.objects) {
    for (const object of e.objects) {
      //let d = canvas.item(object.index);
      let d = canvas._objects.find(item=>item.id==object.id);
      if(!d){
        continue;
      }
      d.set({
        top: object.top_all, //+object.object.top,
        left: object.left_all, //+object.object.left
        angle: object.angle,
        scaleX: object.scaleX,
        scaleY: object.scaleY,
      });
    }
  } else {
    //let d = canvas.item(e.index);
    let d = canvas._objects.find(item=>item.id==e.id);
    //d.set(e.object);
    if(!d){
      return false
    }
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
  isCursorMove = !isCursorMove;
  canvas.toggleDragMode();
  buttonCursorMove.classList.toggle('settings-panel__button-cursor-move_active');
  canvas.isDrawingMode = false
  canvas.allowTouchScrolling = true;
} 
buttonCursorMove.addEventListener('click', handleButtonCursorMoveClick);

document.addEventListener('DOMContentLoaded',(e)=>{
  buttonCursorMove.click()
});


const toolPanelList = document.querySelector('.tool-panel__list');

let selectedButton = freeDrawingButton;

let getSiblings = function (e) {
  // for collecting siblings
  let siblings = []; 
  // if no parent, return no sibling
  if(!e.parentNode) {
      return siblings;
  }
  // first child of the parent node
  let sibling  = e.parentNode.firstChild;
  // collecting siblings
  while (sibling) {
      if (sibling.nodeType === 1 && sibling !== e) {
          siblings.push(sibling);
      }
      sibling = sibling.nextSibling;
  }
  return siblings;
};



toolPanelList.addEventListener('click', selectTool)


canvas.on('mouse:out', handleMouseOut);         // Отображение чужих курсоров
canvas.on('mouse:move', handleMouseMovement);         // Отображение чужих курсоров
socket.on('cursor-data', getCursorData);              // отображаем курсоры чужих пользователей


socket.on('coursour_disconected', function(user_id){
  let index_of_existing_coursor = canvas._objects.findIndex(item=>item.socket_id==user_id);
  if (index_of_existing_coursor!==-1){
    (canvas._objects).splice(index_of_existing_coursor,1);
    canvas.renderAll();
  }
}

);



const inputChangeColor = document.querySelector('.sub-tool-panel__item-list-color-selection > input');
const subToolPanel = inputChangeColor.closest('.sub-tool-panel__change-color');
const fontColorListWrapper2 = document.querySelector('.setting-item__font-color-list-wrapper');
const fontColorInput2 = document.querySelector('.setting-item__input-font-color > input');


const handleClickOpenInputChangeColor = () => {
  subToolPanel.classList.add('sub-tool-panel_visible');
}
const handleClickCloseInputChangeColor = (event) => {
  if (event.target !== inputChangeColor) {
    subToolPanel.classList.remove('sub-tool-panel_visible');
  } else if(event.target !== fontColorInput2) {
    fontColorListWrapper2.classList.remove('active');
  } else {

  }
}

window.addEventListener('click', handleClickCloseInputChangeColor);
inputChangeColor.addEventListener('click', handleClickOpenInputChangeColor);

fontColorInput2.addEventListener('click', () => { fontColorListWrapper2.classList.add('active') })

fontColorInput2.addEventListener('change', (e) => { canvas.getActiveObject().set("fill", e.target.value) })




const buttonIncreaseScale = document.querySelector(".scale__button-increase-scale");
const buttonDecreaseScale = document.querySelector(".scale__button-decrease-scale");

buttonIncreaseScale.addEventListener("click", (event) => {
  event.preventDefault();
  if((parseFloat(currentValueZoom) + SCALE_STEP*2).toFixed(2) > MAX_ZOOM_IN){
    return;
  } else {
    currentValueZoom = (parseFloat(currentValueZoom) + SCALE_STEP*2).toFixed(2);
  }

  const center = canvas.getCenter();
  const centerPoint = new fabric.Point(center.left, center.top);
  canvas.zoomToPoint(centerPoint, currentValueZoom);
  as.textContent = (currentValueZoom * 100).toFixed(0) + '%';

})

buttonDecreaseScale.addEventListener("click", (event) => {
  event.preventDefault();
  if((parseFloat(currentValueZoom) - SCALE_STEP*2).toFixed(2) < MAX_ZOOM_OUT){
    return;
  } else {
    currentValueZoom = (parseFloat(currentValueZoom) - SCALE_STEP*2).toFixed(2);
  }

  const center = canvas.getCenter();
  const centerPoint = new fabric.Point(center.left, center.top);
  canvas.zoomToPoint(centerPoint, currentValueZoom);
  as.textContent = (currentValueZoom * 100).toFixed(0) + '%';
})


/**
 * Сравнение объектов
 * https://stackoverflow.com/questions/1068834/object-comparison-in-javascript
 * @param {*} x 
 * @param {*} y 
 * @returns 
 */
function object_equals( x, y ) {
  if ( x === y ) return true;
    // if both x and y are null or undefined and exactly the same

  if ( ! ( x instanceof Object ) || ! ( y instanceof Object ) ) return false;
    // if they are not strictly equal, they both need to be Objects

  if ( x.constructor !== y.constructor ) return false;
    // they must have the exact same prototype chain, the closest we can do is
    // test there constructor.

  for ( var p in x ) {
    if ( ! x.hasOwnProperty( p ) ) continue;
      // other properties were tested using x.constructor === y.constructor

    if ( ! y.hasOwnProperty( p ) ) return false;
      // allows to compare x[ p ] and y[ p ] when set to undefined

    if ( x[ p ] === y[ p ] ) continue;
      // if they have the same strict value or identity then they are equal

    if ( typeof( x[ p ] ) !== "object" ) return false;
      // Numbers, Strings, Functions, Booleans must be strictly equal

    if ( ! object_equals( x[ p ],  y[ p ] ) ) return false;
      // Objects and Arrays must be tested recursively
  }

  for ( p in y )
    if ( y.hasOwnProperty( p ) && ! x.hasOwnProperty( p ) )
      return false;
        // allows x[ p ] to be set to undefined

  return true;
}

/**
 * Назодим тот-же путь
 * @param {*} f 
 * @param {*} s 
 */
function compare_path(f,s){
  if ( f.type!='path' || s.type!=f.type )
    return false
  if ( f.path.length!=s.path.length )
    return false
  if ( !object_equals(f.path,s.path) )
    return false
  return true
}