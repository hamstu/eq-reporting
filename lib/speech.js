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
	noted: [
		'your report has been saved',
		'we\'ve got it down',
		'it\'s on the record',
		'report saved',
		'report received',
		'message received',
		'we really appreciate it',
		'message received',
		'you\'re doing great'
	],
	closer: [
		'That\'s all I needed – talk to you later!',
		'Looks like that\'s everything, thanks again for your report!',
		'Well that\'s all I needed. Till next time!',
		'Your report is now complete. Thanks!',
		'Report complete — till next month!',
		'All squared away, thanks for your help! Till next time.'
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

function isNegative(text) {
	let seemsNegative = speech.no.some(n => text.toLowerCase().startsWith(n));
	return seemsNegative;
}

module.exports = {
	speech,
	randText,
	isAffirmative,
	isNegative
}