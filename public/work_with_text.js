const buttonText = document.querySelector('.tool-panel__item-button-text'); // *
const formTextTextarea = document.querySelector('.form-text__textarea');
const modalTextWrapper = document.querySelector('.modal-text-wrapper');
const formTextInput = document.querySelector('.form-text__input');
const textSettings = document.querySelector('.text-settings');
const formTextButtonSubmit = document.querySelector('.form-text__button-submit');
const fontsLiItems = document.querySelectorAll('.setting-item__font-family-item');

const buttonFontSizeUp = document.querySelector('.text-settings__button-font-size-up');
const buttonFontSizeDown = document.querySelector('.text-settings__button-font-size-down');
//const fontSizeValue = document.querySelector('.text-settings__font-size-value');
const buttonOpenListFontFamily = document.querySelector('.text-settings__button-open-list');
const fontFamilyListWrapper = document.querySelector('.text-settings__font-family-list_wrapper');
//const fontFamilyList = document.querySelector('.text-settings__font-family-list');

/**
 * ID текстового блока, который редактируется
 */
let textEditId = false;


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
    if ( canvas.getActiveObject() ){
        canvas.getActiveObject().set("fill", e.target.value);
        socket.emit("text:edited",  {"board_id": board_id, "object": canvas.getActiveObject(), 'id':textEditId})
    }
})

let isEditing;
let firstTouch;

/**
 * Функция выбора текста из меню
 * @param {*} font 
 */
function selectFont(font){
    let is_active = false;
    for (let i = 0; i < fontsLiItems.length; i++) {
        const element = fontsLiItems[i];
        if ( font===element.textContent ){
            is_active=element.classList.contains('text-settings__font-item_active')
            if ( is_active ){
                element.classList.remove('text-settings__font-item_active');
            }else{
                element.classList.add('text-settings__font-item_active');
                buttonFontFamily.textContent = font;
            }
        }else{
            element.classList.remove('text-settings__font-item_active')
        }
    }
    
}

textSettings.addEventListener('click', (e) => {
    switch(e.target.tagName) {
        case "LI":
            if(e.target.classList.contains('setting-item__font-family-item')) {
                
                
                selectedFontFamily = e.target.textContent;
                buttonFontFamily.textContent = selectedFontFamily;
                // выбираем шрифт
                selectFont(selectedFontFamily)
                // console.log(selectedFontFamily)
                if ( canvas.getActiveObject() ){
                    canvas.getActiveObject().set('fontFamily', selectedFontFamily);
                    canvas.requestRenderAll();
                    socket.emit("text:edited",  {"board_id": board_id, "object": canvas.getActiveObject(), 'id':textEditId})
                }

            } else if(e.target.classList.contains('setting-item__font-style-item')) {
                const text = canvas.getActiveObject();
                switch(+e.target.dataset.item) {
                    case 1: {
                        
                        const currentFontWeight = getStyle(text,'fontWeight')
                        const newFontWeight = currentFontWeight === "bold" ? "normal" : "bold";
                        e.target.classList.toggle('text-settings__font-item_active')
                        if ( canvas.getActiveObject() ){
                            canvas.getActiveObject().set("fontWeight", newFontWeight);
                            canvas.renderAll();
                            // console.log('1');
                            socket.emit("text:edited",  {"board_id": board_id, "object": canvas.getActiveObject(), 'id':textEditId})
                        }
                        return;
                    }
                    case 2: {
                        const currentFontStyle = getStyle(text,'fontStyle');
                        const newFontStyle = currentFontStyle === "italic" ? "normal" : "italic";
                        
                        e.target.classList.toggle('text-settings__font-item_active')
                        if ( canvas.getActiveObject() ){
                            canvas.getActiveObject().set("fontStyle", newFontStyle);
                            canvas.renderAll();
                            // console.log('2');
                            socket.emit("text:edited",  {"board_id": board_id, "object": canvas.getActiveObject(), 'id':textEditId})
                        }
                        return;
                    }
                    case 3: {
                        const currentUnderline = getStyle(text,'underline');
                        const newUnderline = !currentUnderline;
                        
                        e.target.classList.toggle('text-settings__font-item_active')
                        if ( canvas.getActiveObject() ){
                            canvas.getActiveObject().set("underline", newUnderline);
                            canvas.renderAll();
                            // console.log('3');
                            socket.emit("text:edited",  {"board_id": board_id, "object": canvas.getActiveObject(), 'id':textEditId})
                        }
                        return;
                    }
                    case 4: {
                        const currentLinethrough = getStyle(text,'linethrough');
                        const newLinethrough = !currentLinethrough
                        
                        e.target.classList.toggle('text-settings__font-item_active')
                        if ( canvas.getActiveObject() ){
                            canvas.getActiveObject().set("linethrough", newLinethrough);
                            canvas.renderAll();
                            // console.log('4');
                            socket.emit("text:edited",  {"board_id": board_id, "object": canvas.getActiveObject(), 'id':textEditId})
                        }
                        return;
                    }
                }
            }
            canvas.renderAll();
        case 'BUTTON':
            if(e.target.classList.contains('setting-item__button-font-size-down')){
                newFontSizeValue-=2;
                fontSizeValue.textContent = newFontSizeValue
                if ( canvas.getActiveObject() ){
                    canvas.getActiveObject().set('fontSize', newFontSizeValue)
                }

            } else if(e.target.classList.contains('setting-item__button-font-size-up')){
                newFontSizeValue+=2;
                fontSizeValue.textContent = newFontSizeValue
                if ( canvas.getActiveObject() ){
                    canvas.getActiveObject().set('fontSize', newFontSizeValue)
                }
            }
            canvas.renderAll();
            socket.emit("text:edited",  {"board_id": board_id, "object": canvas.getActiveObject(), 'id':textEditId})
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
    if (obj && obj.selectionStart>-1) {
    //   console.log(getStyle(obj,'fontSize'));
    }
}

if ( canvas!==undefined ){
    canvas.on('text:selection:changed', onSelectionChanged);
}

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
    if ( selectedButton ){
        selectedButton.classList.remove('settings-panel__button_active');
    }

    if (!isDown) isDown = true;

    selectedButton = buttonText;
    removeEvents();
    isEditing = false;
    firstTouch = false;

    buttonText.classList.toggle('settings-panel__button_active');

    if(isDown) {
        changeObjectSelection(false);
        canvas.isDrawingMode = false;
        canvas.on('mouse:down', function(o) {
            // console.log(isEditing);
            if(!isEditing) {
                addTextField( canvas.getPointer(o.p) );
            }

        });

        canvas.on('mouse:up', function(o) {
            // console.log(o);
            if(o.target !== null){
                if(o.target.isType('i-text') && isEditing) {
                    // console.log('IT IS TEXT!!!! - 1');
                }
                else {
                    if(!firstTouch) {
                        firstTouch = true;
                    } else {
                        // console.log('NOT TEXT!!!! - 1');
                        hideTextEditPanel();
                        firstTouch = false;
                    }
                }
            } else {
                // console.log(isEditing , firstTouch);
                if(isEditing && !firstTouch) {
                    // console.log('IT IS TEXT!!!! - 2')
                    firstTouch = true;

                } else {
                    // console.log('NOT TEXT!!!! - 2');
                    // hideTextEditPanel();
                    isEditing = false;
                }
                
            }
            // console.log('mouse:up')
        });

    } else {
        canvas.isDrawingMode = false;
        textSettings.classList.remove('text-settings_active');
        changeObjectSelection(true);
        removeEvents();
    }
    
})

canvas.on('text:editing:entered', (e) => {
    // console.log(e);
    textEditId = e.target.id;
    isEditing = true
    showTextEditPanel();
    selectedFontFamily = canvas.getActiveObject().get('fontFamily');
    // console.log(textEditId,selectedFontFamily);
    selectFont(selectedFontFamily)
    isDown = true;
});

canvas.on('text:editing:exited',()=>{
    hideTextEditPanel(); 
    textEditId = false;   
    // console.log(textEditId);
})

canvas.on('text:changed',(e)=>{
    // if(e.target.isType('i-text') && textEditId) {
        socket.emit("text:edited",  {"board_id": board_id, "object": e.target, 'id':textEditId})
    // }
})

/**
 * Вставляем текст на доску
 * @param {*} text_ тект для вставки по умолчанию
 * @param {} pointer событие вставки откуда берем координаты мыши
 * @return возвращаем вставленный объект
 */
function addTextField(pointer,text_="Tap and Type"){
    textSettings.classList.add('text-settings_active');
    const text = new fabric.IText(text_, { 
        fontFamily: selectedFontFamily,
        fontSize: newFontSizeValue,
        left: pointer.x, 
        top: pointer.y,
        textDecoration: 'underline',
        editable: true,
    })
    canvas.add(text);
    socket.emit("text:added", {"board_id": board_id, "object": text});
    canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    isEditing = text.isEditing;
    return text
}