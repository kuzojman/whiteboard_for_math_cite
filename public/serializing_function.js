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
    "fillRule": "fR",
    "paintFirst": "pf",
    "globalCompositeOperation": "gCO",
    "strokeLineCap": "slp",
    "strokeLineJoin": "slj",
    "eraser":"eraser",
    "pathOffset":"pO",
    "top":"tp",
    "left":"lt",
    "objects":"obj",
    "strokeUniform":"su",
    "strokeMiterLimit":"sml",
    "strokeDashOffset":"sdo",
    "flipX":"fX",
    "flipY":"fY",
    "visible":"vi",
    "erasable":"esbl"
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
    "left":"lt",
    "eraser":"eraser"
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
    "src":"src",
    "crossOrigin": "cO",
    "filters":"fs" ,
    "formula":"fm"
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
    "endAngle":"eA",
    "eraser":"eraser"
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
const serializer_dictionary_image = {...serializer_dictionary,...to_image_add, ...serializer_dictionary_for_bezier};
const serializer_dictionary_for_circle =  {...serializer_dictionary,...to_circle_add};
const serializer_dictionary_for_text =  {...serializer_dictionary,...to_text_add};
const max_dictionary ={...serializer_dictionary,...serializer_dictionary_image,...serializer_dictionary_for_circle,...serializer_dictionary_for_text};

function serialize_canvas(canvas)
{
    let result =[];
    if ( canvas.objects ){
        canvas.objects.forEach(function(object)
        {
            // console.log(object.toJSON());
            let replaced_object ={};
            let my_dict = {};
            if(object.type=="path")    {
                my_dict=serializer_dictionary;
            }
            else if(object.type=="image")    {
                my_dict=serializer_dictionary_image;
                // console.log(object.src);
                if ( object.formula!==undefined && object.formula!="" ){
                    replaced_object['src'] = "";
                }else{
                    replaced_object['src'] = object.src;
                }

            }
            else if(object.type=="circle")    {
                my_dict=serializer_dictionary_for_circle;
            }
            else if(object.type=="i-text")    {
                my_dict=serializer_dictionary_for_text;
            }
            else    {
                my_dict=serializer_dictionary;
            }

            if(!object.socket_id)    {
                // if(object.type=="path"){
                //   console.log();
                // }
                for (const key in object) {
                    if(my_dict[key])      {
                        if(typeof(object[key]) === 'number')        {
                            if(Math.abs(object[key])<3 )          {
                                object[key]=Math.trunc(object[key] * 1000) / 1000;
                            }
                            else          {
                                object[key]=Math.round(object[key]);
                            }
                        }

                        if (key=='eraser' && object[key]!==undefined && Object.keys(object[key]).length>0 ){
                            // console.log(object[key].toJSON());
                            replaced_object[my_dict[key]] = serialize_object(object[key].toJSON())
                            // console.log(replaced_object[my_dict[key]]);
                        }else{
                            replaced_object[my_dict[key]]=object[key];
                        }
                        // replaced_object[my_dict[key]]=object[key];
                    }
                }
                // console.log(replaced_object);
                // result.push(object.toJSON());
                // if ( object.formula!==undefined && object.formula!="" ){
                //   // console.log(replaced_object);
                // }
                result.push(replaced_object);
            }
        });
    }
    // console.log('new_result',result);
    return result//JSON.stringify(result);
}

function serialize_canvas_objects(objects)
{
    let result =[];

    for (let o in objects)
    {
        let object = objects[o]
        let replaced_object ={};
        let my_dict = {};
        if(object.type=="path")    {
            my_dict=serializer_dictionary;
        }
        else if(object.type=="image")    {
            my_dict=serializer_dictionary_image;
            if ( object.formula!==undefined && object.formula!="" ){
                replaced_object['src'] = "";
            }else{
                replaced_object['src'] = object.src;
            }

        }
        else if(object.type=="circle")    {
            my_dict=serializer_dictionary_for_circle;
        }
        else if(object.type=="i-text")    {
            my_dict=serializer_dictionary_for_text;
        }
        else    {
            my_dict=serializer_dictionary;
        }

        if(!object.socket_id)    {
            for (const key in object) {
                if(my_dict[key])      {
                    if(typeof(object[key]) === 'number')        {
                        if(Math.abs(object[key])<3 )          {
                            object[key]=Math.trunc(object[key] * 1000) / 1000;
                        }
                        else          {
                            object[key]=Math.round(object[key]);
                        }
                    }

                    if (key=='eraser' && object[key]!==undefined && Object.keys(object[key]).length>0 ){
                        // console.log(object[key].toJSON());
                        replaced_object[my_dict[key]] = serialize_object(object[key].toJSON())
                        // console.log(replaced_object[my_dict[key]]);
                    }else{
                        replaced_object[my_dict[key]]=object[key];
                    }
                }
            }
            result.push(replaced_object);
        }
    }

    return result;
}

function serialize_object(object)
{

    let replaced_object ={};
    let my_dict = {};

    if(object.type=="path" || object.type=="eraser")
    {
        my_dict=serializer_dictionary;
    }
    else if(object.type=="image")
    {
        my_dict=serializer_dictionary_image;
        if ( object.formula!==undefined && object.formula!="" ){
            // console.log(replaced_object);
        }else{
            replaced_object['src']=object.getSrc()
        }
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

    // if (key=='objects'){
    // console.log();
    // }
    for (const key in object) {
        // console.log(key);
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
            if (key=='objects'){
                replaced_object[my_dict[key]] = []
                if ( object[key].length>0 ){
                    for (const item in object[key]) {
                        replaced_object[my_dict[key]].push( serialize_object(object[key][item]) )
                    }
                }
            }else{
                if (key=='eraser'&& object[key]!==undefined && Object.keys(object[key]).length>0 ){
                    replaced_object[my_dict[key]] = serialize_object(object[key].toJSON())
                }else{
                    replaced_object[my_dict[key]]=object[key];
                }
            }
        }
    }
    // console.log(replaced_object);
    return replaced_object;
}


function deserialize(object)
{
    let result = {};
    for (const key in object)
    {
        if ( key=='src' ){
            result['src'] = object['src'];
        }else{
            if (  key=='eraser' ){
                result[get_long_property_by_short(key)]=deserialize(object[key]);
            }else if ( key=='obj'){
                result[get_long_property_by_short(key)] = []
                if ( object[key].length>0 ){
                    for (const item in object[key]) {
                        result[get_long_property_by_short(key)].push( deserialize(object[key][item]) )
                    }
                }
            } else {
                result[get_long_property_by_short(key)]=object[key];
            }
        }
    }
    // console.log(result);
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




