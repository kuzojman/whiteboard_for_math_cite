const canvas = new fabric.Canvas(document.getElementById("canvasId"),{

  allowTouchScrolling: true,
  preserveObjectStacking: true,
});


const socket = io('http://localhost:3000',{transports:['websocket']});

// const socket = io('http://192.168.1.46:3000',{transports:['websocket']});

// const socket = io('https://kuzovkin.info',{transports:['websocket']});

// const socket = io();


const board_id = get_board_id() || 1;

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

// Передача обновлённого состояния canvas'а на сервер через webworker
// В случае добавления или удаления элементов передаётся разница между
// предыдущим и текущим состоянием canvas._objects

let last_canvas_object = 0;
let max_items_to_add = 5;
let clear_sent = false;
let canvas_sent = false;

let send_part_events = []
let recive_part_events = []

// Строка в массив байт по 2 байта на символ
// Первыми двумя записываем board_id

async function str2ab(str) {
    let buf = new ArrayBuffer(str.length*2);
    let buf_view = new Uint16Array(buf);

    for (let i = 0, str_len = str.length; i < str_len; i++) {
        if (i === 0) buf_view[i] = board_id.toString().charCodeAt(0);
        else buf_view[i] = str.charCodeAt(i);
    }

    return buf;
}

const JSONStringifyAsync = (data, replacer = null, space = null) => {
    return new Promise((resolve, reject) => {
        try {
            let output = JSON.stringify(data, replacer, space);
            resolve(output);
        } catch (error) {
            reject(error);
        }
    });
};

const JSONParseAsync = (data, reviver = null) => {
    return new Promise((resolve, reject) => {
        try {
            let output = JSON.parse(data, reviver);
            resolve(output);
        } catch (error) {
            reject(error);
        }
    });
};

// Вызов webworker

async function callWorker(worker) {
    try {
        let len = canvas._objects.length;

        if (!canvas_sent) {
            worker.postMessage({act: "init", canvas: await JSONStringifyAsync(canvas.toJSON())});
            canvas_sent = true;
        } else {
            // Если добавлены элементы
            if (last_canvas_object <= len) {
                let start = (last_canvas_object === 0) ? 0 : last_canvas_object
                let items_to_add = len - last_canvas_object

                if (items_to_add >= max_items_to_add) {
                    items_to_add = max_items_to_add
                }

                let end = start + items_to_add

                //console.log("Current len: " + canvas._objects.length)
                //console.log("Last added: " + last_canvas_object)
                //console.log("Items to add: " + items_to_add)
                //console.log("End: " + end)

                if (end <= len && items_to_add !== 0) {
                    let _data = await JSONStringifyAsync(canvas._objects.slice(start, end));
                    let buf = await str2ab("[" + _data + "]")
                    last_canvas_object = end;
                    //console.log(start, end)
                    worker.postMessage(buf, [buf]);
                }
            }

            // Изменение объектов
            if (send_part_events.length >= 0) {
                let interval = setInterval(() => {
                    let e = send_part_events.shift();
                    if (e && e.target && e.target._objects) {
                        let data = {objects: []};
                        if (e && e.transform && e.transform.target && e.transform.target.type == 'group') {
                            let object_index = find_object_index(e.transform.target);
                            e.transform.target.object_index = find_object_index(e.transform.target);
                            data.objects.push({
                                id: e.transform.target.id,
                                index: object_index,
                                object: e.transform.target,
                                top_all: canvas._objects[object_index].top,
                                left_all: canvas._objects[object_index].left,
                                angle: canvas._objects[object_index].angle,
                                scaleX: canvas._objects[object_index].scaleX,
                                scaleY: canvas._objects[object_index].scaleY,
                            })
                        } else {
                            e.transform.target._objects.forEach((object) => {
                                let object_index = find_object_index(object);
                                object.object_index = object_index;
                                data.objects.push({
                                    id: object.id,
                                    object: object,
                                    index: object_index,
                                    top_all: canvas._objects[object_index].top,
                                    left_all: canvas._objects[object_index].left,
                                    angle: canvas._objects[object_index].angle,
                                    scaleX: canvas._objects[object_index].scaleX,
                                    scaleY: canvas._objects[object_index].scaleY,
                                });
                            });
                        }
                        setTimeout(() => {
                            socket.emit("object:modified", data);
                        }, 100);
                    } else if (e && e.target) {
                        let object_index = find_object_index(e.target);

                        e.target.object_index = object_index;
                        setTimeout(() => {
                            socket.emit("object:modified", {
                                //object: e.target,
                                id: canvas._objects[object_index].id,
                                object: canvas._objects[object_index],
                                index: object_index,
                            });
                        }, 100);
                    }
                }, 100);
                if (send_part_events.length === 0) clearInterval(interval)
            }

            if (recive_part_events.length >= 0) {
                let interval = setInterval(async () => {
                    let e = recive_part_events.shift();
                    if (e && e.objects) {
                        for (const object of e.objects) {
                            //let d = canvas.item(object.index);
                            let d = canvas._objects.find(item => item.id == object.id);
                            if (!d) {
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
                        let buf = await str2ab("[" + "update_many" + e.objects + "]");
                        worker.postMessage(buf, [buf]);
                    } else if (e && e.object) {
                        //let d = canvas.item(e.index);
                        let d = canvas._objects.find(item => item.id == e.id);
                        //d.set(e.object);
                        if (!d) {
                            return false
                        }
                        d.set({
                            top: e.object.top, //+object.object.top,
                            left: e.object.left, //+object.object.left
                            angle: e.object.angle,
                            scaleX: e.object.scaleX,
                            scaleY: e.object.scaleY,
                        });
                        worker.postMessage({act: "update_one", id: e.id.toString(), el: d});
                    }
                }, 200);
                if (recive_part_events.length === 0) clearInterval(interval);
            }

            // Если доска очищена
            if (len === 0 && !clear_sent) {
                worker.postMessage({act: "clear"});
                clear_sent = true;
            }
        }

        worker.onmessage = e => {
            console.log(e)
            worker.terminate()
        }

        worker.onerror = e => {
          console.error(e)
        }
    } catch (e) {
        console.log(e)
    }
}

// window.onload = async () => {
//     const worker = new Worker('./workers/save_board_job.js', /*{ type: "module" }*/);
//     setInterval(async () => {
//         await callWorker(worker);
//     }, 500)
//     window.onunload = () => {worker.terminate()}
// }

// для продакшна надо оставить пустым
let serverHostDebug = "http://localhost:5000/" //"https://kuzovkin.info"  //
// есть ли доступ к доске? и в качестве какой роли
let accessBoard = false;
// ожидаем ли мы одобрения от учителя?
let waitingOverlay = false;


const canvasbg = new fabric.Canvas(document.getElementById("canvasId_bg"),{
  preserveObjectStacking: true,
  containerClass: 'absolute-container'
});

let selectionTimer = null;

let selectedTool = "";

let panningGesture = false;

/**
 * Очистка доски
 * @broadcast - оповещаем ли всех, о том что надо очищать доску
 */
function clearBoard(broadcast=true){
  // выпускаем сигнал на удаление
  if ( broadcast ){
    socket.emit("canvas:clear",board_id);
  }

  canvas.renderOnAddRemove = false;
  var canvasObjects = canvas.getObjects();
  for (let i = 0; i < canvasObjects.length; i++) {
    const element = canvasObjects[i];
    // удаляем все объекты кроме курсоров
    if ( !element.socket_id ){
      canvas.remove(element);
    }
  }

  canvas.renderOnAddRemove = true;
  canvas.renderAll();
  clear_sent = 0;

  if ( broadcast ){
   socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
  }
}

/**
 * Перенаправление в личный кабинет
 */
function goUserBoard(){
  window.location.href="/my_private_office?parametr_enter=my_board"
}

/**
 * Центрируем объект по центру экрана
 * @param {*} obj 
 */
function setObjectToCanvasCenter(obj){
  if (obj){
    let w2 = obj.width/2
    let h2 = obj.height/2
    obj.set({
      top: canvas.vptCoords.tl.y+(canvas.vptCoords.br.y - canvas.vptCoords.tl.y)/2-h2,
      left: canvas.vptCoords.tl.x+(canvas.vptCoords.br.x - canvas.vptCoords.tl.x)/2-w2,
    });
  }
}

/**
 *  Устанавливаем курсор по выбранному инструменты
 * @param {*} curname название инструмента и файла с курсором
 */
function setCursor(curname){
  canvas.hoverCursor = 'url("./icons/'+curname+'.cur"), auto';
  canvas.defaultCursor = 'url("./icons/'+curname+'.cur"), auto';
  canvas.freeDrawingCursor = 'url("./icons/'+curname+'.cur"), auto';
}

/**
 * Нажатие на кнопку выбора инструмента
 */
function selectTool(event){
    let currentButton = event.target.closest('.tool-panel__item-button');
    let notCurrentButton = event.target.closest('.sub-tool-panel__item-button');
    if ( notCurrentButton ){
      currentButton = notCurrentButton;
    }
    if( currentButton) {

      let currentAction = currentButton.dataset.tool;

      if ( currentAction ){
        if (currentAction==selectedTool){
          selectedTool=""
        }else{
          selectedTool=currentAction
        }
      }
      // console.log(selectedTool);
      // если выбрано лезвие, то меняем курсор
      if ( selectedTool=='blade' || selectedTool=='freedraw' ){
        setCursor(selectedTool);
      }else{
        canvas.hoverCursor = 'auto';
        canvas.freeDrawingCursor = 'auto';
        canvas.defaultCursor = 'move';
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
        if ( !selectedButton.classList.contains('js-modal-trigger') && !selectedButton.classList.contains("disable") ){
          selectedButton.classList.toggle('settings-panel__button_active');
        }
    } else {
        if(currentButton) {
          if ( !currentButton.classList.contains('js-modal-trigger') && !currentButton.classList.contains("disable")  ){
            currentButton.classList.toggle('settings-panel__button_active');
          }
        }
        if(selectedButton ) {
            selectedButton.classList.remove('settings-panel__button_active');
        }
        selectedButton = currentButton;
    }

}

canvas.on('touch:gesture',function(e){
  isGestureEvent = true;
  // console.log(selectedTool);
  // console.log(e.self.touches, e.self.scale, currentValueZoom);
  if ( e.self.touches!==undefined && e.self.touches.length==2 && selectedTool=='moving' ){
    // this.selection = false;
    var lPinchScale = e.self.scale;  
    // var scaleDiff = (lPinchScale -1)/10 + 1;  // Slow down zoom speed    
    const delta = e.self.scale-currentValueZoom;
    // alert(JSON.stringify(e.self));
    // console.log('delta',delta);
    handleScale(delta);
    as.textContent = (currentValueZoom * 100).toFixed(0)+'%';
    canvas.zoomToPoint({x:e.self.x, y: e.self.y},currentValueZoom);
    canvasbg.zoomToPoint({x:e.self.x, y: e.self.y},currentValueZoom);
    // console.log({x:e.self.x, y: e.self.y},currentValueZoom);
    // clearTimeout(selectionTimer)
    // console.log(state);
    if ( !panningGesture ){
      // canvas.toggleDragMode(true)
      panningGesture = true
    }
    
    // selectionTimer = setTimeout( ()=>canvas.toggleDragMode(true) , 500);
    clearTimeout(selectionTimer)
    selectionTimer = setTimeout( ()=>panningGesture = false , 50);
    this.selection = false;
  }
  
});

const MAX_ZOOM_IN  = 4;
const MAX_ZOOM_OUT = 0.05;
const SCALE_STEP = 0.05;

let currentValueZoom = 1;

let currentRadiusCursor = 10;
// когда получили первые данные
let takedFirstData = false;
let allReceivedObjects = false;
const cursorUser = createCursor()

function decreaseRecievedObjects(){
  if ( allReceivedObjects<=0 ){
    takedFirstData=true;
    return
  }
  allReceivedObjects-=1;
}

function createCursor(){
  let curs_ =  new fabric.Circle({              // Представление курсора
    radius: currentRadiusCursor,
    fill: 'red',
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
    erasable:false,
    selectable:false,
    objectCaching: false
  });
  let text_ = new fabric.Text("Username", {
    fontFamily: 'Calibri',
    fontSize: 14,
    textAlign: 'left',
    originX: 'center',
    originY: 'center',
    erasable:false,
    selectable:false,
    left: currentRadiusCursor*2,
    top: currentRadiusCursor*2,
    objectCaching: false  });
  let cursor_ = new fabric.Group([curs_,text_],{
    left: -10,
    top: -10,
    erasable:false,
    selectable:false,
    cursor:true,
  })
  return cursor_
}


canvas.on('mouse:wheel',function(opt){
  const delta =opt.e.deltaY;
  handleScale(delta);
  as.textContent = (currentValueZoom * 100).toFixed(0)+'%';
  canvas.zoomToPoint({x:opt.e.offsetX, y: opt.e.offsetY},currentValueZoom);
  canvasbg.zoomToPoint({x:opt.e.offsetX, y: opt.e.offsetY},currentValueZoom);
  opt.e.preventDefault();
  opt.e.stopPropagation();
})

const toolPanel = document.querySelector('.tool-panel');

const handleChangeActiveButton = (newActiveButton) => {
  let button = newActiveButton;
  if ( !selectedButton.classList.contains("disable") ){
    selectedButton.classList.remove('settings-panel__button_active');
  }
  toolPanel.classList.remove('full-screen');
  if(button){
      selectedButton = button;
      if ( !selectedButton.classList.contains("disable") ){
        selectedButton.classList.add('settings-panel__button_active');
      }
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
    let w = canvas.getWidth()
    let h = canvas.getHeight()    
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
let moveCursorsToFront = false;
const getCursorData = (data) => {

  let existing_coursor = canvas._objects.find(item=>item.socket_id==data.userId)
  if(!existing_coursor)
  {
    cursorUser.socket_id=data.userId;
    cursorUser.item(0).fill = colors[color_index];
    cursorUser.item(1).text = data.username || "unknown"
    color_index++;
    if(!colors[color_index]){
      color_index=0;
    }
    //cursorUser.left = data.cursorCoordinates.x
       //canvas.sendToBack(cursorUser);

    canvas.add(cursorUser);

    existing_coursor = cursorUser;
    
  }else{
    
    // console.log(h,w,data.cursorCoordinates);
    if ( data.cursorCoordinates.x< canvas.vptCoords.tl.x || data.cursorCoordinates.x>canvas.vptCoords.tr.x-20 || data.cursorCoordinates.y< canvas.vptCoords.tl.y || data.cursorCoordinates.y>canvas.vptCoords.br.y-20 ){
      data.cursor='leave'
      if ( data.cursorCoordinates.x<canvas.vptCoords.tl.x  )
        data.cursorCoordinates.x = canvas.vptCoords.tl.x
      if ( data.cursorCoordinates.x>canvas.vptCoords.tr.x-20  )
        data.cursorCoordinates.x = canvas.vptCoords.tr.x-20
      if ( data.cursorCoordinates.y<canvas.vptCoords.tl.y  )
        data.cursorCoordinates.y = canvas.vptCoords.tl.y
      if ( data.cursorCoordinates.y>canvas.vptCoords.br.y-20  )
        data.cursorCoordinates.y = canvas.vptCoords.br.y-20
    }
      
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
  // помещаем курсор поверх всех элементов
  if ( moveCursorsToFront && existing_coursor){
    canvas.bringToFront(existing_coursor)
    moveCursorsToFront = false;
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
  return document.getElementById("board_id").attributes["board"].value;
}

let isDown = false;

const buttonCursorMove = document.querySelector('#moving_our_board'); 

const menu_logo = document.querySelector(".top-panel__logo");
menu_logo.addEventListener('click', e=> e.currentTarget.classList.toggle('active') );

const menu_grid = document.querySelector(".grid-panel");
menu_grid.addEventListener('click', e=> e.currentTarget.classList.toggle('active') );


function chunk (arr, len) {

  var chunks = [],
      i = 0,
      n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }

  return chunks;
}


var elt = document.getElementById('desmos_block');
var calculator = Desmos.GraphingCalculator(elt);
calculator.setExpression({ id: 'graph1', latex: 'y=x^2' });


const pathUsualGrid = "./images/grids/usual-grid.svg";
const pathTriangularGrid = "./images/grids/triangular-grid.svg";

/**
 * Переопределение функции переключения режимов навигация/редактирование объектов
 * @param {Bool} state_ если задано true то перемещение поля, если false то перемещение объектов
 */
fabric.Canvas.prototype.toggleDragMode = function (state_=false) {
  // console.log('toggle');
  
  // Remember the previous X and Y coordinates for delta calculations
  if ( this.lastClientX === undefined) {
    this.lastClientX = 0
  }
  if ( this.lastClientY === undefined) {
    this.lastClientY = 0
  }
  // let lastClientY;
  // Keep track of the state

  let deltaX;
  let deltaY;
  const STATE_IDLE = "idle";
  const STATE_PANNING = "panning";
  let state = STATE_IDLE;
  
  // We're entering dragmode
  if (  state_ ) {
      this.off('mouse:move');
      // Discard any active object
      this.discardActiveObject();
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
          // console.log("mouse:up 1");
      });
      // // When MouseDown fires, we set the state to panning
      this.on("mouse:down", (e) => {
          state = STATE_PANNING;
          if ( e.e.changedTouches!==undefined && e.e.changedTouches.length==1 ){ 
            let lt_ = e.e.changedTouches[0];
            this.lastClientX = lt_.clientX;
            this.lastClientY = lt_.clientY;
          }else{
            this.lastClientX = e.e.clientX;
            this.lastClientY = e.e.clientY;
          }
          // console.log("mouse:down 1");
      });
      // When the mouse moves, and we're panning (mouse down), we continue
      this.on("mouse:move", (e) => {
          if (state === STATE_PANNING && e && e.e) {
              let x_,y_;
              if ( e.e.changedTouches!==undefined && e.e.changedTouches.length>0 ){ 
                // if (e.e.changedTouches.length){
                  let lt_ = e.e.changedTouches[0];
                  x_ = lt_.clientX;
                  y_ = lt_.clientY;
                // }else{
                //   x_ = (e.e.changedTouches[0].clientX+e.e.changedTouches[1].clientX)/2;
                //   y_ = (e.e.changedTouches[0].clientY+e.e.changedTouches[1].clientY)/2;
                // }
              }else{
                x_ = e.e.clientX;
                y_ = e.e.clientY;
              }
              if (this.lastClientX) {
                  deltaX = x_ - this.lastClientX; // смещение по оси X
                                                      // (если вниз передвигаемся, то
                                                      // это значение уменьшается иначе увеличивается)
              }
              if (this.lastClientY) {
                  deltaY = y_ - this.lastClientY; // смещение по оси Y
                                                      // (если влево передвигаемся, то
                                                      // это значение увеличивается иначе уменьшается)
              }
              // Update the last X and Y values
              this.lastClientX=x_;
              this.lastClientY=y_;
              let delta = new fabric.Point(deltaX, deltaY);
              this.relativePan(delta);
              canvasbg.relativePan(delta);
          }
          handleMouseMovement(e)
          // console.log("mouse:move 1");
      });
      // this.on("mouse:move", (event) => handleMouseMovement(event))
  } else {
      // When we exit dragmode, we restore the previous values on all objects
      this.forEachObject(function (object) {
          object.evented = object.prevEvented !== undefined ? object.prevEvented : object.evented;
          object.selectable = object.prevSelectable !== undefined ? object.prevSelectable : object.selectable;
      });
      // Reset the cursor
      this.defaultCursor = "default";
      // Remove the event listeners
      // console.log("off all");
      this.off("mouse:up");
      this.off("mouse:down");
      this.off("mouse:move");
      this.on("mouse:move", (event) => handleMouseMovement(event))
      // Restore selection ability on the canvas
      this.selection = true;
  }
};


const freeDrawingButton          = document.querySelector('#free_drawing_button');
      freeDrawingButton.onclick  = enableFreeDrawing;
const freeEraseingButton         = document.querySelector('#free_erasing_button');
      freeEraseingButton.onclick = enableEraser;
const selectionButton            = document.querySelector('#selection_button');
      selectionButton.onclick    = enableSelection;
const BladeButton                = document.querySelector('#blade_button');
      BladeButton.onclick        = bladeButtonClick;
const LassoButton                = document.querySelector('#lasso_button');
      LassoButton.onclick        = lassoButtonClick;


const downloadImage = () =>  {
   const ext = "png";
  //  canvas._objects.forEach( (obj, index)=>{
  //   if ( obj.src!==undefined ){
  //     // obj._element.currentSrc = "/download/"+encodeURIComponent(obj.src)
  //     // obj._element.src = "/download/"+encodeURIComponent(obj.src)
  //     // obj._element.crossOrigin = 'anonymous'
  //     // obj.src = "/download/"+encodeURIComponent(obj.src)
  //   }
  //  } )
  //  canvas._objects.forEach( (obj, index)=>{
  //   console.log(index, obj._element);
  //   if ( obj.src!==undefined ){
  //     console.log(obj._element.currentSrc);
  //   }
  //  })
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

const lineDrawingButtonArrow = document.querySelector('#line_drawing_button_arrow');
lineDrawingButtonArrow.addEventListener("click",(e) => drawLine('arrow'));

const lineDrawingButtonArrowTwo = document.querySelector('#line_drawing_button_arrowtwo');
lineDrawingButtonArrowTwo.addEventListener("click",(e) => drawLine('arrowtwo'));

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

/**
 * задаем параметры объекта fabricjs
 * @param {*} obj_ объект fabricjs
 * @returns object of fabricjs
 */
function object_set_id(obj_){
  let object = obj_
  object.set('id',Date.now().toString(36) + Math.random().toString(36).substring(2));
  object.toJSON = (function(toJSON){
    return function(){
      return fabric.util.object.extend(toJSON.call(this),{"id":this.id})
    }
  })(object.toJSON)
  return object
}

/**
 * корректируем путь объекта из точек
 * @param {*} obj_ объект fabricjs
 */
function object_fit_apth(obj_){
  let object = obj_;

  if(object.path) {
    let massiv_of_points = object.path.map(function(item) {
      if(item[0]=='M'||item[0]=='L')  {
        return [item[1],item[2]];
      } else{
        return [item[1],item[2]];
      }            
    })
    const error = 30;
    let bezierCurves = fitCurve(massiv_of_points, error);
    if( bezierCurves===undefined || bezierCurves[0]===undefined || !bezierCurves[0]) {
      console.log('bezier error',bezierCurves,massiv_of_points);
    }
    let bezierProcessedPath = [
      ['M',...bezierCurves[0][0]]
    ];

    for (let i = 0; i < bezierCurves.length; i++) {
        bezierProcessedPath.push(['C',...bezierCurves[i][1],...bezierCurves[i][2],...bezierCurves[i][3]]);
    }

    object.path = bezierProcessedPath.map(function(item){
      if(item.length==3){
        return [item[0],Math.round(item[1]),Math.round(item[2])];
      }
      if (item.length==7) {
        return [item[0],Math.round(item[1]),Math.round(item[2]),Math.round(item[3]),Math.round(item[4]),Math.round(item[5]),Math.round(item[6])];
      }
    });

    
    objectAddInteractive(object);

  }
  return object;
}

/**
 *
 * Событие подключения к сокету
 *
 */
socket.on( 'connect', function()
{
  canvasbg.isDrawingMode = false;

  // checkLoggedIn();
  checkLoggedInCookie()
  // получаем ответ на наш запрос - можно на доску заходить или нет?
  socket.on('access:response', function(data){
    if ( data.role!='' && data.role!='waiting' ){
      hideWaitingOverlay()
      socket.emit("board:board_id",board_id);
    }      
  });

  // очищаем доску по сигналу
  socket.on("canvas:clear", (e)=>clearBoard(false) );

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

  socket.on('mouse:up', function(pointer) {
    if ( canvasbg.freeDrawingBrush!==undefined ){
      canvasbg.freeDrawingBrush.onMouseUp({e:{}});

    }
    canvasbg.isDrawingMode = false
  });

  socket.on('mouse:down', function(pointer)    {
    canvasbg.isDrawingMode = true
    if ( canvasbg.freeDrawingBrush===undefined ){
      canvasbg.freeDrawingBrush = new fabric.PencilBrush(canvasbg)
    }
    // canvasbg.freeDrawingBrush.width = pointer.width;
    // canvasbg.freeDrawingBrush.color = pointer.color;
    if (canvasbg.freeDrawingBrush.btype ===undefined || canvasbg.freeDrawingBrush.btype!='eraser' ){
      if (pointer.type!==undefined && pointer.type=='eraser'){
        canvas.isDrawingMode = true
        canvas.freeDrawingBrush = new fabric.EraserBrush(canvas)
        canvas.freeDrawingBrush.btype = 'eraser'
      }
    }else{
      if (pointer.type!==undefined && pointer.type=='brush'){
        canvasbg.freeDrawingBrush = new fabric.PencilBrush(canvasbg)
        canvasbg.freeDrawingBrush.btype = 'brush'
      }
    }

    if (pointer.type!==undefined && pointer.type=='brush'){
      canvasbg.freeDrawingBrush = new fabric.PencilBrush(canvasbg)
      canvasbg.freeDrawingBrush.btype = 'brush';
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
      canvas.freeDrawingBrush.btype = 'brush'
      canvasbg.freeDrawingBrush.color = pointer.color;
      canvasbg.freeDrawingBrush.width = pointer.width;
    }
    if (pointer.type!==undefined && pointer.type=='lasso'){
      canvasbg.freeDrawingBrush = new fabric.LassoBrush(canvasbg);
      canvasbg.freeDrawingBrush.color = pointer.color;
      canvasbg.freeDrawingBrush.btype = 'lasso'
      canvasbg.isDrawingMode = true;
      canvasbg.freeDrawingBrush.width = 0;
    }


    canvasbg.freeDrawingBrush.onMouseDown(pointer.pointer,{e:{}});
  });

  socket.on('mouse:draw', function(e)  {
    if ( canvasbg.freeDrawingBrush!==undefined && canvasbg.isDrawingMode ){
      // canvasbg.freeDrawingBrush.color = e.color;
      // canvasbg.freeDrawingBrush.width = e.width;
      canvasbg.freeDrawingBrush.onMouseMove(e.pointer,{e:{}});
    }
  });

  socket.on('color:change', function(colour_taken) {
    if ( canvasbg.freeDrawingBrush!==undefined ){
      canvasbg.freeDrawingBrush.color = colour_taken;
    }        
  });

  socket.on('width:change', function(width_taken)
  {
    // console.log(width_taken);
    if ( canvasbg.freeDrawingBrush!==undefined ){
      canvasbg.freeDrawingBrush.width = width_taken;
    }
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

  
  socket.on('line:add', function(line_taken) {
    // console.log(line_taken);
    if ( line_taken.line_type == "arrow" ){
      line = new fabric.Arrow(line_taken.points, {
        id: line_taken.id,
        strokeWidth: parseInt(line_taken.width),//drawing_figure_width.value,
        fill: line_taken.fill,//'#07ff11a3',
        stroke: line_taken.stroke,//hexToRgbA(drawing_color_fill.value, drawing_figure_opacity.value),
        strokeDashArray: line_taken.strokeDashArray,
        ///stroke: '#07ff11a3',
        originX: "center",
        originY: "center",
        selectable: false,
        objectCaching: false,
      });

    }else if ( line_taken.line_type == "arrowtwo" ){
      line = new fabric.ArrowTwo(line_taken.points, {
        id: line_taken.id,
        strokeWidth: parseInt(line_taken.width),//drawing_figure_width.value,
        fill: line_taken.fill,//'#07ff11a3',
        stroke: line_taken.stroke,//hexToRgbA(drawing_color_fill.value, drawing_figure_opacity.value),
        strokeDashArray: line_taken.strokeDashArray,
        ///stroke: '#07ff11a3',
        originX: "center",
        originY: "center",
        selectable: false,
        objectCaching: false,
      });
    }else{
      
      line = new fabric.Line(line_taken.points, {
        id: line_taken.id,
        strokeWidth: parseInt(line_taken.width),
        fill: line_taken.fill,//'#07ff11a3',
        stroke: line_taken.stroke,//'#07ff11a3',
        originX: 'center',
        originY: 'center',
        strokeDashArray: line_taken.strokeDashArray,
        selectable: false,
        objectCaching: false
      });
    }
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

  socket.on('picture:add', function(img_taken)  {
    try{
        canvas.loadFromJSON(img_taken);
    }catch (e){
      error.log(e)
    }    
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
      canvas.renderOnAddRemove=false;
      let init_interval = setInterval(function(){
          let chunk = chunks[chunk_index];
          if(!chunk){
            clearInterval(init_interval)
            canvas.renderOnAddRemove=true;
            return false;
          }
          chunk.forEach((object,id)=>{
            chunk[id]=deserialize(object);
            // console.log(chunk[id]);
          });
          fabric.util.enlivenObjects(chunk,function(objects)
          {
            // сохраняем количество объектов
            allReceivedObjects = objects.length
            objects.forEach(function(object) {
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
                  // console.log(object.type);

                  objectAddInteractive(object);

                  canvas.add(object);

                  if ( takedFirstData==false ){
                    object.set({ selectable: false })
                  }
                  decreaseRecievedObjects()
                }
              }                
            })
            
          });
          canvas.renderAll();
          chunk_index++;
      },150)

      //canvas.loadFromJSON(data);
    }
  })

  canvas.on('object:modified', e =>    {
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
    send_part_of_data(e);
    // send_part_events.push(e);
  });


  canvas.on('object:added',e => {
    let object = e.target;
    moveCursorsToFront = true;
    if ( object.formula!==undefined ){
      return;
    }
    if(!object.id)    {
      object = object_set_id(object)
      object = object_fit_apth(object)
      if(!object.socket_id) {
        socket.emit("object:added", {"board_id": board_id, "object": serialize_object(object)});
        socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
      }
    }
  });

  canvas.on('object:moving',e =>
  {
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
    send_part_of_data(e);
      // send_part_events.push(e);
  });


  socket.on('object:moving', e =>
  {
    recive_part_of_data(e);
      // recive_part_events.push(e);
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
      // canvas.sendToBack(cursorUser);
      canvas.add(new fabric.Object(e));
      canvas.renderAll();
      //canvas.loadFromJSON(e);
  });
  

  canvas.on('object:scaling',e =>
  {
    //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": canvas.toJSON(['id'])});
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
    send_part_of_data(e);
      // send_part_events.push(e);
  });


  socket.on('object:scaling', e =>
  {
      recive_part_of_data(e);
      // recive_part_events.push(e);
  });

  canvas.on('object:rotating',e =>
  {
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
    send_part_of_data(e);
      // send_part_events.push(e);
  });


  socket.on('object:rotating', e =>
  {
      recive_part_of_data(e);
      //canvas.loadFromJSON(e);
      // recive_part_events.push(e);
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
    // console.log("path created", options);
    if ( canvas.isDrawingMode ){
      socket.emit("path:created", {"board_id": board_id, "object": options });
      return;
    }
    if ( canvas.isWaitingPath!==undefined && canvas.isWaitingPath!=false ){
      if ( compare_path(options.path,canvas.isWaitingPath) ){
        options.path.id = canvas.isWaitingPath.id;
      }
      canvas.isWaitingPath = false
      // objectAddInteractive(options);
    }
    
  });
  canvasbg.on("path:created",(options)=>{
    if ( canvas.isWaitingPath!==undefined && canvas.isWaitingPath!=false ){
      if ( compare_path(options.path,canvas.isWaitingPath) ){
        canvasbg.remove(options.path)
        options.path.id = canvas.isWaitingPath.id;
        canvas.add(options.path)
        //canvas.add(options.path)
      }
      canvas.isWaitingPath = false
    }
  });
  canvasbg.on("object:added", (e)=>{
    let object = e.target;
    if(!object.id) {
      object = object_set_id(object)
      object = object_fit_apth(object)
    }
  });
  
});

/**
 * Добавляем интерактивности объекту 
 * делаем изменение толщины и цвета
 * @param {*} object 
 */
function objectAddInteractive(object){
  let fn_ = (color)=>{return};
  if ( ['rect','circle'].indexOf(object.type)!==-1  ){
    fn_ = (color)=>{
      object.objectCaching = false;
      object.fill = color;
      canvas.renderAll();
      // object.objectCaching = true;
    }
  }else if (['path','Arrow', 'ArrowTwo', 'line' ].indexOf(object.type)!==-1 ){
    fn_ = (color)=>{
      object.objectCaching = false;
      if ( object.fill ){
        object.fill = color;  
      }
      object.stroke = color;
      canvas.renderAll();
      // object.objectCaching = true;
    }
  }
  object.changedColour = fn_;
  object.changedWidth = function(width){
    object.objectCaching = false;
    // canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);
    this.strokeWidth = parseInt(width);
    canvas.renderAll();
  }
}


function enableFreeDrawing(){
  let array_of_points = [];
  removeEvents();
  canvas.freeDrawingBrush       = new fabric.PencilBrush(canvas);
  canvasbg.freeDrawingBrush     = new fabric.PencilBrush(canvasbg);
  
  canvas.freeDrawingBrush.btype = "brush"
  

  let isDrawing = false;
  let enableDrawingMode = true;
  // canvas._onMouseMoveInDrawingMode = function(e) {
  //   var pointer = canvas.getPointer(e);
  //   if (!isDrawing) {
  //     console.log('enable original mouse move event only one')
  //     isDrawing = true;
  //     canvas.freeDrawingBrush.onMouseDown(pointer,{e:{},pointer:pointer});
  //   }
  //   canvas.freeDrawingBrush.onMouseMove(pointer,{e:{},pointer:pointer});
  //   canvas.setCursor(canvas.freeDrawingCursor);
  //   canvas._handleEvent(e, 'move');
  //   console.log(e);
  // }
  
  // canvas._onMouseMoveInDrawingMode = function (e) {
  //   var pointer = canvas.getPointer(e);
  //   // pointer.x = 100;
  //   console.log({x:pointer.x, y:pointer.y}, isDrawing, canvas.remoteDrawing );
  //   if ( isDrawing ){
      
  //     canvas.freeDrawingBrush.onMouseMove(pointer,{e:{}});
  //     canvas.remoteDrawingBrush.onMouseMove({x:pointer.x-50, y:pointer.y},{e:{}});
  //   }
  // }


    /**
     * @private
     * @param {Event} e Event object fired on mousedown
     */
    // canvas._onMouseDownInDrawingMode = function(e) {
    //   this._isCurrentlyDrawing = true;
    //   if (this.getActiveObject()) {
    //     this.discardActiveObject(e).requestRenderAll();
    //   }
      
    //   // this.freeDrawingBrush.onMouseDown(pointer, { e: e, pointer: pointer });
    //   canvas.remoteDrawingBrush = new fabric['PencilBrush'](canvas);
    //   canvas.remoteDrawingBrush.color = 'green';
    //   canvas.remoteDrawingBrush.width = 5;
    //   canvas.remoteDrawingBrush.needsFullRender = ()=>true;
    //   canvas.remoteDrawingBrush._setBrushStyles(canvas.contextTop)
    //   canvas.remoteDrawingBrush._captureDrawingPath({x:pointer.x-50, y:pointer.y});
    //   canvas.remoteDrawingBrush._render();
      
    //   // this.remoteDrawingBrush.onMouseDown({x:pointer.x-50, y:pointer.y}, { e: e, pointer: {x:pointer.x-50, y:pointer.y} });
    //   // this._handleEvent(e, 'down');
    // },

    /**
     * @private
     * @param {Event} e Event object fired on mousemove
     */
    // canvas._onMouseMoveInDrawingMode = function(e) {
    //   if (this._isCurrentlyDrawing) {
    //     var pointer = this.getPointer(e);
    //     // console.log();
    //     this.freeDrawingBrush.onMouseMove(pointer, { e: e, pointer: pointer });
    //     // canvas.freeDrawingBrush.onMouseMove(pointer,{e:{}});
    //     this.remoteDrawingBrush.onMouseMove({x:pointer.x-50, y:pointer.y},{e:e, pointer: {x:pointer.x-50, y:pointer.y}});
    //   }
    //   this.setCursor(this.freeDrawingCursor);
    //   this._handleEvent(e, 'move');
    // },

    /**
     * @private
     * @param {Event} e Event object fired on mouseup
     */
    // canvas._onMouseUpInDrawingMode = function(e) {
    //   var pointer = this.getPointer(e);
    //   this._isCurrentlyDrawing = this.freeDrawingBrush.onMouseUp({ e: e, pointer: pointer });
    //   this.remoteDrawingBrush.onMouseUp({ e: e, pointer: {x:pointer.x-50, y:pointer.y} });
    //   this._handleEvent(e, 'up');
    // },

  canvas.isDrawingMode          = true;
  canvas.on('mouse:down', e => {
    // console.log('mouse:down',e);
    
    isDrawing = true;
    const pointer = canvas.getPointer(e);    
    // canvas.freeDrawingBrush = new fabric['PencilBrush'](canvas);
    canvas.freeDrawingBrush.color = drawingColorEl.style.backgroundColor;
    canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);
    // canvas.freeDrawingBrush.needsFullRender = ()=>true;
    // canvas.freeDrawingBrush._setBrushStyles(canvas.contextTop)
    // canvas.freeDrawingBrush._captureDrawingPath(pointer);
    // canvas.freeDrawingBrush._render();
    canvas.freeDrawingBrush.onMouseDown(pointer,{e:{}});
    
    // canvas.remoteDrawingBrush.onMouseDown({x:pointer.x-50, y:pointer.y},{e:{}});
    socket.emit('mouse:down', {pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'brush'});
  })
  canvas.on('mouse:up', e => {
    isDrawing = false;
    const pointer = canvas.getPointer(e);
    socket.emit('mouse:up',{pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'brush'});
    //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
  })
  canvas.on('mouse:move', function (e) {
    if (isDrawing) {
      const pointer = canvas.getPointer(e);
      // canvas.freeDrawingBrush.width=7;
      canvas.freeDrawingBrush.onMouseMove(pointer,{e:{}});
      // canvas.remoteDrawingBrush.onMouseMove({x:pointer.x-50, y:pointer.y},{e:{}});
      socket.emit('mouse:draw',{pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'brush'});//canvas.freeDrawingBrush._points); 
    }
  })
}

/**
 * Включаем инструмент лассо
 */
function lassoButtonClick(){
  let isDrawing = false;
  removeEvents();
  canvas.freeDrawingBrush = new fabric.LassoBrush(canvas);
  canvas.freeDrawingBrush.color = drawingColorEl.style.backgroundColor;
  canvas.isDrawingMode = true;

  canvas.on('mouse:down', e => {
    isDrawing = true;
    const pointer = canvas.getPointer(e);
    socket.emit('mouse:down', {pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'lasso'});
  })
  canvas.on('mouse:up', e => {
    isDrawing = false;
    const pointer = canvas.getPointer(e);
    socket.emit('mouse:up',{pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'lasso'});
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
  })
  canvas.on('mouse:move', (e)=> {
    if (isDrawing) {
      const pointer = canvas.getPointer(e);
      socket.emit('mouse:draw',{pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'lasso'});//canvas.freeDrawingBrush._points); 
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
    if (isDrawing) {
      const pointer = canvas.getPointer(e);
      socket.emit('mouse:draw',{pointer, width:canvas.freeDrawingBrush.width, color:canvas.freeDrawingBrush.color, type:'eraser'});//canvas.freeDrawingBrush._points); 
    }
  })
}

/**
 * Нажатие на кнопку удаления выделенных фрагментов
 */
function bladeButtonClick(){

  removeEvents();
  let bladeDown = false;
  canvas.on('mouse:down', e => {   
    bladeDown = true;
  })
  canvas.on('mouse:up', e => {
    bladeDown = false;
  })
  canvas.on('mouse:move', function (e) {
    if (bladeDown) {
      const cursorCoordinate = canvas.getPointer(e);
      // console.log(canvas._objects);
      // let points = [pointer.x, pointer.y, pointer.x, pointer.y];
      let d = [];
      canvas._objects.forEach(item=>{
        if (!item){
          return false
        }
        let bound = item.getBoundingRect();
        // console.log( cursorCoordinate.x , bound.left, bound.left + bound.width ,bound );
        if ( cursorCoordinate.x > bound.left && cursorCoordinate.x < (bound.left + bound.width) &&
             cursorCoordinate.y > bound.top && cursorCoordinate.y < (bound.top + bound.height)  ) {
          d.push(item);
          // console.log(item);
          canvas.setActiveObject(item);
        }
        // return false
      });
      // console.log(d);
      Delete();
    }
  })
  // Delete();

}

function enableSelection() {
  removeEvents();
  canvas.toggleDragMode(false);
  isCursorMove=false;
  changeObjectSelection(true);
  canvas.on("mouse:down", (e) => {
    let d = canvas.getActiveObject();
  });
}


function drawrec(type_of_rectangle) {
  var rect, isDown, origX, origY;
  removeEvents();
  changeObjectSelection(false);
  colour_inside = 'Black';
  let stroke_line = 0;
  
  if (type_of_rectangle == "empty")  {
    colour_inside = hexToRgbA('#000dff',5);
    stroke_line   = 0;
  } else if(type_of_rectangle == "empty_with_stroke_line") {
    colour_inside = hexToRgbA('#000dff',5);
    stroke_line = 20;
  }  else if (type_of_rectangle == "filled")  {
    colour_inside = drawingColorEl.style.backgroundColor;
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
      objectCaching: false,
    });
    rect.changedColour = function(color){
      rect.fill = color;
      // console.log("rect",rect);
      canvas.renderAll();
    }
    rect.changedWidth = function(width){
      rect.objectCaching = false;
      // canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);
      this.strokeWidth = parseInt(width);
      canvas.renderAll();
    }
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
    colour_inside = drawingColorEl.style.backgroundColor;
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
      objectCaching: false,
    });
    circle.changedColour = function(color){
      circle.fill = color;
      // console.log("circle log");
      canvas.renderAll();
    }
    circle.changedWidth = function(width){
      circle.objectCaching = false;
      // canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);
      this.strokeWidth = parseInt(width);
      canvas.renderAll();
    }
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
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
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

  canvasbg.setHeight(window.innerHeight);
  canvasbg.setWidth(window.innerWidth);
  canvasbg.renderAll();
}

// resize on init
resizeCanvas();




canvas.isDrawingMode = false;
//canvas.freeDrawingBrush.width = 5;
//canvas.freeDrawingBrush.color = '#00aeff';

// function handle_mouse_move(e) {
//   canvas.freeDrawingBrush._points = e.map((item) => {
//     return new fabric.Point(item.x, item.y);
//   });
//   canvas._onMouseUpInDrawingMode({ target: canvas.upperCanvasEl });
// }

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
    objectCaching: false,
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
  // canvas.freeDrawingBrush.width = width_taken;
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
        
/* Basic example */

const popupBasic = new Picker({parent:drawingColorEl,popup: 'top',editorFormat: 'rgba'});
popupBasic.onChange = function(color) {
  drawingColorEl.style.backgroundColor = color.rgbaString;
  canvas.freeDrawingBrush.color = color.rgbaString;
  socket.emit("color:change", color.rgbaString);
  Cookies.set('colour', color.rgbaString);

  // console.log(Cookies.get('colour'));
  let obj_ = canvas.getActiveObject();
  // console.log(obj_);
  if ( obj_ && obj_.changedColour ){
    socket.emit("color:changed", { "object":obj_, "id":obj_.id, "color":color.rgbaString});
    obj_.changedColour(color.rgbaString)
  }
};


//Open the popup manually:
// popupBasic.openHandler();


canvas.freeDrawingBrush.color = drawingColorEl.style.backgroundColor;
canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);

let localStorageColour = localStorage.getItem('color');
let localStorageWidth  = localStorage.getItem('width');

if (localStorageColour)
{
  canvas.freeDrawingBrush.color = localStorageColour;
  drawingColorEl.style.backgroundColor = localStorageColour;
}

if (localStorageWidth)
{
  canvas.freeDrawingBrush.width = localStorageWidth;
  drawingLineWidthEl.value = localStorageWidth;
}


drawingLineWidthEl.oninput = function() 
{
  canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);
  socket.emit("width:change", canvas.freeDrawingBrush.width);

  localStorage.setItem('width',canvas.freeDrawingBrush.width);
  let obj_ = canvas.getActiveObject();
  // console.log(obj_);
  if ( obj_ && obj_.changedWidth ){
    // console.log(obj_.id);
    socket.emit("width:changed",{"object": obj_, "id":obj_.id, "width":canvas.freeDrawingBrush.width});
    obj_.changedWidth(drawingLineWidthEl.value)
  }

};


function drawLine(type_of_line) {
  // canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);
  // canvas.freeDrawingBrush.color = drawingColorEl.style.backgroundColor;
  drawingLineWidthEl.onchange = function() 
  {
    canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10) ;
    socket.emit("width:change", canvas.freeDrawingBrush.width);
  };
  let line, isDown;

  drawingColorEl.onchange = function() 
  {
    canvas.freeDrawingBrush.color = drawingColorEl.style.backgroundColor;
    socket.emit("color:change",drawingColorEl.style.backgroundColor);

    // console.log("line!");

  };
  colour_inside = hexToRgbA('#000dff',5);
  if (type_of_line == "trivial") { 
    stroke_line   = 0;
  } else if(type_of_line == "dotted") {
    stroke_line = 20;
  }else if ( type_of_line == "arrow" ){
    stroke_line = 0;
  }else if ( type_of_line == "arrowtwo" ){
    stroke_line = 0;
  }

  removeEvents();
  changeObjectSelection(false);
  canvas.on("mouse:down", function (o) {
    isDown = true;
    let pointer = canvas.getPointer(o.e);
    let points = [pointer.x, pointer.y, pointer.x, pointer.y];
    if ( type_of_line == "arrow" ){
      line = new fabric.Arrow(points, {
        strokeWidth: parseInt(canvas.freeDrawingBrush.width),//drawing_figure_width.value,
        //fill: hexToRgbA(drawing_color_fill.value,drawing_figure_opacity.value),
        stroke: canvas.freeDrawingBrush.color,//hexToRgbA(drawing_color_fill.value, drawing_figure_opacity.value),
        strokeDashArray: [stroke_line, stroke_line],
        ///stroke: '#07ff11a3',
        originX: "center",
        originY: "center",
        selectable: false,
        objectCaching: false,
      });
      
    }else if ( type_of_line == "arrowtwo" ){
      line = new fabric.ArrowTwo(points, {
        strokeWidth: parseInt(canvas.freeDrawingBrush.width),//drawing_figure_width.value,
        //fill: hexToRgbA(drawing_color_fill.value,drawing_figure_opacity.value),
        stroke: canvas.freeDrawingBrush.color,//hexToRgbA(drawing_color_fill.value, drawing_figure_opacity.value),
        strokeDashArray: [stroke_line, stroke_line],
        ///stroke: '#07ff11a3',
        originX: "center",
        originY: "center",
        selectable: false,
        objectCaching: false,
      });
    }else{
      line = new fabric.Line(points, {
        strokeWidth: parseInt(canvas.freeDrawingBrush.width),//drawing_figure_width.value,
        //fill: hexToRgbA(drawing_color_fill.value,drawing_figure_opacity.value),
        stroke: canvas.freeDrawingBrush.color,//hexToRgbA(drawing_color_fill.value, drawing_figure_opacity.value),
        strokeDashArray: [stroke_line, stroke_line],
        ///stroke: '#07ff11a3',
        originX: "center",
        originY: "center",
        selectable: false,
        objectCaching: false,
      });
    }
    line.changedColour = function(color){
      this.stroke = color;
      // console.log("line stroke");
      canvas.renderAll();
    }
    line.changedWidth = function(width){
      line.objectCaching = false;
      // canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10);
      this.strokeWidth = parseInt(width);
      canvas.renderAll();
    }
    canvas.add(line);
    socket.emit("line:add", {
      id: line.id,
      points: points,
      fill:line.fill,
      width: parseInt(line.strokeWidth),
      strokeDashArray: [stroke_line, stroke_line],
      stroke: line.stroke});
  });
  canvas.on("mouse:move", function (o) {
    if (!isDown) return;
    let pointer = canvas.getPointer(o.e);
    if ( line!==undefined ){
      line.set({
        x2: pointer.x,
        y2: pointer.y,
      });
    }
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
    if ( obj.cursor ===undefined || !obj.cursor ){
      obj.set({selectable : value});
    }
    // console.log(obj.selectable);
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


const handleButtonCursorMoveClick = (ev) => {
  removeEvents();
  ev.preventDefault()
  isCursorMove = !isCursorMove;
  canvas.toggleDragMode(true);
  buttonCursorMove.classList.toggle('settings-panel__button-cursor-move_active');
  canvas.isDrawingMode = false
  canvas.allowTouchScrolling = true;
  changeObjectSelection(false);
} 
buttonCursorMove.addEventListener('click', handleButtonCursorMoveClick);


let colour = Cookies.get('colour');

document.addEventListener('DOMContentLoaded',(e)=>{
  removeEvents();
  isCursorMove= true;
  canvas.toggleDragMode(true);
  buttonCursorMove.classList.add('settings-panel__button-cursor-move_active');
  selectedTool = buttonCursorMove.dataset.tool;
  canvas.isDrawingMode = false
  canvas.allowTouchScrolling = true;
  changeObjectSelection(false);
  // console.log(colour);
  if ( colour ){
    popupBasic.setColor(colour);
    drawingColorEl.style.backgroundColor = colour;
    socket.emit("color:change", colour);
  }else{
    colour="rgba(0,0,0,1)";
    popupBasic.setColor(colour);
    drawingColorEl.style.backgroundColor = colour;
    Cookies.set('colour',colour);
  }
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




const inputChangeColor = document.querySelector('#drawing-line-width');
// const subToolPanel = inputChangeColor.closest('.sub-tool-panel__change-color');

const fontColorListWrapper2 = document.querySelector('.setting-item__font-color-list-wrapper');
const fontColorInput2 = document.querySelector('.setting-item__input-font-color > input');


const handleClickOpenInputChangeColor = () => {

  // subToolPanel.classList.add('sub-tool-panel_visible');
}
const handleClickCloseInputChangeColor = (event) => {
  if (event.target !== inputChangeColor) {
    // subToolPanel.classList.remove('sub-tool-panel_visible');

  } else if(event.target !== fontColorInput2) {
    fontColorListWrapper2.classList.remove('active');
  } else {

  }
}

window.addEventListener('click', handleClickCloseInputChangeColor);
inputChangeColor.addEventListener('click', handleClickOpenInputChangeColor);

fontColorInput2.addEventListener('click', () => { fontColorListWrapper2.classList.add('active') })

fontColorInput2.addEventListener('change', (e) => { 
  let obj_ = canvas.getActiveObject();
  if ( obj_ ){
    canvas.getActiveObject().set("fill", e.target.value) 
  }
})

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
  canvasbg.zoomToPoint(centerPoint, currentValueZoom);
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
  canvasbg.zoomToPoint(centerPoint, currentValueZoom);
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
