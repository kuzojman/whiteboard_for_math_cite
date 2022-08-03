
const openImagesModalBtn = document.querySelector('#modal_image_plugin');
openImagesModalBtn.addEventListener("click", openImagesModal );

const modalWindow = document.querySelector('#modal_window');
const modalContent = modalWindow.querySelector('.modal_content');

// const closeWindow = document.querySelector('#modal_window_close');
// closeWindow.addEventListener( "click", closeImagesModal );

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
    modalWindow.classList.remove("show")
}

/**
 * Вставляем картинку на панель
 * @param {*} url 
 */
function insertImageOnBoart(url){
    console.log(url);
}

/**
 * Функция вставки картинки в блок
 * @param {*} img 
 */
function insertImageInModal(img){
    let div = document.createElement('div');
    div.setAttribute('class', 'modal_image');
    div.innerHTML = `<img src="`+img.url+`" onClick="insertImageOnBoart('`+img.url+`')" />`
    modalContent.appendChild(div);
}


/**
 * Функция загрузки данных
 */
function loadDataToModel(){
    fetch('https://jsonplaceholder.typicode.com/albums/1/photos')
    .then((response) => response.json())
    .then((json) => {
        for (let i = 0; i < json.length; i++) {
            const el = json[i];
            insertImageInModal(el);
        }
        console.log(json);
    });
}


document.addEventListener('DOMContentLoaded', () => {
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
