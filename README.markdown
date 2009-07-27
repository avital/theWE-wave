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
