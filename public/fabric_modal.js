import {fabricGif} from "./fabricGif.js";

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

async function  getImgContentType (url) {
  return await fetch(url, { method: 'HEAD'})
    .then(response => {
      return response.headers.get('Content-type')
    })
}

/**
 * Добавление gif картинки
 * @param ab - ArrayBuffer с данными
 * @param url - свойство "image.src"
 */

async function createGif(ab, url, id = false, params = false)
{
    if (!(window.loaded[url] && window.loaded[url]["img"])) {
      // Первичная загрузка
      // Создание спрайта из гифки вынесено в ./workers/decompress_gif_job.js
      // и происходит в отдельном потоке
      let _worker = new Worker("./workers/decompress_gif_job.js")

      if (ab.byteLength !== 0) {
        _worker.postMessage(ab, [ab])
      }

      _worker.onmessage = async (e) => {
        let data = e.data.data
        let gif = await fabricGif(data.dataUrl, data.delay, data.frameWidth, data.framesLength)

        gif['src'] = url
        if ( id!==false ){
          gif['id'] = id;
        }

        gif.play()
        canvas.add(gif).setActiveObject(gif)

        if ( params!==false ){
          gif.set({
            top: params.top,
            left: params.left,
            angle: params.angle,
            scaleX: params.scaleX,
            scaleY: params.scaleY,
            erasable: params.erasable,
            eraser: params.eraser,
          });
        }else{
          setObjectToCanvasCenter(gif)
        }

        fabric.util.requestAnimFrame(function render() {
          canvas.requestRenderAll();
          fabric.util.requestAnimFrame(render);
        });

        window.loaded[url] = {
          "img": gif,
          "dataUrl": data.dataUrl,
          "delay": data.delay,
          "frameWidth": data.frameWidth,
          "framesLength": data.framesLength,
          "ab": ab,
          "url": url,
          "type": "gif",
        }
    }
  } else {
      // Загрузка из буфера
      let dataUrl = window.loaded[url]["dataUrl"]
      let delay = window.loaded[url]["delay"]
      let frameWidth = window.loaded[url]["frameWidth"]
      let framesLength = window.loaded[url]["framesLength"]

      let gif = await fabricGif(dataUrl, delay, frameWidth, framesLength)

      gif['src'] = url
      if ( id!==false ){
        gif['id'] = id;
      }

      gif.play()
      canvas.add(gif).setActiveObject(gif)

      if ( params!==false ){
        gif.set({
          top: params.top,
          left: params.left,
          angle: params.angle,
          scaleX: params.scaleX,
          scaleY: params.scaleY,
          erasable: params.erasable,
          eraser: params.eraser,
        });
      }else{
        setObjectToCanvasCenter(gif)
      }

      fabric.util.requestAnimFrame(function render() {
        canvas.requestRenderAll();
        fabric.util.requestAnimFrame(render);
      });
    }
}

// Здесь сохраняются уже скачанные изображения
window.loaded = {}

/**
 * Загрузка изображений в буфер
 */

window.preloadImage = async function (url, noemit=false, id=false, params=false) {
  if (url.indexOf('/download/') !== 0) {
    url = "/download/" + window.btoa(url)
  }

  return getImgContentType(url).then(async t => {
      return fetch(url)
          .then(r => r.arrayBuffer())
          .then(async  buffer => {
            const blob = new Blob([buffer]);
            const file = new File([blob], url)

            if (t.indexOf('gif')!==-1) {
              return await createGif(buffer, url, id, params).then(() =>{
                return true
              })
            } else {
              let img = new fabric.Image(file)
              img['src'] = url;

              img.crossOrigin = 'anonymous'
              if (id !== false) {
                img['id'] = id;
              }

              // перемещаем объект куда надо
              if (params !== false) {
                img = params;
              }

              return window.loaded[url] = {
                img: img,
                ab: buffer,
                url: url,
              }
            }
          });
    })
}

/**
 * Добавление картинок из буфера window.loaded
 */

window.insertImageOnBoard = async function (url, noemit=false, id=false, params=false){
  if (url.indexOf('/download/') !== 0) {
    url = "/download/" + window.btoa(url)
  }

  if (window.loaded[url]) {
    let img = window.loaded[url]["img"]

    // перемещаем объект куда надо
    if (params !== false) {
      img = params;
    } else {
      setObjectToCanvasCenter(img)
    }

    canvas.add(img)
    canvas.setActiveObject(img).requestRenderAll();

    if (noemit == false) {
      socket.emit("image:add", {src: url, id_of: img.id});
    }
  }
}

window.insertImgInTab = async (img) => {
  let loaded = await window.preloadImage(img)
  if (loaded !== true) {
     window.insertImageOnBoard(loaded["url"], true)
  } else {
    socket.emit("canvas_save_to_json", {"board_id": board_id, "canvas": serialize_canvas(canvas)});
  }
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
    div.innerHTML = `<img src="`+img+`" onClick="insertImgInTab('`+img+`')" />`
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