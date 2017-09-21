"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let time = -1;
var Clock;
(function (Clock) {
    function freeze(at) {
        time = at;
    }
    Clock.freeze = freeze;
    function unfreeze() {
        time = -1;
    }
    Clock.unfreeze = unfreeze;
    function now() {
        return time === -1 ? new Date().getTime() : time;
    }
    Clock.now = now;
})(Clock = exports.Clock || (exports.Clock = {}));
//# sourceMappingURL=clock.js.map