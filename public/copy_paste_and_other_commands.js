let mouse_coords;
let _clipboard = null;

function Copy() {
  let act_ = canvas.getActiveObject();
  if (act_) {
    act_.clone(
      function (cloned) {
        _clipboard = cloned;
        // console.log(_clipboard);
      },
      ['formula']
    );
    canvas.on('mouse:move', function (e) {
      getMouse(e);
    });
  }
}

function getMouse(e) {
  mouse_coords = {
    x: e.e.clientX,
    y: e.e.clientY,
  };
  //console.log(e.e.clientX,e.e.clientY);
}

function Delete() {
  if (formulaEditMode !== false) {
    return;
  }
  var doomedObj = canvas.getActiveObject();
  let ids = [];
  if (doomedObj === undefined || !doomedObj) {
    return;
  }
  if (doomedObj.type === 'activeSelection') {
    doomedObj.canvas = canvas;
    doomedObj.forEachObject(function (obj) {
      ids.push(obj.id); //find_object_index(obj));
      canvas.remove(obj);
    });
    socket.emit('canvas_save_to_json', { board_id: board_id, canvas: serialize_canvas(canvas) });
    socket.emit('figure_delete', ids); //canvas.toJSON());
  } else {
    var activeObject = canvas.getActiveObject();

    if (activeObject !== null) {
      ids.push(activeObject.id); //find_object_index(activeObject));
      canvas.remove(activeObject);
      //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
      socket.emit('figure_delete', ids); //canvas.toJSON());
    }
  }
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

function Paste() {
  if (_clipboard) {
    // clone again, so you can do multiple copies.
    _clipboard.clone(
      function (clonedObj) {
        canvas.discardActiveObject();
        clonedObj = object_set_id(clonedObj);
        // console.log(clonedObj, clonedObj.id);
        setObjectToCanvasCenter(clonedObj);
        clonedObj.set({
          evented: true,
        });

        if (clonedObj.type === 'activeSelection') {
          // active selection needs a reference to the canvas.
          clonedObj.canvas = canvas;
          clonedObj.forEachObject(function (obj) {
            canvas.add(obj);
          });
          canvas.discardActiveObject();
          //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
          socket.emit('figure_copied', canvas.toJSON());
          // this should solve the unselectability
          clonedObj.setCoords();
        } else {
          canvas.add(clonedObj);
          //socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
          socket.emit('figure_copied', clonedObj); //canvas.toJSON());
        }
        objectAddInteractive(clonedObj);
        // _clipboard.top += 10;
        // _clipboard.left += 10;
        // setObjectToCanvasCenter(_clipboard)

        canvas.setActiveObject(clonedObj);
        canvas.requestRenderAll();
      },
      ['formula']
    );
  }
}

document.body.addEventListener(
  'keydown',
  function (e) {
    e = e || window.event;
    var key = e.which || e.keyCode; // keyCode detection
    var ctrl = e.ctrlKey ? e.ctrlKey : key === 17 ? true : false; // ctrl detection
    // console.log(key, ctrl);
    if (key == 90 && ctrl) {
      // Check pressed button is Z - Ctrl+Z.
      canvas.undo();
    } else if (key == 89 && ctrl) {
      // Check pressed button is Y - Ctrl+Y.
      canvas.redo();
    } else if (key == 86 && ctrl) {
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

// document.addEventListener("keyup", ({ keyCode, ctrlKey } = event) => {
//   // Check Ctrl key is pressed.
//   if (!ctrlKey) {
//     return;
//   }

//   // Check pressed button is Z - Ctrl+Z.
//   if (keyCode === 90) {
//     canvas.undo();
//   }

//   // Check pressed button is Y - Ctrl+Y.
//   if (keyCode === 89) {
//     canvas.redo();
//   }
// });

// copy event
addEventListener('copy', (e) => {
  Copy();
});

// paste from buffer
addEventListener('paste', async (e) => {
  if (_clipboard) {
    debugger;
    Paste();
    _clipboard = null;
    return;
  }

  let items = e.clipboardData.items;

  for (var i = 0; i < items.length; i++) {
    var item = items[i];

    if (item.type === 'text/plain') {
      // Обработка текста
      let paste = (e.clipboardData || window.clipboardData).getData('text');
      if (paste) {
        // вставляем текст в центр экрана
        let txt = addTextField({ x: 0, y: 0 }, paste);
        setObjectToCanvasCenter(txt);
      }
    } else if (item.type.indexOf('image') !== -1) {
      // Обработка изображений
      var imageData = item.getAsFile();

      if (imageData) {
        try {
          let imageUrl = await readFileAsDataURL(imageData);

          // Вставляем изображение на доску
          insertImageOnBoard(imageUrl);

          // Отправляем изображение на сервер
          socket.emit('cloud:image:add', {
            name: imageData.name,
            file: imageData,
            type: imageData.type,
          });
        } catch (error) {
          console.error('Error reading image file:', error);
        }
      }
    }
  }
});

// Функция для чтения файла и возврата Data URL
async function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();

    reader.onload = function (event) {
      resolve(event.target.result);
    };

    reader.onerror = function (error) {
      reject(error);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * После сохранения
 */
// socket.on('cloud:image:saved', (data) => {
// if (data && data.Location !== undefined) {
//   insertImageOnBoard(data.Location);
// }
// });
