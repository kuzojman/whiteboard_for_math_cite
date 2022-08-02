
const openImagesModalBtn = document.querySelector('#modal_image_plugin');
openImagesModalBtn.addEventListener("click", openImagesModal );

const modalWindow = document.querySelector('#modal_window');
const modalContent = modalWindow.querySelector('.modal_content');

const closeWindow = document.querySelector('#modal_window_close');
closeWindow.addEventListener( "click", closeImagesModal );

/**
 * Открытие модального окна
 */
function openImagesModal(){
    modalWindow.classList.add("show")
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
fetch('https://jsonplaceholder.typicode.com/albums/1/photos')
.then((response) => response.json())
.then((json) => {
    for (let i = 0; i < json.length; i++) {
        const el = json[i];
        insertImageInModal(el);
    }
    console.log(json);
});