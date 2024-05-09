import jwt from '@tsndr/cloudflare-worker-jwt';

// Define your secret key, this should ideally be stored in a secure environment
const secretKey = 'fudge.ai@2024';

export async function generateJWTToken(userPayload: object): Promise<string> {
	const token = await jwt.sign(userPayload, secretKey);
	return token;
}

export async function decodeJWTToken(token: string): Promise<object> {
	try {
		const isValid = await jwt.verify(token, secretKey);
		// Check for validity
		if (!isValid) {
			return {
				isValid: false,
			};
		}
		// Decoding token
		const { payload } = jwt.decode(token);
		return {
			isValid: false,
			...payload,
		};
	} catch (error) {
		console.error('Error decoding JWT token:', error);
		return {
			isValid: false,
		};
	}
}
