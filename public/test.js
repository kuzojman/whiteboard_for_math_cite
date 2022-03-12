const inputChangeColor = document.querySelector('.sub-tool-panel__item-list-color-selection > input');
const subToolPanel = inputChangeColor.closest('.sub-tool-panel');

const handleClickOpenInputChangeColor = () => {
    subToolPanel.classList.add('sub-tool-panel_visible');
}
const handleClickCloseInputChangeColor = (event) => {
    if (event.target !== inputChangeColor) {
        subToolPanel.classList.remove('sub-tool-panel_visible');
    }
}


window.addEventListener('click', handleClickCloseInputChangeColor);
inputChangeColor.addEventListener('click', handleClickOpenInputChangeColor);