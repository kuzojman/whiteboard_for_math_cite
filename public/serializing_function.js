const serializer_dictionary_for_bezier = {
    "backgroundColor": "bc",
    "originX": "oX",
    "originY": "oY",
    "version": "v",
    "type": "t",
    "path": "p",
    "opacity": "o",
    "scaleX": "sx",
    "scaleY": "sy",
    "zoomX": "zx",
    "zoomY": "zy",
    "strokeWidth": "sw",
    "stroke": "s",
    "id": "id",
    "fill": "f",
    "strokeLineCap": "slp",
    "strokeLineJoin": "slj"
  };

const rect_and_line_add ={
    "x1":"x1",	
    "x2":"x2",	
    "y1":"y1",	
    "y2":"y2", 	
    "strokeDashArray":"sDA",	
    "transparentCorners":"tC",	
    "angle": "ae",	
    "width":"w",	
    "height":"h",	
    "top":"tp",	
    "left":"lt"
  }

const to_image_add ={
	"strokeDashOffset":"sDO",
    "strokeUniform":"sU",
    "strokeMiterLimit":"sML",
    "flipX":"fX",
    "flipY":"fY",
    "shadow":"sh",
    "visible":"vi",
    "fillRule":"fR",
    "paintFirst":"pF",
    "globalCompositeOperation":"gCO",
    "skewX":"sX",
    "skewY":"sY",
    "cropX":"cX",
    "cropY":"cY",
    "src":"sr",
    "crossOrigin": "cO",
    "filters":"fs" 
}


const to_circle_add ={
    "strokeDashOffset":"sDO",
    "strokeUniform":"sU",
    "strokeMiterLimit":"sML",
    "flipX":"fX",
    "flipY":"fY",
    "shadow":"sh",
    "visible":"vi",
    "fillRule":"fR",
    "globalCompositeOperation":"gCO",
    "radius":"rs",
    "startAngle":"sA",
    "endAngle":"eA"
}

const to_text_add ={
    "fontFamily": "fF",	
    "fontWeight": "fW",	
    "fontSize": "fS",	
    "text": "tt",	
    "underline": "ul",	
    "overline": "ol",	
    "linethrough": "lth",	
    "textAlign": "tA",	
    "fontStyle": "fSl",	
    "lineHeight": "lH",	
    "textBackgroundColor": "tBC",	
    "charSpacing": "cS",	
    "styles": "ss",	
    "direction": "d",	
    "pathStartOffset": "pSOf",	
    "pathSide": "pS",	
    "minWidth": "mW",	
    "splitByGrapheme": "sBG",
    "strokeDashOffset":"sDO",
    "strokeUniform":"sU",
    "strokeMiterLimit":"sML",
    "shadow":"sh",
    "visible":"vi",
    "fillRule":"fR",
    "globalCompositeOperation":"gCO"
}



const serializer_dictionary = {...serializer_dictionary_for_bezier,...rect_and_line_add}
const serializer_dictionary_image = {...serializer_dictionary,...to_image_add};
const serializer_dictionary_for_circle =  {...serializer_dictionary,...to_circle_add};
const serializer_dictionary_for_text =  {...serializer_dictionary,...to_text_add};
const max_dictionary ={...serializer_dictionary,...serializer_dictionary_image,...serializer_dictionary_for_circle,...serializer_dictionary_for_text};




function serialize_canvas(canvas)
{
  let result =[];
  canvas._objects.forEach(function(object)
  {
    let replaced_object ={};
    let my_dict = {};
    if(object.type=="path")
    {
      my_dict=serializer_dictionary_for_bezier;
    }
    else if(object.type=="image")
    {
      my_dict=serializer_dictionary_image;
    }
    else if(object.type=="circle")
    {
      my_dict=serializer_dictionary_for_circle;
    }
    else if(object.type=="i-text")
    {
      my_dict=serializer_dictionary_for_text;
    }
    else
    {
      my_dict=serializer_dictionary;
    }
    
    if(!object.socket_id)
    {


    for (const key in object) {

      if(my_dict[key])
      {
        
        if(typeof(object[key]) === 'number')
        {
          if(Math.abs(object[key])<3 )
          {
            object[key]=Math.trunc(object[key] * 1000) / 1000;
          }
          else
          {
            object[key]=Math.round(object[key]);
          }
        }


        //  отсчечем нулевые значения if(object[key])
        // if(typeof object[key] is number)
        //{
        //  Math.round
        //}
        replaced_object[my_dict[key]]=object[key];
      }
 //     else{
 //       replaced_object[key]=object[key]
 //     }
    }
  
    result.push(replaced_object);
  }
});
  
  console.log('new_result',result);
  return result//JSON.stringify(result);
}

function serialize_object(object)
{

    let replaced_object ={};
    let my_dict = {};
    
    if(object.type=="path")
    {
      my_dict=serializer_dictionary_for_bezier;
    }
    else if(object.type=="image")
    {
      my_dict=serializer_dictionary_image;
    }
    else if(object.type=="circle")
    {
      my_dict=serializer_dictionary_for_circle;
    }
    else if(object.type=="i-text")
    {
      my_dict=serializer_dictionary_for_text;
    }
    else
    {
      my_dict=serializer_dictionary;
    }


    for (const key in object) {

      if(my_dict[key])
      {
        
        if(typeof(object[key]) === 'number')
        {
          if(Math.abs(object[key])<3 )
          {
            object[key]=Math.trunc(object[key] * 1000) / 1000;
          }
          else
          {
            object[key]=Math.round(object[key]);
          }
        }
        replaced_object[my_dict[key]]=object[key];
      }
    }
  console.log(replaced_object);
  return replaced_object;
}


function deserialize(object) 
{
  let result = {};
  for (const key in object) 
  {
    result[get_long_property_by_short(key)]=object[key];
  }
  console.log(result)
  return result;
}

function get_long_property_by_short(short_property_name)
{
  let result;
  let dict =max_dictionary
  for (const key in dict) 
  {
    if(short_property_name==dict[key])
    {
      result = key;
    }
  }
  return result;
}




