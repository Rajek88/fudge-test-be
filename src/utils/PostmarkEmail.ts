export async function sendEmail(invite_link: string, team_name: string) {
	const postData = {
		From: 'jacques@fudge-eg-1.com',
		To: 'rajerkulkarni01@gmail.com',
		Subject: `Invitation to join team ${team_name}`,
		HtmlBody: `<strong>Hello</strong> user.<br/><br/>You have been invited by admin to join team A, click on the link below to proceed. <br/> <a href='${invite_link}' target='_blank'>${invite_link}</a>`,
		MessageStream: 'outbound',
	};

	const url = 'https://api.postmarkapp.com/email';
	const token = '2c56835a-c974-408f-90a7-84d533521e28';

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'X-Postmark-Server-Token': token,
			},
			body: JSON.stringify(postData),
		});

		if (!response.ok) {
			throw new Error('Network response was not ok');
		}

		const data = await response.json();
		console.log('Response:', data);
	} catch (error) {
		console.error('Error:', error);
	}
}
