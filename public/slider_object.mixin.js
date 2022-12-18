(function () {
  /** SLIDER_START */
  var SliderInput = document.createElement('input');
  SliderInput.setAttribute('accept','.pdf, .ppt, .pptx')
  SliderInput.type = 'file';

  let slider_bar         = document.getElementById('slider_menu');
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

      recursionCount: 0,
      
      initialize: function (canvas,options) {
        options || (options = {});
        this.callSuper('initialize', canvas);
        options && Object.keys(options).length != 0 && 
        this.set('upload_ready', options.upload_ready) &&
        this.set('raw_file', options.raw_file) &&
        this.set('slider_images', options.slider_images) &&
        this.set('current_pos', options.current_pos) &&
        this.set('slides_count', options.slides_count)
        if ( !this.current_pos ){
          this.current_pos=false;
        }
        if ( !this.slides_count ){
          this.slides_count=0;
        };
        if ( this.upload_ready ){
          this.current_pos=false;
          this.slides_count=0;
          this.setSrc(this.default_image);
        }
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
        this.saveState();
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
        this.saveState();
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
        // console.log(this.current_pos, this.slides_count);
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
        this.alignMenu();
      },

      /**
       * Выравниваем меню
       */
      alignMenu: function(){
        // anvas.vptCoords.tl.y
        let bound = this.getBoundingRect();
        // console.log(this.left, this.top, this.getWidth(), this.getHeight());
        if ( bound.top==0 && bound.left==0 ){
          slider_menu.style.top = (this.top+this.getHeight())+'px';
          slider_menu.style.left = (this.left)+'px';
        }else{
          slider_menu.style.top = (bound.top+bound.height)+'px';
          slider_menu.style.left = (bound.left)+'px';
        }
        
        // this.width
        // this.x
        
      },

      /**
       * Назначаем кнопкам меню новых хозяев. Необходимо потому, что меню одно, а слайдеров может быть много
       * поэтому при выделении слайдера каждый раз надо переназначать события кнопка меню
       */
      bindMenuButton:function(this_){
        // pass
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
              console.error(result.error);
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
              // сохраняем состояние
              this.saveState();
            }
          });
        }

        SliderInput.click();
      },

      onDeselect: function(){
        // console.log("deselect");
        slider_bar.classList.remove('active');
      },

      /**
       * функция разрушения удаления объекта
       */
      destroy: function(){
        this.onDeselect();
        return;
      },

      /**
       * Передаем статус в сокет и сохраняем состояние заодно
       */
      saveState: function(){
        if (this.socket){
          this.socket.emit("slider:change", {'object':this, "id":this.id});
        }
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
        // после того как задаем сокет - сразу же подключаемся к его событию
        // по этому событию передается вся информация с других досок
        this.socket.on("slider:change", (obj_)=>{
          if ( obj_.id==this.id ){
            this.set('upload_ready', obj_.object.upload_ready) &&
            this.set('raw_file', obj_.object.raw_file) &&
            this.set('slider_images', obj_.object.slider_images) &&
            this.set('current_pos', obj_.object.current_pos) &&
            this.set('slides_count', obj_.object.slides_count)
            this.refresh();
            // this.setSrc(obj_.src)
          }
        });        
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
        // console.log(this);
        this.alignMenu();
      },

      /**
       * Устанавливаем исходник
       * @param {string} src строка загрузки
       */
      setSrc(src) {
        this._ready = false;
        let old_pos = {left:this.left, top:this.top};
        // console.log(this.left, this.top, this.getWidth(), this.getHeight());
        fabric.util.loadImage(src, (img)=>{
          this.setElement(img);
          this.onReady();
          this._ready = true;
          this.canvas && this.canvas.requestRenderAll();
          if ( old_pos.left!==this.left || old_pos.top!==this.top ){
            this.set('left',old_pos.left);
            this.set('top',old_pos.top);
          }
          // console.log(this.left, this.top, this.getWidth(), this.getHeight());
          this.alignMenu();
        } );
      },
      /**
        * Returns an object representation of an instance
        * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
        * @return {Object} Object representation of an instance
        */
        toObject: function (propertiesToInclude) {
          // console.log(this.callSuper('toObject', ['socket','upload_ready','raw_file','slider_images','current_pos','slides_count'].concat(propertiesToInclude)));
          return this.callSuper('toObject', ['upload_ready','raw_file','slider_images','current_pos','slides_count'].concat(propertiesToInclude));
        },
    }
  );

  /** SLIDER_END */

  fabric.Slider.fromObject =  function(object, callback) {
    // var options = fabric.util.object.clone(object, true);
    // delete options.objects;
    // console.log(object);
    return fabric.Object._fromObject('Slider', object, function(instance) {
      // textInstance.styles = fabric.util.stylesFromArray(object.styles, object.text);
      // instance.canvas = canvas;
      instance.left = object.left;
      instance.top = object.top;
      instance.id = object.id;
      instance.upload_ready = object.upload_ready;
      instance.raw_file = object.raw_file;
      instance.slider_images = object.slider_images;
      instance.current_pos = object.current_pos;
      instance.slides_count = object.slides_count;
      instance.refresh();
      callback(instance);
    }, 'slider');
  };

})();
