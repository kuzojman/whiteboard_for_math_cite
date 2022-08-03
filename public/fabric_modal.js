
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
        'https://via.placeholder.com/300.png/09f/fff',
        'https://via.placeholder.com/200.jpg/09f/fff',
        'https://via.placeholder.com/250.gif/09f/fff',
      ]
    },
    {
      title:'Физика',
      icon:'fa-atom',
      images:[
        'https://www.fillmurray.com/640/461',
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
function insertImageOnBoart(url){
    fabric.Image.fromURL(url, function(myImg) {
      canvas.add(myImg); 
    });
    closeAllModals();
}

/**
 * Функция вставки картинки в блок
 * @param {*} img 
 * @param content - блок, в который будет вставляться картинка
 */
function insertImageInModal(img,content){
    let div = document.createElement('div');
    div.setAttribute('class', 'modal_image');
    div.innerHTML = `<img src="`+img+`" onClick="insertImageOnBoart('`+img+`')" />`
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
