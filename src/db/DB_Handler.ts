import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

export const GeneratePrismaClient = (env: any) => {
	const adapter = new PrismaD1(env.DB);
	const prisma = new PrismaClient({ adapter });
	return prisma;
};
