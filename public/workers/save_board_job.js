
/**
 * Обработка и передача данных с основного потока для сохранения
 */

self.addEventListener('message', e => {
	try {
		const socket = io('http://localhost:3000',{transports:['websocket']});

		socket.emit("canvas_save_to_json", {
			"board_id": e.data.board_id,
			"canvas": serialize_canvas(JSON.parse(e.data.canvas))
		});
		//self.postMessage("Ok");
	} catch (err) {
		self.postMessage(err);
	}
});
