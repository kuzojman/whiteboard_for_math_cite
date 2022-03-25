
const buttonNoGrid = document.querySelector('.grid-panel__item-no-grid');
const buttonUsualGrid = document.querySelector('.grid-panel__item-usual-grid');
const buttonTriangularGrid = document.querySelector('.grid-panel__item-triangular-grid');


buttonNoGrid.addEventListener('click', () => {
  canvas.setBackgroundColor(null, canvas.renderAll.bind(canvas))
})

buttonUsualGrid.addEventListener('click', () => {
  canvas.setBackgroundColor({
      source: pathUsualGrid,
      repeat: 'repeat',
      scaleX: 1,
      scaleY: 1
  }, canvas.renderAll.bind(canvas));
})

buttonTriangularGrid.addEventListener('click', () => {
  canvas.setBackgroundColor({
      source: pathTriangularGrid,
      repeat: 'repeat',
      scaleX: 1,
      scaleY: 1
  }, canvas.renderAll.bind(canvas));
})

