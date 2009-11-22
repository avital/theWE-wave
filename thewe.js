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
}

function weModeChanged() {
  if (typeof modeChanged != 'undefined') {
    modeChanged(we.lastMode, wave.getMode());
    we.lastMode = wave.getMode();
    gadgets.window.adjustHeight();
  }
}

function weStateUpdated() {
  state = we.computeState();

  var newView = state._view;
  if (state._view && (we.view.js != newView.js || we.view.html != newView.html || we.view.css != newView.css)) {
    we.view = newView;

    $('content').set('html', we.view.html);
    $('style').set('text', we.view.css);
    eval(we.view.js);
    weModeChanged();
  }

  $('content').getElements('[wethis]').each(function(el) {
    var stateKey = el.getParents('[wecursor]').map(function(parent) {
      return parent.getProperty('wecursor');
    }).reverse().join('.');

    var stateValue = we.rawState[stateKey];

    el.set('text', stateValue);
    el.set('value', stateValue);
  });

  if (typeof stateUpdated != 'undefined') {
    stateUpdated(state);
  }

  gadgets.window.adjustHeight();
}

function displayEditField(fieldName) {
  var value = we.state.getFromPath(fieldName);
  if (['object', 'hash'].contains($type(value))) { // $fix
    value.getKeys().each(
      function(subkey) {
	displayEditField(fieldName + '.' + subkey);
      });
  }
  else {
    var newEdit = $('edit-prototype').clone().inject($('edit'), 'bottom');
    newEdit.$we('edit-key').set('text', fieldName);
    newEdit.$we('edit-value').set('text', we.rawState[fieldName]);
    newEdit.$we('edit-value').addEvent('keypress',
      function(event) {
	if (event.shift && (event.event.keyCode == Event.Keys.enter)) {
	  wave.getState().submitValue(fieldName, newEdit.$we('edit-value').get('value'));
	  return false;
	}
      });

    $('edit').setStyle('display', 'block');
  }
}

function main() {
  if (wave && wave.isInWaveContainer()) {
    window.addEvent('keypress', function(event) {
      if (event.alt && event.control) {
	var key = String.fromCharCode(event.event.charCode);
	if (key == 'e') {
	  var editKey = prompt("Key to edit");
	  displayEditField(editKey);
	  gadgets.window.adjustHeight();
	}

	if (key == 's') {
	  alert(JSON.stringify(we.state));
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
}

gadgets.util.registerOnLoadHandler(main);


