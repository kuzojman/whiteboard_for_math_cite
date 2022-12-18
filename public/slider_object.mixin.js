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
        console.log("next");
        _this.current_pos+=1;
        _this.refresh();
      },

      /**
       * предыдущий слайд
       */
      prev: function(){
        console.log("prev");
        _this.current_pos-=1;
        _this.refresh();
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
      },

      /**
       * Выравниваем меню
       */
      alignMenu: function(){
        // anvas.vptCoords.tl.y
        let bound = this.getBoundingRect();
        console.log(bound);
        slider_menu.style.top = (bound.top+bound.height)+'px';
        slider_menu.style.left = (bound.left)+'px';
        // this.width
        // this.x
        
      },

      /**
       * Назначаем кнопкам меню новых хозяев. Необходимо потому, что меню одно, а слайдеров может быть много
       * поэтому при выделении слайдера каждый раз надо переназначать события кнопка меню
       */
      bindMenuButton:function(){
        prev_btn.removeEventListener('click',this.prev);
        next_btn.removeEventListener('click',this.next);
        prev_btn.addEventListener('click',this.prev );
        next_btn.addEventListener('click',this.next );
      },

      onSelect: function(options){
        // показываем меню
        slider_bar.classList.add('active');
        this.bindMenuButton();

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
            if (result.images.length){
              result.images.forEach(el => {
                this.slider_images.push(el.value);
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
      }

    }
  );

  /** SLIDER_END */
})();
