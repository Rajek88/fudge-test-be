import { WebSocketServer } from './src';

// env for setup
export interface Env {
	DB: D1Database;
	API_SALT: string;
	WEBSOCKET_SERVER: DurableObjectNamespace<WebSocketServer>;
	FE_BASE: string;
}
