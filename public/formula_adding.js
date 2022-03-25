


const formFormulasWrapper = document.querySelector('.form-formulas__wrapper');
const buttonShowModalWindowFormulas = document.querySelector('.button__show-modal-window-formulas');
const buttonAddFormulas = document.querySelector('.button__add-formulas');
const fieldFormFormulas = document.querySelector('.form-formulas__field');
let fabric_canvas = window.canvas;
console.log(window.canvas);

buttonAddFormulas.addEventListener('click', (event) => {
    event.preventDefault();
    //formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
    let docss = document.querySelector('math-field').shadowRoot.querySelector('.ML__fieldcontainer__field');
    html2canvas(docss).then(function(canvas) {

        let image = canvas.toDataURL('image/png');
        console.log('Drew on the existing canvas',image);
        fabric.Image.fromURL(image, function(myImg) {
 //i create an extra var for to change some image properties
        var img1 = myImg.set({ left: 100, top: 100 ,width:docss.offsetWidth,height:docss.offsetHeight});
        fabric_canvas.add(img1); 
        socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": fabric_canvas.toJSON()});
        socket.emit("picture:add",fabric_canvas.toJSON());
        formFormulasWrapper.classList.remove('form-formulas__wrapper_visible');
});
    });
    
})



buttonShowModalWindowFormulas.addEventListener('click', (event) => {
    console.log('111',isDown);
    let origX, origY;
    if(isDown) {
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
    //isDown = true;
})