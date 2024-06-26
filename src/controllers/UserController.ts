import { IRequest, json, withContent } from 'itty-router';
import { ExcludeFromRows, GeneratePrismaClient } from '../db/DB_Handler';
import { comparePasswords, hashPassword } from '../utils/PasswordUtils';
import { Env } from '../../worker-configuration';
import { generateJWTToken } from '../utils/JWTUtils';
import { sendEmail } from '../utils/PostmarkEmail';

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
		return json({ message: 'success' }, { status: 200 });
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

// checkInvitationAndAddUserToTeam,
export const checkInvitationAndAddUserToTeam = async (request: IRequest, env: Env, ctx: ExecutionContext) => {
	try {
		// with the "withContent", you can parse the body, then it stores the parsed body to request.content
		await withContent(request);
		// now extract the required fields - invitationId
		const invitation_id = request?.query?.id;
		// if any field is missing, throw error
		if (!invitation_id) {
			return json({ message: 'Invalid input' }, { status: 400 });
		}

		// now get the user from DB
		const prisma = GeneratePrismaClient(env);
		const invitation = await prisma.invitation.findUnique({
			where: {
				id: Number(invitation_id),
			},
		});

		if (!invitation) {
			return json({ message: 'Invalid invitation' }, { status: 404 });
		}

		// get user_id from mail
		const user = await prisma.user.findUnique({
			where: {
				email: invitation?.email,
			},
		});

		if (!user) {
			return json({ message: 'Invalid user' }, { status: 404 });
		}

		// also make sure, the authenticated user has access to invitation
		// check if invitation is invalid and if logged user has access to it
		if (!invitation || user?.id !== request?.loggedUser?.id) {
			return json({ message: 'Invalid invitation' }, { status: 404 });
		}

		// time elapsed
		const timeElapsed = Date.now() - invitation.created_at.getTime();
		// if invitation is expired, i.e. 10 minutes have been passed, return error
		if (10 * 60 * 1000 < timeElapsed) {
			// update the status to db
			await prisma.invitation.update({
				where: {
					id: Number(invitation_id),
				},
				data: {
					status: 'expired',
				},
			});
			// return the response
			return json({ message: 'Invitation expired', timeElapsed }, { status: 400 });
		}

		// if everything is in time, check if user is alreday in team, add the user to team
		const isUserAlreadyInTeam = await prisma.team_user_association.findMany({
			where: {
				user_id: user.id,
				team: invitation.team,
			},
		});
		// this returns array
		// if the array has any value, means user is already added to team, then skip it
		// else add the user
		if (isUserAlreadyInTeam.length === 0) {
			// add user to team
			await prisma.team_user_association.create({
				data: {
					user_id: user.id,
					team: invitation.team,
				},
			});
			// update the status of invitation
			await prisma.invitation.update({
				where: {
					id: Number(invitation_id),
				},
				data: {
					status: 'accepted',
				},
			});
		}

		// now send this token to the response
		return json({ message: 'success' }, { status: 200 });
	} catch (error) {
		console.log({ error });
		return json({ message: 'error', error }, { status: 500 });
	}
};

// inviteUserToTeam
export const inviteUserToTeam = async (request: IRequest, env: Env, ctx: ExecutionContext) => {
	try {
		// with the "withContent", you can parse the body, then it stores the parsed body to request.content
		await withContent(request);
		// now extract the required fields
		const { email, team } = request.content;

		// check if team is valid
		const teams = ['A', 'B', 'C', 'D'];
		const isTeamValid = teams.includes(team);

		// if any field is missing, throw error
		if (!email || !team || !isTeamValid) {
			return json({ message: 'Invalid input' }, { status: 400 });
		}

		const prisma = GeneratePrismaClient(env);

		// now create invitation, no matter if user exists or not
		const invitation = await prisma.invitation.create({
			data: {
				email: email,
				team: team,
			},
		});

		// also send email to that email id
		await sendEmail(`${env.FE_BASE}/invitations/${invitation.id}`, team);

		// now send this token to the response
		return json({ message: 'success', invitation_id: invitation.id }, { status: 200 });
	} catch (error) {
		return json({ message: 'error', error }, { status: 500 });
	}
};

interface TeamMembers {
	[key: string]: any[];
}

// getActiveTeamMembers
export const getTeamMembers = async (request: IRequest, env: Env, ctx: ExecutionContext) => {
	try {
		// get logged in user's id from token
		const user_id = Number(request?.loggedUser?.id);

		const prisma = GeneratePrismaClient(env);
		// check in team_user_association table, and find out all the teams the user has access to
		const teams = await prisma.team_user_association.findMany({
			where: {
				user_id: user_id,
			},
		});
		// now get all the users in the specified teams
		let teamMembers: TeamMembers = {};
		for (let team of teams) {
			const members = await prisma.team_user_association.findMany({
				where: {
					team: team?.team,
				},
				include: {
					user: {
						select: {
							name: true,
							id: true,
							email: true,
						},
					},
				},
			});
			// check if we have older data, else create property and push data
			if (!teamMembers?.[`${team.team}`]) {
				teamMembers[`${team.team}`] = [];
				teamMembers[`${team.team}`].push(...members);
			}
		}
		// get all the teamMembers from that team
		return json({ message: 'success', teamMembers }, { status: 200 });
	} catch (error) {
		return json({ message: 'error', error }, { status: 500 });
	}
};

// getAllInvitations
export const getAllInvitations = async (request: IRequest, env: Env, ctx: ExecutionContext) => {
	interface Invitation {
		id: number;
		email: string;
		team: string;
		status: string;
		created_at: Date;
		updated_at: Date;
		joinedTeams?: string[];
	}

	interface Team {
		id: number;
		user_id: number;
		team: string;
		user: {
			name: string;
			email: string;
		};
	}

	try {
		const prisma = GeneratePrismaClient(env);
		const invitations: Invitation[] = await prisma.invitation.findMany();
		const teams: Team[] = await prisma.team_user_association.findMany({
			include: {
				user: {
					select: {
						name: true,
						email: true,
					},
				},
			},
		});
		// Map teams to invitations based on email
		const invitationsWithJoinedTeams: (Invitation & { joinedTeams: string[] })[] = invitations.map((invitation) => {
			// Find teams that match the email of the invitation
			const matchingTeams: Team[] = teams.filter((team) => team.user.email === invitation.email);
			// Extract unique team names from matching teams
			const joinedTeams: string[] = [...new Set(matchingTeams.map((team) => team.team))];
			// Return invitation object with joinedTeams field added
			return { ...invitation, joinedTeams };
		});

		return json({ message: 'success', invitations: invitationsWithJoinedTeams }, { status: 200 });
	} catch (error) {
		return json({ message: 'error', error }, { status: 400 });
	}
};
