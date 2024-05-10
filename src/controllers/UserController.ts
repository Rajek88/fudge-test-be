import { IRequest, json, withContent } from 'itty-router';
import { ExcludeFromRows, GeneratePrismaClient } from '../db/DB_Handler';
import { comparePasswords, hashPassword } from '../utils/PasswordUtils';
import { Env } from '../../worker-configuration';
import { generateJWTToken } from '../utils/JWTUtils';

export const getAllUsers = async (request: IRequest, env: Env, ctx: ExecutionContext) => {
	try {
		const prisma = GeneratePrismaClient(env);
		const data = await prisma.user.findMany();
		const users = ExcludeFromRows(data, ['password']);
		return json({ message: 'success', users }, { status: 200 });
	} catch (error) {
		return json({ message: 'error', error }, { status: 400 });
	}
};

export const registerUser = async (request: IRequest, env: Env, ctx: ExecutionContext) => {
	try {
		// with the "withContent", you can parse the body, then it stores the parsed body to request.content
		await withContent(request);
		// now extract the required fields
		const { name, email, password } = request.content;
		// if any field is missing, throw error
		if (!name || !email || !password) {
			return json({ message: 'Invalid input' }, { status: 400 });
		}

		// now hash the password with API salt that we have in wrangler.toml
		const hashedPassword = await hashPassword(password, env.API_SALT);
		const prisma = GeneratePrismaClient(env);
		const user = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
			},
		});
		return json({ message: 'success', user }, { status: 200 });
	} catch (error) {
		return json({ message: 'error', error }, { status: 500 });
	}
};

export const loginUser = async (request: IRequest, env: Env, ctx: ExecutionContext) => {
	try {
		// with the "withContent", you can parse the body, then it stores the parsed body to request.content
		await withContent(request);
		// now extract the required fields
		const { email, password } = request.content;
		// if any field is missing, throw error
		if (!email || !password) {
			return json({ message: 'Invalid input' }, { status: 400 });
		}

		// now get the user from DB and check hashes
		const prisma = GeneratePrismaClient(env);
		const user = await prisma.user.findUnique({
			where: {
				email,
			},
		});

		// if user does not exists, return error
		if (!user) {
			return json({ message: 'No user found' }, { status: 404 });
		}

		// if user exists, check password
		const isPasswordMatch = await comparePasswords(password, user?.password);
		if (!isPasswordMatch) {
			return json({ message: 'Invalid username/password' }, { status: 404 });
		}

		// user
		const userWithoutPW = {
			name: user.name,
			email: user.email,
			id: user.id,
		};

		// we are here, means user exists and passwords matched, time to generate jwt
		const token = await generateJWTToken(userWithoutPW);

		// now send this token to the response
		return json({ message: 'success', user: userWithoutPW, token }, { status: 200 });
	} catch (error) {
		return json({ message: 'error', error }, { status: 500 });
	}
};
