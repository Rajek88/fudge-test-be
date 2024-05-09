import { IRequest, json, withContent, withParams } from 'itty-router';
import { ExcludeFromRows, GeneratePrismaClient } from '../db/DB_Handler';

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
		const prisma = GeneratePrismaClient(env);
		const user = await prisma.user.create({
			data: {
				name,
				email,
				password,
			},
		});
		return json({ message: 'success', user }, { status: 200 });
	} catch (error) {
		return json({ message: 'error', error }, { status: 500 });
	}
};
