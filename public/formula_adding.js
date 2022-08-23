


const formFormulasWrapper           = document.querySelector('.form-formulas__wrapper');
const mf                            = document.querySelector('#formula');
const buttonShowModalWindowFormulas = document.querySelector('.button__show-modal-window-formulas');
const buttonAddFormulas             = document.querySelector('.button__add-formulas');
const buttonSaveFormulas            = document.querySelector('.button__save-formulas');
const buttonCancelFormulas          = document.querySelector('.button__cancel-formulas');
const fieldFormFormulas             = document.querySelector('.form-formulas__field');

// айди объекта, который редактируется в настоящий момент
let formulaEditMode=false

window.addFormula = function(formula, id=false, object=false){
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
        canvas.renderAll()
    });
}

/**
 * Кнопка сохранения редактируемой вормулы
 */
buttonSaveFormulas.addEventListener('click',(ev)=>{
    ev.preventDefault();
    var svg = MathJax.tex2svg(mf.value);
        svg = svg.childNodes[0]
    let s = new XMLSerializer().serializeToString(svg);
    let b64 = "data:image/svg+xml;base64, " + window.btoa(unescape(encodeURIComponent(s)))
    myImg = canvas._objects.find( item => item.id==formulaEditMode )
    
    if ( myImg ){
        myImg['formula'] = mf.value
        myImg.setSrc(b64, ()=> canvas.renderAll());
    }
    formulaEditMode=false;
    editMode(false)
    formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
    
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
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
    // console.log(mf.value);
    event.preventDefault();
    var svg = MathJax.tex2svg(mf.value);
        svg = svg.childNodes[0]
    let s = new XMLSerializer().serializeToString(svg);
    let b64 = "data:image/svg+xml;base64, " + window.btoa(unescape(encodeURIComponent(s)))
    fabric.Image.fromURL(b64, function(myImg) {
        myImg['formula'] = mf.value
        canvas.add(myImg)
        myImg.set({
            left: mouseCursorCoordinatesCanvas.x-myImg.width,
            top: mouseCursorCoordinatesCanvas.y-myImg.height,
        })
        canvas.renderAll()
    });
    canvas.renderAll()
    return;

    
    //formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
    let docss = document.querySelector('math-field').shadowRoot.querySelector('.ML__fieldcontainer__field');
    html2canvas(docss).then(function(canvas) {

        let image = canvas.toDataURL('image/png');
        console.log('Drew on the existing canvas',image);
        fabric.Image.fromURL(image, function(myImg) {
 //i create an extra var for to change some image properties
                var img1 = myImg.set({ left: 100, top: 100 ,width:docss.offsetWidth,height:docss.offsetHeight});
                fabric_canvas.add(img1); 
                socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(fabric_canvas)});
                socket.emit("picture:add",serialize_canvas(fabric_canvas));
                formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
        });
    });
    
})



buttonShowModalWindowFormulas.addEventListener('click', (event) => {
    let origX, origY;
    console.log(selectedTool);
    if(selectedTool=='formula') {
        formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
        canvas.off('mouse:down');
        canvas.off('mouse:up');
    } else {
        changeObjectSelection(false);
        removeEvents();
        canvas.on('mouse:down', function(o) {
            console.log('mouse:down');
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
            console.log('mouse:up');
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