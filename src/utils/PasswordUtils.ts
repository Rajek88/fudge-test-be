import * as bcrypt from 'bcryptjs';

export async function hashPassword(userPassword: string, salt: string): Promise<string> {
	try {
		console.log({ userPassword, salt });
		const hash: string = await bcrypt.hash(userPassword, salt);
		console.log('Hashed password:', hash);
		return hash;
	} catch (error) {
		// Handle error
		console.error('Error hashing password:', error);
		throw error;
	}
}
