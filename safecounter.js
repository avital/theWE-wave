function initialize() {
	$('butCount').addEvent('click', function() {
		thewe.alterState(function(state) {
			state.value++
		})
	})
}

function initialState() {
	return {value: 0}
}

function stateUpdated(state) {
	$('butCount').set('html', state.value);
}
