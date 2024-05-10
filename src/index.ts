import { IRequest, Router, json } from 'itty-router';
import { getAllUsers, inviteUserToTeam, loginUser, registerUser } from './controllers/UserController';
import { Env } from '../worker-configuration';
import { validateToken } from './middlewares/Auth';

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

// register new user
router.post('/user/login', loginUser);

router.post('/admin/inviteUser', validateToken, inviteUserToTeam);

router.all('*', async (req) => {
	return json({ error: 'Not found' }, { status: 404 });
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return router.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
