we = {}

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

$begins = function(prefixes) {
	prefixes = $splat(prefixes)

	return function(str) {
		return prefixes.some(function(prefix) {
			return str.beginsWith(prefix)
		})
	}
}

Array.implement({
	getAllButLast: function() {
		return this.filter(function(value, i) {
			return i < this.length - 1
		}.bind(this))
	}
})

we.delta = {}

we.submitChanges = function() {
	wave.getState().submitDelta(we.delta)
	we.delta = {}
}

we.State = new Class({
	Extends: Hash,

	initialize: function(cursorPath) {
		if (cursorPath)
			this._cursorPath = cursorPath
	},

	set: function(key, value, dontsubmit) {
		var type = $type(value) || 'object' // $fix!!!
		var cursorPath = this._cursorPath || ''

		if (['object', 'hash'].contains(type))
			we.flattenState(value, cursorPath + (key ? (key + '.') : ''), we.delta)
		else
			we.delta[cursorPath + key] = value

		if (!dontsubmit)
			we.submitChanges()

		return this
	},

	unset: function(key, dontsubmit) {
		var oldValue = this[key]

		if (['object', 'hash'].contains($type(oldValue)))
			oldValue.getKeys().each(function(subkey) {
				oldValue.unset(subkey)
			})
		else
			we.delta[this._cursorPath + key] = null

		if (!dontsubmit)
			we.submitChanges()

		return this
	},		

	getKeys: function() {
		return this.parent().filter($not($begins(['_', '$', 'caller' /* $fix */])))
	}
})

Hash.implement({
	filterKeys: function(filter) {
		return this.filter(function(value, key) {
			return filter(key)
		})
	}
})

we.deepenState = function(state) {
	var result = new we.State()

	$H(state).filterKeys($not($begins('$'))).each(function(value, key) {
		var cursor = result
		var tokens = key.split('.')
		var cursorPath = ''

		tokens.getAllButLast().each(function(token) {
			cursorPath += token + '.';

			if (!cursor[token])
				cursor[token] = new we.State(cursorPath)

			cursor = cursor[token]
		})

		cursor[tokens.getLast()] = value
	})

	return result
}

we.flattenState = function(state, cursorPath, into) {
	cursorPath = cursorPath || ''
	into = into || $H()

	$H(state).each(function(value, key) {
		if (['object', 'hash'].contains($type(value)))
			we.flattenState(value, cursorPath + key + '.', into)
		else
			into[cursorPath + key] = value
	})

	return into
}

we.computeState = function() {
	return we.state = we.deepenState(wave.getState().state_)
}

function main() {
	if (wave && wave.isInWaveContainer()) {
		window.addEvent('keypress', function(event) {
			if (event.alt && event.control) {
				var key = String.fromCharCode(event.event.charCode)
				if (key == 'e') {
					// $fix?
					we.state.set(null, 
						JSON.parse(prompt("Gadget state", 
							JSON.stringify(we.computeState()))))
				}
			}
		})

		wave.setStateCallback(function() {
			var newView = wave.getState().get('_view')
			if (we.view != newView) {
				we.view = newView
				eval(we.view)
			}

			var state = we.computeState()

			if (typeof stateUpdated != 'undefined')
				stateUpdated(state)
		})
	}
}

gadgets.util.registerOnLoadHandler(main)


