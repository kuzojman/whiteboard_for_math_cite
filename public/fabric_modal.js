import { fabricGif } from "./fabricGif.js";

const openImagesModalBtn = document.querySelector('#modal_image_plugin');
openImagesModalBtn.addEventListener("click", openImagesModal );

const modalWindow = document.querySelector('#modal_window');
const modalContent = modalWindow.querySelector('.modal_content');
const modalList = modalWindow.querySelector('#modal_list');

// const closeWindow = document.querySelector('#modal_window_close');
// closeWindow.addEventListener( "click", closeImagesModal );

let simpleJson = {
  data:[
    {
      title:'Математика',
      icon:'fa-square-root-variable',
      images:[
        'https://media1.giphy.com/media/i33719vyOjNYI/giphy.gif?cid=ecf05e47mfu21495ggkvcbstb1g3jvoic32l5bj7reyzt0rx&rid=giphy.gif&ct=g',
        'https://media4.giphy.com/media/119pLwyWg8ScTK/giphy.gif?cid=ecf05e47xfzha64o895nsmu0m60fjunfpr1hh6x2nur90gj7&rid=giphy.gif&ct=g',
        'https://via.placeholder.com/250.gif/09f/fff',
        'https://hot_data_kuzovkin_info_private.hb.bizmrg.com/photo_to_board/physics/solid_liquid.gif',
        'https://hot_data_kuzovkin_info_private.hb.bizmrg.com/photo_to_board/physics/electricity-physics.gif',
        'https://hot_data_kuzovkin_info_private.hb.bizmrg.com/photo_to_board/physics/diffusion.gif'
      ]
    },
    {
      title:'Физика',
      icon:'fa-atom',
      images:[
        'https://hot_data_kuzovkin_info_private.hb.bizmrg.com/photo_to_board/physics/inertnost.png',
        'https://www.fillmurray.com/640/361',
        'https://www.fillmurray.com/640/261',
        'https://www.fillmurray.com/540/461',
        'https://www.fillmurray.com/440/361',
        'https://www.fillmurray.com/340/261',
      ]
    },
  ]
}

/**
 * Открытие модального окна
 */
function openImagesModal(){
    // modalWindow.classList.add("show");
    loadDataToModel();
}

/**
 * Закрытие
 */
function closeImagesModal(){
  closeAllModals();
}

/**
 * Вставляем картинку на панель
 * @param {*} url 
 */
window.insertImageOnBoard = function (url, noemit=false, id=false, params=false){
  // console.log(url.indexOf('/download/'));
  if (url.indexOf('/download/')!==0 ){
    url = "/download/"+window.btoa(url)
  }
    fabric.Image.fromURL(url, function(myImg) {

      if (url.toLowerCase().match(/\.(gif)/g)){
        fabricGif(
          url,
          200,
          200
        ).then( function(gif){
          gif['src'] = url;
          if ( id!==false ){
            gif['id'] = id;
          }
          if ( gif.error===undefined ) {
            // gif.set({ top: 50, left: 50 });
            canvas.add(gif).setActiveObject(gif);
            if ( takedFirstData==false ){
              gif.set({ selectable: false })
              decreaseRecievedObjects()
            }
            // перемещаем объект куда надо
            if ( params!==false ){
              gif.set({
                top: params.top, //+object.object.top,
                left: params.left, //+object.object.left
                angle: params.angle,
                scaleX: params.scaleX,
                scaleY: params.scaleY,
                erasable: params.erasable,
                eraser: params.eraser,
              });
            }else{
              setObjectToCanvasCenter(gif)
            }
            gif.play();
            canvas.discardActiveObject(gif)
            fabric.util.requestAnimFrame(function render() {
              canvas.renderAll();
              fabric.util.requestAnimFrame(render);
            });
            
            if (noemit==false){
              socket.emit("image:add", {src: url, id_of: gif.id});
              socket.emit("canvas_save_to_json", {"board_id": get_board_id(), "canvas": serialize_canvas(canvas)});
            }
          }
        } )
        
        return;
      }      
      myImg.crossOrigin = 'anonymous'
      myImg['src'] =  url;
      if ( id!==false ){
        myImg['id'] = id;
      }

      if ( takedFirstData==false ){
        myImg.set({ selectable: false })
        decreaseRecievedObjects()
      }      
      canvas.add(myImg)
      // перемещаем объект куда надо
      if ( params!==false ){
        myImg.set({
          top: params.top, //+object.object.top,
          left: params.left, //+object.object.left
          angle: params.angle,
          scaleX: params.scaleX,
          scaleY: params.scaleY,
          erasable: params.erasable,
          eraser: params.eraser,
        });
      }else{
        setObjectToCanvasCenter(myImg)
      }
      canvas.setActiveObject(myImg).renderAll(); 
      // console.log({src: url, id_of: myImg.id});
      if (noemit==false){
        socket.emit("image:add", {src: url, id_of: myImg.id});
      }
      // canvas.add(img)
    });
    
    closeAllModals();
    moveCursorsToFront = true;
}

/**
 * Функция вставки картинки в блок
 * @param {*} img 
 * @param content - блок, в который будет вставляться картинка
 */
function insertImageInModal(img,content){
    let div = document.createElement('div');
    div.setAttribute('class', 'modal_image');
    div.innerHTML = `<img src="`+img+`" onClick="insertImageOnBoard('`+img+`')" />`
    content.appendChild(div);
}

/**
 * Функция смены таба
 * @param {Object} e событие клика на кнопку
 */
function changeTab(e){
  hideAllTabs();
  let target_ = e.currentTarget.dataset.target;
  e.currentTarget.classList.add('is-active');
  modalContent.querySelector('#'+target_).classList.add('is-active')
}

/**
 * Скрываем все табы и контент
 */
function hideAllTabs(){
  let items = modalContent.querySelectorAll('.modalcontent_item');
  for (let i = 0; i < items.length; i++) {
    const element = items[i];
    element.classList.remove('is-active')    
  }

  let tabs = modalList.querySelectorAll('li');
  for (let i = 0; i < tabs.length; i++) {
    const element = tabs[i];
    element.classList.remove('is-active')    
  }
}

/**
 * Функция загрузки данных
 */
function loadDataToModel(){
  // url с которого будем брать список картинок
  let fetchUrl = 'https://jsonplaceholder.typicode.com/albums/1/photos';
  fetch(fetchUrl)
  .then((response) => response.json())
  .then((json) => {
    if ( simpleJson.data!==undefined && simpleJson.data.length>0 ){
      // reset content
      modalList.innerHTML = '';
      modalContent.innerHTML = '';
      for (let i = 0; i < simpleJson.data.length; i++) {
        const el = simpleJson.data[i];
        let li_ = document.createElement('li');
        let target_name_ = 'modalitem-'+i;
        // если первый элемент - делаем его активным
        if ( i==0 ){
          li_.classList.add('is-active');
        }
        li_.dataset.target = target_name_;
        li_.addEventListener('click',changeTab);
        li_.innerHTML = `<a ><span class="is-small"><i class="fas `+el.icon+` mr-2" aria-hidden="true"></i></span><span>`+el.title+`</span></a>`;

        let content_ = document.createElement('div');
        content_.classList.add('modalcontent_item');
        content_.id=target_name_;
        if ( i==0 ){
          content_.classList.add('is-active');
        }

        // проходимся по картинкам
        for (let j = 0; j < el.images.length; j++) {
          const img_ = el.images[j];
          insertImageInModal(img_,content_);
        }
        modalList.appendChild(li_);
        modalContent.appendChild(content_);
    }
  }
  });
}

// Functions to open and close a modal
function openModal($el) {
  $el.classList.add('is-active');
}

function closeModal($el) {
  $el.classList.remove('is-active');
}

function closeAllModals() {
  (document.querySelectorAll('.modal') || []).forEach(($modal) => {
    closeModal($modal);
  });
}

document.addEventListener('DOMContentLoaded', () => {
    
  
    // Add a click event on buttons to open a specific modal
    (document.querySelectorAll('.js-modal-trigger') || []).forEach(($trigger) => {
      const modal = $trigger.dataset.target;
      const $target = document.getElementById(modal);
  
      $trigger.addEventListener('click', () => {
        openModal($target);
      });
    });
  
    // Add a click event on various child elements to close the parent modal
    (document.querySelectorAll('.modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot .button') || []).forEach(($close) => {
      const $target = $close.closest('.modal');
  
      $close.addEventListener('click', () => {
        closeModal($target);
      });
    });
  
    // Add a keyboard event to close all modals
    document.addEventListener('keydown', (event) => {
      const e = event || window.event;
  
      if (e.keyCode === 27) { // Escape key
        closeAllModals();
      }
    });
  });

  export default {openImagesModal,    closeImagesModal,     insertImageOnBoard,     insertImageInModal,     changeTab,     hideAllTabs,     loadDataToModel,     openModal,     closeModal,     closeAllModals } 