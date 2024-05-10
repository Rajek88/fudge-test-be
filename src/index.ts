import { IRequest, Router, cors, json, withContent } from 'itty-router';
import { DurableObject } from 'cloudflare:workers';
import {
	checkInvitationAndAddUserToTeam,
	getAllInvitations,
	getAllUsers,
	getTeamMembers,
	inviteUserToTeam,
	loginUser,
	registerUser,
} from './controllers/UserController';
import { Env } from '../worker-configuration';
import { validateToken } from './middlewares/Auth';

// get preflight and corsify pair
const { preflight, corsify } = cors();

const router = Router<IRequest, [Env, ExecutionContext]>({
	// Hint: You can add middleware here (e.g. to add response headers to every response)
	before: [preflight], // add preflight upstream
	finally: [corsify], // and corsify downstream
});

router.all('/example', async (req) => {
	return json({ message: 'Hello, World!' });
});

// get all users
router.get('/user/getAll', getAllUsers);

// register new user
router.post('/user/register', registerUser);

// register new user
router.post('/user/login', loginUser);

// invite user
router.post('/admin/inviteUser', inviteUserToTeam);

// get all invitations
router.get('/admin/getAllInvitations', getAllInvitations);

// accept invitation
router.get('/user/acceptInvitation', validateToken, checkInvitationAndAddUserToTeam);

// getTeamMembers
router.get('/user/getTeamMembers', validateToken, getTeamMembers);

// fallback
router.all('*', async (req) => {
	return json({ error: 'Not found' }, { status: 404 });
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// websocket code
		const url = new URL(request.url).hostname + new URL(request.url).pathname;
		if (url.endsWith('/websocket')) {
			// Expect to receive a WebSocket Upgrade request.
			// If there is one, accept the request and return a WebSocket Response.
			const upgradeHeader = request.headers.get('Upgrade');
			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				return new Response('Durable Object expected Upgrade: websocket', { status: 426 });
			}

			// This example will refer to the same Durable Object instance
			let id = env.WEBSOCKET_SERVER.idFromName('live-users');
			let stub = env.WEBSOCKET_SERVER.get(id);

			return stub.fetch(request);
		}

		// normal code
		return router.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;

// Durable Object
export class WebSocketServer extends DurableObject {
	currentlyConnectedWebSockets: number;
	// create an hashmap of live users
	currentlyLiveUsers: {
		[key: string]: boolean;
	};

	constructor(ctx: DurableObjectState, env: Env) {
		// This is reset whenever the constructor runs because
		// regular WebSockets do not survive Durable Object resets.
		//
		// WebSockets accepted via the Hibernation API can survive
		// a certain type of eviction, but we will not cover that here.
		super(ctx, env);
		this.currentlyConnectedWebSockets = 0;
		this.currentlyLiveUsers = {};
	}

	async fetch(request: Request): Promise<Response> {
		// Creates two ends of a WebSocket connection.
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		// Calling `accept()` tells the runtime that this WebSocket is to begin terminating
		// request within the Durable Object. It has the effect of "accepting" the connection,
		// and allowing the WebSocket to send and receive messages.
		server.accept();
		this.currentlyConnectedWebSockets += 1;

		// add id of user to hashmap and put the value as true
		const params = new URL(request.url).searchParams;
		const socketUserId = params.get('user_id');
		this.currentlyLiveUsers[`${socketUserId}`] = true;

		// Upon receiving a message from the client, the server replies with the same message,
		// and the total number of connections with the "[Durable Object]: " prefix
		server.addEventListener('message', (event: MessageEvent) => {
			// if message is to ask the live user_ids
			if (event?.data?.toString() === 'live-user-ids') {
				server.send(`live-user-ids ${JSON.stringify(this.currentlyLiveUsers)}`);
			} else {
				server.send(
					`[Durable Object] currentlyConnectedWebSockets: ${
						this.currentlyConnectedWebSockets
					} -> Received ${event?.data?.toString()} from ${socketUserId}`
				);
			}
		});

		// If the client closes the connection, the runtime will close the connection too.
		server.addEventListener('close', (cls: CloseEvent) => {
			this.currentlyConnectedWebSockets -= 1;

			// also remove user from live user's hashmap
			this.currentlyLiveUsers[`${socketUserId}`] = false;

			server.close(cls.code, `Durable Object is closing WebSocket -> last live users ${JSON.stringify(this.currentlyLiveUsers)}`);
		});

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}
}
