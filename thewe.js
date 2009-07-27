///////////////////////////////////////////////////////////////////////
// theWE Wave Gadget Framework v0.1
// Written by Avital Oliver (avital@thewe.net)
//
// Allows writing concurrent-safe gadgets and having a gadget state
// is a full-fledged javascript object
//
// Must be loaded after MooTools!
//
// Initial documentation:
// ----------------------
// In order to use this framework, you must implement two functions:
//
// initialState():          returns a javascript object representing the initial state of the gadget
//
// stateUpdate(newState):   gets called when the state is updated
//
//
// The functions thate theWE exposes are:
//
// thewe.alterState(alter): applies the alter function to the gadget state, for example
//                          thewe.alterState(function(state) { state.count++ })
//                          If the alter function returns an object, that object becomes the new state.
//
// thewe.getState():        Returns the "real" gadget state
///////////////////////////////////////////////////////////////////////

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
