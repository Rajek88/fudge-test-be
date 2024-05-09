import { IRequest, Router, json, status } from 'itty-router';
import { GeneratePrismaClient } from './db/DB_Handler';
import { getAllUsers, registerUser } from './controllers/UserController';

// prisma setup
export interface Env {
	DB: D1Database;
}

const router = Router<IRequest, [Env, ExecutionContext]>({
	// Hint: You can add middleware here (e.g. to add response headers to every response)
});

router.all('/example', async (req) => {
	return json({ message: 'Hello, World!' });
});

// get all users
router.get('/user/getAll', getAllUsers);

// register new user
router.post('/user/register', registerUser);

router.all('*', async (req) => {
	return json({ error: 'Not found' }, { status: 404 });
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return router.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
