import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

let prismaInstance: PrismaClient;

export const GeneratePrismaClient = (env: any) => {
	if (!prismaInstance) {
		const adapter = new PrismaD1(env.DB);
		const prisma = new PrismaClient({ adapter });
		prismaInstance = prisma;
	}
	return prismaInstance;
};

// Exclude keys from table
export function ExcludeFromRows(rows: any, keys: string[]) {
	return rows.map((obj: any) => {
		const newObj: any = {};
		for (const key in obj) {
			if (!keys.includes(key)) {
				newObj[key] = obj[key];
			}
		}
		return newObj;
	});
}
