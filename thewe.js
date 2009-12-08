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
        },

	    hide: function() {
	    this.setStyle('display', 'none');
	},

	    show: function() {
	    this.setStyle('display', '');
	}
    });

we.delta = {};
we.view = {};


we.submitChanges = function() {
        wave.getState().submitDelta(we.delta);
        we.delta = {};
	we.inTransaction = false;
};

we.startTransaction = function() {
    we.inTransaction = true;
};

we.setMixinName = function(name) {
    we.mixinState.set('_name', name);
};


var FuncArray = function() {
    var result = [];

    result.run = function() {
	var args = arguments;
	this.each(function(item) {
		item.run(args);
	    });
    };

    return result;
};


we.State = new Class({
        initialize: function(cursorPath) {
	    this.$cursorPath = cursorPath;
        },

	getClean: function() {
	    var result = {};
	    var self = this;

	    self.getKeys().each(function(key) {
		    var val = self[key];

		    if ($type(val) == 'object')
			val = val.getClean();
 
		    result[key] = val;
		});

	    return result;
	},

	get: function(key) {
	    var result = this[key];

	    if (result == null) {
		we.state.set('blip-rep-keys', this.$cursorPath + key, true);
		this.set(key, '');
	    }

	    return result;
	},

        set: function(key, value) {
	    this[key] = value;

	    if (!(this.$cursorPath == null)) {
                var cursorPath = this.$cursorPath;

		if ($type(value) == 'object')
		    we.flattenState(value, cursorPath + (key ? (key + '.') : ''), we.delta);
                else
		    we.delta[cursorPath + key] = value;
		
                if (!we.inTransaction) {
		    we.submitChanges();
                }
	    }

	    return this;
        },

        unset: function(key) {
                var oldValue = this[key];

                if ($type(oldValue) == 'object') {
                        oldValue.getKeys().each(function(subkey) {
	                        oldValue.unset(subkey);
                        });
                }
                else {
                        we.delta[this.$cursorPath + key] = null;
                    }

                if (!we.inTransaction) {
                        we.submitChanges();
                }

                return this;
        },

	getKeys: function() {
	    var result = [];

	    for (var x in this) 
		if (x != 'caller' && x != '_current' && x != '_context' && !(x.beginsWith('$')) && !(this[x] instanceof Function)) /* $fix? */
		    result.push(x);

	    return result;
	},


	////////////////////////////
	// Elastic List Functions //
	////////////////////////////
	asArray: function() {
	    var self = this;

	    return self.getKeys().sort(function(a, b) {
		    return parseInt(self[a].position) > parseInt(self[b].position) ? 1 : -1;
		}).map(function(key) {
			return self[key];
		    });
	},

	insertAtPosition: function(pos, val) {
	    var itemId = '' + $random(0, 100000000);
	    this.set(itemId, $merge({_position: '' + pos}, val));
	    return this.$cursorPath + itemId;
	},

	append: function(val) {
	    val = val || {};
	    var self = this;
	    var newPosition = between(self.getKeys().map(function(key) { return parseInt(self[key]._position) }).max(), 100000000000);
	    return self.insertAtPosition(newPosition, val);
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

modeChanged = new FuncArray();

function weModeChanged() {
        if (typeof modeChanged != 'undefined') {
	    modeChanged.run(we.lastMode, wave.getMode());
	    we.lastMode = wave.getMode();
	    gadgets.window.adjustHeight();
        }
}

we.$ = function(id) {
    return we.el.getElementById(id);
}

function applyMixinsToElement(mixins, el) {
    var baseMixinCtxsByName = {};

    mixins.asArray().each(function(mixinState) {
	    if (mixinState._code) {
		we.mixinCtx = mixinState._context = {state: mixinState};
		we.mixinState = mixinState;
		we.el = el;	       
		eval(we.mixin.state._code);

		if (mixinState._name) {
		    baseMixinCtxsByName[_name] = mixinCtx;
		}
	    }
	});
}

msg = null;
debug = false;

function debugState() {
	if (debug) {
	    if (!msg)  {
		msg = new gadgets.MiniMessage("http://wave.thewe.net/gadgets/thewe-ggg/thewe-ggg.xml", $('messageBox'));
	    }

	    // for debug
	    msg.createDismissibleMessage(JSON.stringify(we.rawState));
	}
}

function weStateUpdated() {
    alert(1);

        state = we.computeState();

	/* $fix - see what actually changed */
        if (we.mixins != state._mixins) {
                we.mixins = state._mixins;
		$('content').empty();
		modeChanged.empty();
		applyMixinsToElement(we.mixins, $('content'));
                weModeChanged();
        }

        if (typeof stateUpdated != 'undefined') {
                stateUpdated(state);
        }
	
	debugState();

        gadgets.window.adjustHeight();
}

function main() {
        if (wave && wave.isInWaveContainer()) {
                window.addEvent('keypress', function(event) {
                        if (event.alt && event.control) {
	                        var key = String.fromCharCode(event.event.charCode);

	                        if (key == 's') {
				    alert(js_beautify(JSON.stringify(we.state.getClean()), {indent_size: 4, indent_char: ' ', preserve_newlines: false}));
	                        }

	                        if (key == 'o') {
	                                wave.getState().submitValue(
	                                        prompt("Key"),
	                                        prompt("Value"));
	                        }

				if (key == 'e') {
				    alert(eval(prompt("eval")));
				}

				if (key == 'b') {
				    debug = !debug;
				    debugState();
				}

				if (key == 'm') {
				    we.startTransaction();

				    var mixinName = prompt("Use an existing mixin? If so, what is its name?");

				    if (!we.state._mixins)
					we.state.set('_mixins', new we.State('_mixins.')); // $fix - should this be {} instead of new we.State()?

				    var newMixinId = we.state._mixins.append() + '._code';

				    if (mixinName)
					we.state.set('mixin-rep-key', JSON.stringify({key: newMixinId, mixinName: mixinName}));
				    else {
					we.state.set('blip-rep-keys', newMixinId);
				    }

				    we.submitChanges();
				}
                        }
                });

                wave.setModeCallback(weModeChanged);
                wave.setStateCallback(weStateUpdated);
        }
};

gadgets.util.registerOnLoadHandler(main);


