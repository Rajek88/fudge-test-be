import * as bcrypt from 'bcryptjs';

export async function hashPassword(userPassword: string, salt: string): Promise<string> {
	try {
		// now hash the password
		const hash: string = await bcrypt.hash(userPassword, salt);
		// and return the hash
		return hash;
	} catch (error) {
		// Handle error
		console.error('Error hashing password:', error);
		throw error;
	}
}

export async function comparePasswords(userInputPassword: string, storedHashedPassword: string): Promise<boolean> {
	try {
		const result: boolean = await bcrypt.compare(userInputPassword, storedHashedPassword);
		if (result) {
			// Passwords match, authentication successful
			return true;
		} else {
			// Passwords don't match, authentication failed
			return false;
		}
	} catch (error) {
		// Handle error
		console.error('Error comparing passwords:', error);
		throw error;
	}
}
