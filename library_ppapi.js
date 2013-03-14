var ppapi_exports = {
  $ppapi_glue: {
    PP_Var: Runtime.generateStructInfo([
      ['i32', 'type'],
      ['i32', 'padding'],
      ['i64', 'value'],
    ]),
    PP_VARTYPE_BOOL: 2,
    PP_VARTYPE_STRING: 5,

    stringForVar: function(p) {
      var o = ppapi_glue.PP_Var;
      var type = {{{ makeGetValue('p + o.type', '0', 'i32') }}};
      if (type != ppapi_glue.PP_VARTYPE_STRING)
        throw "PP_Var is not a string.";
      var uid = {{{ makeGetValue('p + o.value', '0', 'i32') }}};
      return resources.resolve(uid).value;
    },

    boolForVar: function(p) {
      var o = ppapi_glue.PP_Var;
      var type = {{{ makeGetValue('p + o.type', '0', 'i32') }}};
      if (type != ppapi_glue.PP_VARTYPE_BOOL)
        throw "PP_Var is not a Boolean.";
      // PP_Bool is guarenteed to be 4 bytes.
      var value = {{{ makeGetValue('p + o.value', '0', 'i32') }}};
      return value > 0;
    },

    jsForVar: function(p) {
	var o = ppapi_glue.PP_Var;
	var type = {{{ makeGetValue('p + o.type', '0', 'i32') }}};

        if (type == 0) {
	    return undefined;
        } else if (type == 1) {
	    return null;
        } else if (type == ppapi_glue.PP_VARTYPE_BOOL) {
	    // PP_Bool is guarenteed to be 4 bytes.
	    return 0 != {{{ makeGetValue('p + o.value', '0', 'i32') }}};
        } else if (type == 3) {
	    return {{{ makeGetValue('p + o.value', '0', 'i32') }}};
        } else if (type == 4) {
	    return {{{ makeGetValue('p + o.value', '0', 'double') }}};
	} else if (type == ppapi_glue.PP_VARTYPE_STRING) {
	    var uid = {{{ makeGetValue('p + o.value', '0', 'i32') }}};
	    return resources.resolve(uid).value;
	} else {
	    throw "Var type conversion not implemented: " + type;
        }
    },
    convertCompletionCallback: function(callback) {
      // Assumes 4-byte pointers.
      var func = {{{ makeGetValue('callback + 0', '0', 'i32') }}};
      var user_data = {{{ makeGetValue('callback + 4', '0', 'i32') }}};
      // TODO correct way to call?
      return function(result) { FUNCTION_TABLE[func](user_data, result); };
    },
    setRect: function(rect, ptr) {
	{{{ makeSetValue('ptr', '0', 'rect.x', 'i32') }}};
	{{{ makeSetValue('ptr + 4', '0', 'rect.y', 'i32') }}};
	{{{ makeSetValue('ptr + 8', '0', 'rect.width', 'i32') }}};
	{{{ makeSetValue('ptr + 12', '0', 'rect.height', 'i32') }}};
    },
    getSize: function(ptr) {
	return {
	    width: {{{ makeGetValue('ptr', '0', 'i32') }}},
	    height: {{{ makeGetValue('ptr + 4', '0', 'i32') }}}
	};
    },
    getPos: function(ptr) {
	return {
	    x: {{{ makeGetValue('ptr', '0', 'i32') }}},
	    y: {{{ makeGetValue('ptr + 4', '0', 'i32') }}}
	};
    },
  },

  GetBrowserInterface: function(interface_name) {
      return interfaces[Pointer_stringify(interface_name)]|0;
  },

  Schedule: function(f, p0, p1) {
      setTimeout(function() {
	  _RunScheduled(f, p0, p1);
      }, 0);
  },

  ThrowNotImplemented: function() {
      throw "NotImplemented";
  },

    Graphics2D_Create: function(instance, size_ptr, is_always_opaque) {
	var size = ppapi_glue.getSize(size_ptr);
	var canvas = document.createElement('canvas');
	canvas.width = size.width;
	canvas.height = size.height;
	var resource = resources.register("graphics_2d", {
	    size: size,
	    canvas: canvas,
	    ctx: canvas.getContext('2d'),
	    always_opaque: true,
	    destroy: function() {
		throw "Canvas destroy not implemented.";
            }
	});
	return resource;
    },
    Graphics2D_IsGraphics2D: function(resource) {
	return resources.is(resource, "graphics_2d");
    },
    Graphics2D_Describe: function(resource, size_ptr, is_always_opqaue_ptr) {
	NotImplemented;
    },
    Graphics2D_PaintImageData: function(resource, image_data, top_left_ptr, src_rect_ptr) {
        var g2d = resources.resolve(resource);

	var res = resources.resolve(image_data);
	res.image_data.data.set(res.view);

	var top_left = ppapi_glue.getPos(top_left_ptr);
        g2d.ctx.putImageData(res.image_data, top_left.x, top_left.y);
    },
    Graphics2D_Scroll: function(resource, clip_rect_ptr, amount_ptr) {
	NotImplemented;
    },
    Graphics2D_ReplaceContents: function(resource, image_data) {
	NotImplemented;
    },
    Graphics2D_Flush: function(resource, callback) {
	// Ignore
	// TODO vsync
	var c = ppapi_glue.convertCompletionCallback(callback);
	setTimeout(function() {
	    c(ppapi.PP_Error.PP_OK);
	}, 15);
	return ppapi.PP_Error.PP_OK;
   },


    ImageData_GetNativeImageDataFormat: function() {
	NotImplemented;
    },
    ImageData_IsImageDataFormatSupported: function(format) {
	NotImplemented;
    },
    ImageData_Create: function(instance, format, size_ptr, init_to_zero) {
	var size = ppapi_glue.getSize(size_ptr);
	var bytes = size.width * size.height * 4
        var memory = _malloc(bytes);
        // Note: "buffer" is an implementation detail of Emscripten and is likely not a stable interface.
        var view = new Uint8ClampedArray(buffer, memory, bytes);
        // Due to limitations of the canvas API, we need to create an intermediate "ImageData" buffer.
        // HACK for creating an image data without having a 2D context available.
        var c = document.createElement('canvas');
        var ctx = c.getContext('2d')
	var image_data = ctx.createImageData(size.width, size.height);

	var uid = resources.register("image_data", {
            format: format,
            size: size,
            memory: memory,
            view: view,
            image_data: image_data,
            destroy: function() {
                throw "Destroying image data not implemented!";
            }
	});
	return uid;
    },
    ImageData_IsImageData: function (image_data) {
	return resources.is("image_data", image_data);
    },
    ImageData_Describe: function(image_data, desc_ptr) {
	//if (!resources.is("image_data", image_data)) return 0;

	var res = resources.resolve(image_data);
	{{{ makeSetValue('desc_ptr + 0', '0', 'res.format', 'i32') }}};
	{{{ makeSetValue('desc_ptr + 4', '0', 'res.size.width', 'i32') }}};
	{{{ makeSetValue('desc_ptr + 8', '0', 'res.size.height', 'i32') }}};
	{{{ makeSetValue('desc_ptr + 12', '0', '(res.size.width*4)', 'i32') }}};
	return 1;
    },
    ImageData_Map: function(image_data) {
	return resources.resolve(image_data).memory;
    },
    ImageData_Unmap: function(image_data) {
	// Ignore
    },
};


autoAddDeps(ppapi_exports, '$ppapi_glue');
mergeInto(LibraryManager.library, ppapi_exports);
