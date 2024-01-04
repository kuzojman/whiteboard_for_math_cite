import 'dotenv/config';

import { initExpressApp } from './public/js/express_app.js';
import { initdb, db_client } from './public/js/database/db.js';
import { createSocketServer } from './public/js/socket_io.js';
import protobuf from 'protobufjs';
import jsonDescriptor from './public/awesome.json' assert { type: "json" }; // exemplary for node
import { port } from './public/js/envs.js';


const witeboardServiceHost = encodeURIComponent(process.env.WITEBOARD_SERVICE_HOST);
const { server } = initExpressApp(witeboardServiceHost);
var root = protobuf.Root.fromJSON(jsonDescriptor);
let boards_schema = root.lookupType('awesomepackage.AwesomeMessage');
// let pathOffset_schema = root.lookupType('awesomepackage.pathOffset');
let buf_encoded = boards_schema.encode({ board_id: 123, bc: '#ffff' }).finish();
let buf_decoded = boards_schema.decode(buf_encoded);

initdb();

createSocketServer(server, db_client);

server.listen(port, () => {
  console.log(`Server running at port ${port}`);
});
