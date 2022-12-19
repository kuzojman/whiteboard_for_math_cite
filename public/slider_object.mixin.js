(function () {
  /** SLIDER_START */
  var SliderInput = document.createElement('input');
  SliderInput.setAttribute('accept','.pdf, .ppt, .pptx')
  SliderInput.type = 'file';

  let slider_bar     = document.getElementById('slider_menu');
  let prev_btn       = slider_bar.querySelector('#slider_menu_prev_button');
  let next_btn       = slider_bar.querySelector('#slider_menu_next_button');
  let cur_slide_text = slider_bar.querySelector('#current_slide');
  let all_slide_text = slider_bar.querySelector('#all_slides');

  prev_btn.addEventListener('click', slider_prev );
  next_btn.addEventListener('click', slider_next );

  function slider_next(){
    let obj_ = canvas.getActiveObject();
    if ( obj_ && obj_.type=='slider' ){
      obj_.next();
    }    
  }

  function slider_prev(){
    let obj_ = canvas.getActiveObject();
    if ( obj_ && obj_.type=='slider' ){
      obj_.prev();
    }
  }

  /**
   * Slider class
   * для начала работа после создания объекта необходимо задать сокет @setSocket
   * @class fabric.Slider
   * @extends fabric.Image
   */
  fabric.Slider = fabric.util.createClass(
    fabric.Image,
    /** @lends fabric.Image.prototype */ {
      type: 'slider',

      /**
       * сокет, через который осуществляем все взаимодействие
       */
      socket: false,

      /**
       * Картинка, которая показывается когда добавляем слайдер на доску
       */
      default_image: "images/upload.png",

      /**
       * Готовность к загрузке презентации (пустой контейнер)
       */
      upload_ready: true,

      /**
       * Когда загрузили файл, но еще не отправили на обработку
       * т.е. тут содержится презентация/пдф, который еще не переведен в картинки
       */
      raw_file: false,  

      /**
       * картинки слайдера, которые можно листать. получаем после обработки
       */
      slider_images: [],  

      /**
       * номер выбранной картинки
       */
      current_pos: false,

      /**
       * все слайды
       */
      slides_count: 0,
      
      initialize: function (canvas) {
        this.callSuper('initialize', canvas);
        this.setSrc(this.default_image);
      },

      /**
       * следующий слайд
       */
      next: function(){
        if ( this.is_last() ){
          return;
        }
        this.current_pos+=1;
        this.refresh();
      },

      /**
       * предыдущий слайд
       */
      prev: function(){
        if ( this.is_first() ){
          return;
        }
        this.current_pos-=1;
        this.refresh();
      },

      /**
       * проверяем первый ли сейчас слайд
       * @returns 
       */
      is_first: function(){
        return this.current_pos<=0;
      },

      /**
       * проверяем последний ли сейчас слайд
       * @returns 
       */
      is_last: function(){
        return this.current_pos+1>=this.slides_count;
      },

      /**
       * Обновляем картинку
       */
      refresh: function(){
        if ( this.slides_count==0 || this.current_pos>this.slides_count ){
          return;
        }
        if ( this.slider_images[this.current_pos] ){
          this.setSrc(this.slider_images[this.current_pos]);
        }
        // обновляем текстовую информацию
        cur_slide_text.textContent=this.current_pos+1;
        all_slide_text.textContent=this.slides_count;
        // проверяем стили кнопок
        if ( this.is_first() ){
          prev_btn.classList.add('inactive')
        }else{
          prev_btn.classList.remove('inactive')
        }
        if ( this.is_last() ){
          next_btn.classList.add('inactive')
        }else{
          next_btn.classList.remove('inactive')
        }
      },

      /**
       * Выравниваем меню
       */
      alignMenu: function(){
        // anvas.vptCoords.tl.y
        let bound = this.getBoundingRect();
        // console.log(bound);
        slider_menu.style.top = (bound.top+bound.height)+'px';
        slider_menu.style.left = (bound.left)+'px';
        // this.width
        // this.x
        
      },

      /**
       * Назначаем кнопкам меню новых хозяев. Необходимо потому, что меню одно, а слайдеров может быть много
       * поэтому при выделении слайдера каждый раз надо переназначать события кнопка меню
       */
      bindMenuButton:function(this_){
        // prev_btn.removeEventListener('click',this_.prev);
        // next_btn.removeEventListener('click',this_.next);
        // prev_btn.addEventListener('click',this_.prev );
        // next_btn.addEventListener('click',this_.next );
      },

      onSelect: function(options){
        // показываем меню
        slider_bar.classList.add('active');

        if ( this.upload_ready==false ){
          return false;
        }
        SliderInput.onchange = e => { 
          var file = e.target.files[0];
          this.slider_images = [];
          this.socket.emit("slider:upload", {file:file,ftype:file.type}, (result) => {
            if ( result.error ){
              console.log(result.error);
              return;
            }
            // console.log(result.images);
            if (result.images.length){
              result.images.forEach(el => {
                // console.log(el);
                this.slider_images.push(el);
              });
              this.upload_ready = false;
              this.raw_file     = false;
              this.current_pos  = 0;
              this.slides_count = result.images.length;
              this.refresh();
            }
          });
          // console.log(file);
        }

        SliderInput.click();
      },

      onDeselect: function(){
        console.log("deselect");
        slider_bar.classList.remove('active');
      },

      onReady: function(){
        //emitted when class created and ready
      },  

      /**
       * Задаем сокет. без него загружать и обрабатывать нельзя будет
       * @param {object} _socket сокет через который будет производиться обработка данных
       */
      setSocket: function( _socket){
        this.socket = _socket;
      },  

      /**
       * Indicates that the ctx is ready and rendering can begin.
       * Used to prevent a race condition caused by {@link fabric.Image#onMouseMove} firing before {@link fabric.Image#onMouseDown} has completed
       *
       * @private
       */
      _ready: false,


      /**
        * @private
        * @param {CanvasRenderingContext2D} ctx Context to render on
        */
      _render(ctx) {
        if ( !this._ready ){
          return false;
        }
        ctx.imageSmoothingEnabled = this.imageSmoothing;
        if (this.isMoving !== true && this.resizeFilter && this._needsResize()) {
          this.applyResizeFilters();
        }
        this._stroke(ctx);
        this._renderPaintInOrder(ctx);
        console.log(this.left, this.top);
        this.alignMenu();
      },

      /**
       * Устанавливаем исходник
       * @param {string} src строка загрузки
       */
      setSrc(src) {
        this._ready = false;
        fabric.util.loadImage(src, (img)=>{
          this.setElement(img);
          this.onReady();
          this._ready = true;
        } );
      },

    }
  );

  /** SLIDER_END */

  fabric.Slider.fromObject =  function(object, callback) {
    function _callback(instance) {
      instance.setSocket(socket);
      instance.onReady = ()=>{
        canvas.requestRenderAll(); 
      }
      callback && callback(instance);
    };
    // var options = clone(object, true);
    object.points = [object.x1, object.y1, object.x2, object.y2];
    fabric.Object._fromObject('Slider', object, _callback, 'points');
  };
  // function (object, callback) {
  //   callback && callback(new fabric.Slider([object.x1, object.y1, object.x2, object.y2],object))
  //     console.log(callback, object);
  //     // object.setSocket(socket);
  //     // object.onReady = ()=>{
  //     //   canvas.requestRenderAll(); 
  //     // }
    
  // };
})();
