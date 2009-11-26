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
        Extends: Hash,

        initialize: function(cursorPath) {
                if (cursorPath) {
                        this._cursorPath = cursorPath;
                }
        },

        set: function(key, value, dontsubmit) {
                var type = $type(value) || 'object'; // $fix!!!
                var cursorPath = this._cursorPath || '';

                if (['object', 'hash'].contains(type))
                        we.flattenState(value, cursorPath + (key ? (key + '.') : ''), we.delta);
                else
                        we.delta[cursorPath + key] = value;

                if (!dontsubmit) {
                        we.submitChanges();
                }

                return this;
        },

        unset: function(key, dontsubmit) {
                var oldValue = this[key];

                if (['object', 'hash'].contains($type(oldValue))) {
                        oldValue.getKeys().each(function(subkey) {
	                        oldValue.unset(subkey);
                        });
                }
                else {
                        we.delta[this._cursorPath + key] = null;
                    }

                if (!dontsubmit) {
                        we.submitChanges();
                }

                return this;
        },

	clean: function() {
	    var result = this;
	    delete result._cursorPath;
	    delete result.$family;
	    delete result.caller;
	    
	    result.each(
			function(value, key) {
			    if (['hash'].contains($type(value))) {
				result[key] = result[key].clean();
			    }
			});

	    return result.getClean();
	},

        getKeys: function() {
                return this.parent().filter($not($begins(['_', '$', 'caller' /* $fix */])));
        }
});

Hash.implement({
        filterKeys: function(filter) {
                return this.filter(function(value, key) {
                        return filter(key);
                });
        }
});

we.deepenState = function(state) {
        var result = new we.State();

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
        into = into || $H();

        $H(state).each(function(value, key) {
                if (['object', 'hash'].contains($type(value) || 'object' /* $fix */))
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

doWithState = function(newState, f) {
    var oldState = state;
    state = newState;
    
    try {
	f();
    }    
    finally {
	state = oldState;
    }
};

applyViewToElement = function(el, substate, view) {
    el.set('html', view.html);
    
    doWithState(substate, 
		function() {
		    eval(view.js);
		});
}; 

function weStateUpdated() {
        state = we.computeState();

        var newView = state._view;
        if (state._view && (we.view.js != newView.js || we.view.html != newView.html || we.view.css != newView.css)) {
                we.view = newView;
		applyViewToElement($('content'), state, we.view);
                weModeChanged();
        }

        $('content').getElements('[wethis]').each(function(el) {
		var cursor = we.state;

                var stateKey = el.getParents('[wecursor]').reverse().map(function(parent) {
                        cursor = cursor[parent.getProperty('wecursor')];
                });

		if ($type(cursor) == 'hash') {
		    
		}
		else if ($type(cursor) == 'string') {
		    el.set('text', cursor);
		    el.set('value', cursor);
		}
        });

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
				    alert(js_beautify(JSON.stringify(we.state.clean()), {indent_size: 4, indent_char: ' ', preserve_newlines: false}));
	                        }

	                        if (key == 'o') {
	                                wave.getState().submitValue(
	                                        prompt("Key"),
	                                        prompt("Value"));
	                        }
                        }
                });

                wave.setModeCallback(weModeChanged);
                wave.setStateCallback(weStateUpdated);
        }
};

gadgets.util.registerOnLoadHandler(main);


