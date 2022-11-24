importScripts("./modules/serialize.js", "./modules/socket.io.min.js")

/**
 * Обработка и передача данных с основного потока для сохранения
 */

// Массив (по 2 байта на символ) в строку

function ab2str(buf) {
	return String.fromCharCode.apply(null, new Uint16Array(buf));
}

self.addEventListener('message', e => {
	try {
		let str = ab2str(e.data);
		let data = str.substring(1, str.length-1);
		let board_id = str[0];
		const socket = io('http://localhost:3000',{transports:['websocket']});

		if (e.data.act === "clear") {
			socket.emit("canvas_save_to_json", {"board_id": board_id, "act": e.data.act, "canvas": {}});
		} else if (e.data.act === "update_one") {
			socket.emit("canvas_save_to_json", {"board_id": board_id, "act": e.data.act, "canvas": serialize_canvas_objects(JSON.parse(e.data.el))});
		} else if (e.data.act === "init") {
			socket.emit("canvas_save_to_json", {"board_id": board_id, "act": e.data.act, "canvas": serialize_canvas(JSON.parse(e.data.canvas))});
		} else if (/update_many/.test(str)) {
			data = str.substring(11, str.length-1);
			socket.emit("canvas_save_to_json", {"board_id": board_id, "act": e.data.act, "canvas": serialize_canvas_objects(JSON.parse(data))});
		} else {
			socket.emit("canvas_save_to_json", {
				"board_id": board_id,
				"act": "add",
				"canvas": serialize_canvas_objects(JSON.parse(data))
			});
		}

		//self.postMessage("Ok");
	} catch (err) {
		self.postMessage(err);
	}
});
