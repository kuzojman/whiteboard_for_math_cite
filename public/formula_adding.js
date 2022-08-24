


const formFormulasWrapper           = document.querySelector('.form-formulas__wrapper');
const mf                            = document.querySelector('#formula');
const buttonShowModalWindowFormulas = document.querySelector('.button__show-modal-window-formulas');
const buttonAddFormulas             = document.querySelector('.button__add-formulas');
const buttonSaveFormulas            = document.querySelector('.button__save-formulas');
const buttonCancelFormulas          = document.querySelector('.button__cancel-formulas');
const fieldFormFormulas             = document.querySelector('.form-formulas__field');

// айди объекта, который редактируется в настоящий момент
let formulaEditMode=false

window.addFormula = function(formula, id=false, object=false, emit=true){
    if ( formula===undefined || formula=='' ){
        return
    }
    let svg = MathJax.tex2svg(formula);
        svg = svg.childNodes[0]
    let s = new XMLSerializer().serializeToString(svg);
    let b64 = "data:image/svg+xml;base64, " + window.btoa(unescape(encodeURIComponent(s)))
    fabric.Image.fromURL(b64, function(myImg) {
        myImg['formula'] = formula
        canvas.add(myImg)
        if ( id!==false ){
            myImg['id'] = id;
        }
        if ( object!==false ){
            myImg.set({
              top: object.top, //+object.object.top,
              left: object.left, //+object.object.left
              angle: object.angle,
              scaleX: object.scaleX,
              scaleY: object.scaleY,
            });
        }
        if ( emit ){
            socket.emit("formula:added", {"board_id": board_id,'formula':myImg.formula, "object": myImg});
        }
        canvas.renderAll()
    });
}

/**
 * Редактирование формулы объекта
 * @param {*} new_formula 
 * @param {*} object_id 
 */
function editFormula( new_formula, object_id ){
    if ( new_formula===undefined || new_formula=='' ){
        return
    }
    var svg = MathJax.tex2svg(new_formula);
        svg = svg.childNodes[0]
    let s = new XMLSerializer().serializeToString(svg);
    let b64 = "data:image/svg+xml;base64, " + window.btoa(unescape(encodeURIComponent(s)))
    myImg = canvas._objects.find( item => item.id==object_id )
    
    if ( myImg ){
        myImg['formula'] = new_formula
        myImg.setSrc(b64, ()=> canvas.renderAll());
    }
    return myImg
}

/**
 * Кнопка сохранения редактируемой вормулы
 */
buttonSaveFormulas.addEventListener('click',(ev)=>{
    ev.preventDefault();
    let img_ = editFormula(mf.value,formulaEditMode)
    formulaEditMode=false;
    editMode(false)
    formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
    socket.emit("formula:edited", {"board_id": get_board_id(), 'formula':img_.formula, "object": img_});
    socket.emit("canvas_save_to_json", {"board_id": get_board_id(), "canvas": serialize_canvas(canvas)});
});

/**
 * Кнопка отмены
 */
buttonCancelFormulas.addEventListener('click',(ev)=>{
    ev.preventDefault();
    formulaEditMode=false;
    editMode(false)
    formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
});

/**
 * True - режим редактирования False - режим добавления
 * @param {*} on 
 */
function editMode(on){
    if (on){
        buttonSaveFormulas.classList.remove('d-none')
        buttonCancelFormulas.classList.remove('d-none')
        buttonAddFormulas.classList.add('d-none')
    }else{
        buttonSaveFormulas.classList.add('d-none')
        buttonCancelFormulas.classList.add('d-none')
        buttonAddFormulas.classList.remove('d-none')
    }
}

buttonAddFormulas.addEventListener('click', (event) => {
    event.preventDefault();
    addFormula( mf.value, false, {
        left: mouseCursorCoordinatesCanvas.x,
        top: mouseCursorCoordinatesCanvas.y,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
    } )
    editMode(false)
    formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
    canvas.off('mouse:down');
    canvas.off('mouse:up');
})



buttonShowModalWindowFormulas.addEventListener('click', (event) => {
    let origX, origY;
    if(selectedTool=='formula') {
        formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
        canvas.off('mouse:down');
        canvas.off('mouse:up');
    } else {
        changeObjectSelection(false);
        removeEvents();
        canvas.on('mouse:down', function(o) {
            const pointer = canvas.getPointer(o.e);
            // if(formulaTextarea.value !== ''){
            //     canvas.renderAll();
            //     formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
            // } else {
            mouseCursorCoordinatesCanvas = {
                x: pointer.x,
                y: pointer.y,
            }
            origX = o.pointer.x;
            origY = o.pointer.y;
            formFormulasWrapper.style.left = origX + 'px';
            formFormulasWrapper.style.top = origY + 'px';
            formFormulasWrapper.classList.add('form-formulas__wrapper_visible');
            // }

        });
        canvas.on('mouse:up', function(o) {

        });
    }
    // isDown = true;
})

/**
 * Отрабатываем двойное нажатие на формулу для входа в режим редактирования
 * @param {*} e 
 */
function formulaDblClicked(e){
    formulaEditMode = e.id
    mf.value = e.formula

    // edit mode
    editMode(true)
    formFormulasWrapper.style.top = e.top-20 + 'px';
    formFormulasWrapper.style.left = e.left-20 + 'px';    
    formFormulasWrapper.classList.add('form-formulas__wrapper_visible');
}

// mouse event
fabric.util.addListener(canvas.upperCanvasEl, 'dblclick', function(e) {
    let obj_ = canvas.findTarget(e)
    if (obj_) {
        const objType = obj_.type;
        if (objType === 'image' && obj_.formula!==undefined) {
            formulaDblClicked(obj_)
        }
    }
});