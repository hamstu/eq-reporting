const speech = {
	greeting: [
		'Hi there',
		'Hola',
		'Bonjour',
		'Heya',
		"Heyo",
		"Hi",
		"Hello",
		"Good day",
		"Happy day",
		"What's up",
		"Hey there",
		"What's new",
		"Howdy",
		"Yo",
		"G'day",
		"Hiya"
	],
	attribute: [
		'happy',
		'faithful',
		'friendly',
		'cheerful',
		'dilligent',
		'favorite',
		'personal',
		'special'
	],
	emoji: [
		'🏡', '🏠', '✨', '😃', '⭐', '🌈', '💥', '🚘'
	],
	happyOpener: [
		'Awesome',
		'Cool',
		'Great',
		'Perfect',
		'Delightful',
		'Superb',
		'Excellent',
		'Wonderful',
		'Stellar',
		'Nice',
		'Fabulous',
		'Amazing',
		'Thanks'
	],
	yes: [
		'yes', 'yep', 'y', 'yeah', 'yupper', 'you bet', 'i did', 'certainly', 'indeed'
	],
	no: [
		'no', 'nope', 'n', 'nah', 'i did not', 'not', 'did not'
	]
};

function randText(category) {
	var item = speech[category][Math.floor(Math.random()*speech[category].length)];
	return item;
}

function isAffirmative(text) {
	let seemsAffirmative = speech.yes.some(y => text.toLowerCase().startsWith(y));
    let negated = speech.no.some(n => text.toLowerCase().endsWith(' ' + n));
	return seemsAffirmative && !negated;
}

module.exports = {
	speech,
	randText,
	isAffirmative
}