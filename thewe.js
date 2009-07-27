Array.implement({
	max: function() {
		var result = 0

		this.each(function(val) {
			result = Math.max(result, val)
		})  
    
		return result
	}
})

$not = function(f) {
	return function(x) {
		return !f(x)
	}
}

String.implement({
	beginsWith: function(pre) {
		return this.substring(0, pre.length) == pre
	}
})

$begins = function(pre) {
	return function(str) {
		return str.beginsWith(pre)
	}
}



thewe = {}

thewe.getStateKeys = function() {
	return wave.getState().getKeys().filter($not($begins('$')))
}

thewe.alterState = function(alter) {
	wave.getState().submitValue(thewe.getStateKeys().max() + Math.random(), alter.toSource())
}

thewe.computeState = function() {
	var state = $H()

	thewe.getStateKeys().sort().each(function(key) { // $todo: check sort function
		eval('var alter = ' + wave.getState().get(key))

		var it
		if (it = alter(state))
			state = it
	})

	return thewe.state = state
}

function main() {
	initialize()

	if (wave && wave.isInWaveContainer()) {
		wave.setStateCallback(function() {
			if (thewe.getStateKeys().length == 0) {
				thewe.alterState(initialState)
			}
			else {
				stateUpdated(thewe.computeState())
			}
		})
	}
}

gadgets.util.registerOnLoadHandler(main)


// $todo: notify gadget back when it wasn't the last alter
