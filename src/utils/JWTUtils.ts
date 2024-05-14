import jwt from '@tsndr/cloudflare-worker-jwt';

// Define your secret key, this should ideally be stored in a secure environment
const secretKey = 'fudge.ai@2024';

export async function generateJWTToken(userPayload: object): Promise<string> {
	const token = await jwt.sign(userPayload, secretKey);
	return token;
}

interface Payload {
	name: string;
	email: string;
	id: number;
	iat: number;
}

export async function decodeJWTToken(token: string) {
	try {
		const isValid = await jwt.verify(token, secretKey);
		// Check for validity
		if (!isValid) {
			return {
				isValid: false as const,
			};
		}
		// Decoding token
		const payload = jwt.decode<Payload>(token)?.payload;
		// console.log({ payload });
		if (!payload) {
			throw new Error();
		}
		// here we actually have data
		return {
			isValid: true as const,
			name: payload.name,
			email: payload.email,
			id: payload.id,
			iat: payload.iat,
		};
	} catch (error) {
		console.error('Error decoding JWT token:', error);
		return {
			isValid: false as const,
		};
	}
}
