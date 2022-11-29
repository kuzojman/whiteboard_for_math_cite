let mouse_coords;
let _clipboard = null;

function Copy() {
  canvas.getActiveObject().clone(function (cloned) {
    _clipboard = cloned;
    // console.log(_clipboard);
  },['formula']);
  canvas.on("mouse:move", function (e) {
    getMouse(e);
  });
}

function getMouse(e) {
  mouse_coords = {
    x: e.e.clientX,
    y: e.e.clientY,
  };
  //console.log(e.e.clientX,e.e.clientY);
}

function Delete() {
  if ( formulaEditMode!==false ){
    return;
  }
  var doomedObj = canvas.getActiveObject();
  let ids = [];
  if ( doomedObj===undefined || !doomedObj  ){
    return;
  }
  if ( doomedObj.type === "activeSelection" ) {
    doomedObj.canvas = canvas;
    doomedObj.forEachObject(function (obj) {
      ids.push(find_object_index(obj));
      canvas.remove(obj);
    });
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
    socket.emit("figure_delete", ids);//canvas.toJSON());
  } else {
    var activeObject = canvas.getActiveObject();

    if (activeObject !== null) {
      ids.push(find_object_index(activeObject));
      canvas.remove(activeObject);
      socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
      socket.emit("figure_delete", ids);//canvas.toJSON());
    }
  }
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

function Paste() {
  console.log(_clipboard,_clipboard.formula);
  if ( _clipboard ){
    // clone again, so you can do multiple copies.
    _clipboard.clone(function (clonedObj) {
      canvas.discardActiveObject();
      clonedObj = object_set_id(clonedObj);
      // console.log(clonedObj, clonedObj.id);
      setObjectToCanvasCenter(clonedObj)
      clonedObj.set({
        evented: true,
      });
      
      if (clonedObj.type === "activeSelection") {
        // active selection needs a reference to the canvas.
        clonedObj.canvas = canvas;
        clonedObj.forEachObject(function (obj) {
          canvas.add(obj);
        });
        canvas.discardActiveObject();
        socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
        socket.emit("figure_copied", canvas.toJSON());
        // this should solve the unselectability
        clonedObj.setCoords();
      } else {
        canvas.add(clonedObj);
        socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
        socket.emit("figure_copied",clonedObj) //canvas.toJSON());
      }
      // _clipboard.top += 10;
      // _clipboard.left += 10;
      // setObjectToCanvasCenter(_clipboard)
      
      canvas.setActiveObject(clonedObj);
      canvas.requestRenderAll();
    },['formula']);
  }
}

// function find_object_index(target_object) {
//   let target_index; 
//   let objects = canvas.getObjects();
//   console.log(objects,'objects',target_object)
//   objects.forEach(function (object, index) {
//     if (object == target_object) {
//       target_index = index;
//     }
//   });
//   if(!target_index)
//   {
//     objects.forEach(function (object, index) {
//       if (object.id == target_object.id) {
//         target_index = index;
//       }
//     });
//   }
//   console.log(target_index,'target_index')
//   return target_index;
// }










/*
var state = [];
var mods = 0;

canvas.on(
  'object:modified', function () 
  {
  updateModifications(true);
},
  'object:added', function () {
  updateModifications(true);
});

function updateModifications(savehistory) 
{
  if (savehistory === true) 
  {
      let myjson = JSON.stringify(canvas);
      state.push(myjson);
  }
}

  function undo() 
  {
    if (mods < state.length) 
    {
        //canvas.clear().renderAll();
        let index = state.length - 1 - mods - 1;
        if(index<0)
        {
          index = 0;
        }
        canvas.loadFromJSON(state[index]);
        //canvas.renderAll();
        console.log(state,state.length - 1 - mods - 1)
        mods += 1;

    }
  }
*/

document.body.addEventListener(
  "keydown",
  function (e) {
    e = e || window.event;
    var key = e.which || e.keyCode; // keyCode detection
    var ctrl = e.ctrlKey ? e.ctrlKey : key === 17 ? true : false; // ctrl detection

    if (key == 86 && ctrl) {
      //alert("Ctrl + V Pressed !");
      // Paste();
    } else if (key == 67 && ctrl) {
      //alert("Ctrl + C Pressed !");
      // Copy();
    } else if (key == 46) {
      //alert("delete Pressed !");
      Delete();
    }
  },
  false
);

document.addEventListener("keyup", ({ keyCode, ctrlKey } = event) => {
  // Check Ctrl key is pressed.
  if (!ctrlKey) {
    return;
  }

  // Check pressed button is Z - Ctrl+Z.
  if (keyCode === 90) {
    canvas.undo();
  }

  // Check pressed button is Y - Ctrl+Y.
  if (keyCode === 89) {
    canvas.redo();
  }
});

// copy event
addEventListener('copy', (e) => { 
  Copy()
});

// paste from buffer
addEventListener('paste', (e) => { 
  // console.log('paste',_clipboard );
  if ( _clipboard ){
    Paste();
    _clipboard = null;
    return;
  }
  let items=e.clipboardData.items;
  // e.preventDefault();
  // e.stopPropagation();
  let paste = (e.clipboardData || window.clipboardData).getData('text');
  if (paste){
    // вставляем текст в центр экрана
    
    let txt = addTextField( {x:0,y:0}, paste);
    setObjectToCanvasCenter(txt);
    // return;
  }

  //Loop through files
  for(var i=0;i<items.length;i++){
    let tp = items[i].type;
    if (tp.indexOf('image')!== -1) {
      var imageData = items[i].getAsFile(); 
      // console.log(imageData);
      socket.emit('cloud:image:add',{ name:imageData.name, file: imageData, type: imageData.type})
      // insertImageOnBoard(window.webkitURL.createObjectURL(imageData));
    }
  }
});

/**
 * После сохранения 
 */
socket.on('cloud:image:saved', (data)=>{
  if ( data && data.Location!==undefined ){
    insertImageOnBoard(data.Location);
  }
})