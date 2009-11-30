$extend(JSON, {stringify: JSON.encode, parse: JSON.decode});
 
we = {};

$not = function(f) {
        return function(x) {
                return !f(x);
        };
};

String.implement({
        beginsWith: function(pre) {
                return this.substring(0, pre.length) == pre;
        }
});

$begins = function(prefixes) {
        prefixes = $splat(prefixes);

        return function(str) {
                return prefixes.some(function(prefix) {
                        return str.beginsWith(prefix);
                });
        };
};

Array.implement({
        getAllButLast: function() {
                return this.filter(function(value, i) {
                        return i < this.length - 1;
                }.bind(this));
        }
});

Element.implement({
        $we: function(weid) {
                return this.getElement('[weid=' + weid + ']');
        }
});

we.delta = {};
we.view = {};

we.submitChanges = function() {
        wave.getState().submitDelta(we.delta);
        we.delta = {};
};

we.State = new Class({
        initialize: function(cursorPath) {
	    this.$cursorPath = cursorPath;
        },

        set: function(key, value, dontsubmit) {
	    this[key] = value;

	    if (!(this.$cursorPath == null)) {
                var cursorPath = this.$cursorPath;

		if ($type(value) == 'object')
		    we.flattenState(value, cursorPath + (key ? (key + '.') : ''), we.delta);
                else
		    we.delta[cursorPath + key] = value;
		
                if (!dontsubmit) {
		    we.submitChanges();
                }
	    }

	    return this;
        },

        unset: function(key, dontsubmit) {
                var oldValue = this[key];

                if ($type(oldValue) == 'object') {
                        oldValue.getKeys().each(function(subkey) {
	                        oldValue.unset(subkey);
                        });
                }
                else {
                        we.delta[this.$cursorPath + key] = null;
                    }

                if (!dontsubmit) {
                        we.submitChanges();
                }

                return this;
        },

	getKeys: function() {
	    var result = [];

	    for (var x in this) 
		if (x != 'caller' && !(x.beginsWith('$')) && !(x.beginsWith('_')) && !(this[x] instanceof Function)) /* $fix? */
		    result.push(x);

	    return result;
	},


	////////////////////////////
	// Elastic List Functions //
	////////////////////////////
	getAsArray: function() {
	    return this.getKeys().sort(function(a, b) {
		    return parseInt(this[a].position) > parseInt(this[b].position) ? 1 : -1;
		}).map(function(key) {
			return this[key].value;
		    });
	},

	insertAtPosition: function(pos, val) {
	    var itemId = '' + $random(0, 100000000);
	    return this.set(itemId, {
		    position: '' + pos,
			value: '' + val
			});
	},

	append: function(val) {
	    var self = this;
	    var newPosition = between(self.getKeys().map(function(key) { return parseInt(self[key].position) }).max(), 100000000000);
	    return this.insertAtPosition(newPosition, val);
	}
});

between = function(x, y) {
    if (x == -Infinity)
	x = 0;

    return $random(x, y);
};


Hash.implement({
        filterKeys: function(filter) {
                return this.filter(function(value, key) {
                        return filter(key);
                });
        }
});

we.deepenState = function(state) {
        var result = new we.State('');

        $H(state).filterKeys($not($begins('$'))).each(function(value, key) {
                var cursor = result;
                var tokens = key.split('.');
                var cursorPath = '';

                tokens.getAllButLast().each(function(token) {
                        cursorPath += token + '.';

                        if (!cursor[token]) {
			    cursor[token] = new we.State(cursorPath);
                        }

                        cursor = cursor[token];
                });

                cursor[tokens.getLast()] = value;
        });

        return result;
};

we.flattenState = function(state, cursorPath, into) {
        cursorPath = cursorPath || '';
        into = into || {};

        $H(state).filterKeys($not($begins('$'))).each(function(value, key) {
                if ($type(value) == 'object')
                        we.flattenState(value, cursorPath + key + '.', into);
                else
                        into[cursorPath + key] = value;
            });

        return into;
};

we.computeState = function() {
        var waveState = wave.getState();

        if (waveState) {
                we.rawState = waveState.state_;
                return we.state = we.deepenState(we.rawState);
        }
};

function weModeChanged() {
        if (typeof modeChanged != 'undefined') {
                modeChanged(we.lastMode, wave.getMode());
                we.lastMode = wave.getMode();
                gadgets.window.adjustHeight();
        }
}

function weStateUpdated() {
        state = we.computeState();

        if (we.code != state._code) {
                we.code = state._code;
		eval(we.code);
                weModeChanged();
        }

        if (typeof stateUpdated != 'undefined') {
                stateUpdated(state);
        }

        gadgets.window.adjustHeight();
}


function main() {
        if (wave && wave.isInWaveContainer()) {
                window.addEvent('keypress', function(event) {
                        if (event.alt && event.control) {
	                        var key = String.fromCharCode(event.event.charCode);

	                        if (key == 's') {
				    alert(js_beautify(JSON.stringify(we.state), {indent_size: 4, indent_char: ' ', preserve_newlines: false}));
	                        }

	                        if (key == 'o') {
	                                wave.getState().submitValue(
	                                        prompt("Key"),
	                                        prompt("Value"));
	                        }

				if (key == 'e') {
				    alert(eval(prompt("eval")));
				}
                        }
                });

                wave.setModeCallback(weModeChanged);
                wave.setStateCallback(weStateUpdated);
        }
};

gadgets.util.registerOnLoadHandler(main);


