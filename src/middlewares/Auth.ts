import { IRequest, json } from 'itty-router';
import { Env } from '../../worker-configuration';
import { decodeJWTToken } from '../utils/JWTUtils';

interface DecodedToken {
	isValid: boolean;
}

export const validateToken = async (req: IRequest, env: Env, ctx: ExecutionContext) => {
	try {
		const token = req?.headers?.get('Authorization')?.split('Bearer ')[1] as string;
		// now decode token
		const decoded = (await decodeJWTToken(token)) as DecodedToken;
		if (!decoded || !decoded?.isValid) {
			throw Error();
		}
		// append the user object and pass the request
		req.loggedUser = decoded;
		return;
	} catch (error) {
		console.log({ error });
		return json({ message: 'Invalid auth' }, { status: 404 });
	}
};

export const validateSocketToken = async (token: string) => {
	try {
		// now decode token
		const decoded = await decodeJWTToken(token);
		if (!decoded || !decoded?.isValid) {
			throw Error();
		}
		// if the token is valid, return true
		return decoded.id;
	} catch (error) {
		console.log({ error });
		// else return false
		return null;
	}
};
