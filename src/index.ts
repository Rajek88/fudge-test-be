import { IRequest, Router, json } from 'itty-router';
import { getAllInvitations, getAllUsers, inviteUserToTeam, loginUser, registerUser } from './controllers/UserController';
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

// invite user
router.post('/admin/inviteUser', validateToken, inviteUserToTeam);

// get all invitations
router.get('/admin/getAllInvitations', getAllInvitations);

router.all('*', async (req) => {
	return json({ error: 'Not found' }, { status: 404 });
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return router.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
