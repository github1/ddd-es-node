"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const clock_1 = require("./clock");
class EntityEvent {
    constructor() {
        this.typeNameMetaData = this.constructor.name;
        this.name = this.typeNameMetaData;
        this.timestamp = clock_1.Clock.now();
    }
}
exports.EntityEvent = EntityEvent;
/* tslint:disable */
class ChainInterceptorPromise extends Promise {
    constructor(promise, afterChain) {
        super((resolve) => {
            resolve();
        });
        this.promise = promise;
        this.afterChain = afterChain || function () {
        };
    }
    then(a) {
        return new ChainInterceptorPromise(this.promise.then(a).then((a) => {
            return this.afterChain(a).then(() => Promise.resolve(a));
        }), this.afterChain);
    }
    catch(a) {
        return this.promise.catch(a);
    }
}
exports.ChainInterceptorPromise = ChainInterceptorPromise;
/* tslint:enable */
class BaseEntityRepository {
    constructor(eventDispatcher, eventStore) {
        this.eventDispatcher = eventDispatcher;
        this.eventStore = eventStore;
    }
    load(construct, id) {
        const eventsToDispatch = [];
        return new ChainInterceptorPromise(new Promise((resolve) => {
            const entity = new construct(id);
            entity.init((streamId, event) => {
                event.streamId = streamId;
                eventsToDispatch.push(event);
                entity.apply(event);
            });
            this.eventStore.replay(id, (event) => {
                entity.apply(event);
            }, () => {
                resolve(entity);
            });
        }), () => {
            if (eventsToDispatch.length === 0) {
                return Promise.resolve();
            }
            else {
                const flushTo = [];
                while (eventsToDispatch.length > 0) {
                    flushTo.push(eventsToDispatch.shift());
                }
                return this.eventDispatcher(id, flushTo);
            }
        });
    }
}
exports.BaseEntityRepository = BaseEntityRepository;
class EventProcessor {
    apply(newHandler) {
        const parentHandler = this.handler;
        let handlerToSet = newHandler;
        if (parentHandler) {
            handlerToSet = (entity, event) => {
                newHandler(entity, event);
                parentHandler(entity, event);
            };
        }
        this.handler = handlerToSet;
        return this;
    }
    accept(entity, event) {
        this.handler(entity, event);
    }
}
exports.EventProcessor = EventProcessor;
class Entity {
    constructor(id, config) {
        this.id = id;
        this.config = config;
    }
    static CONFIG(newHandler) {
        return new EventProcessor().apply(newHandler);
    }
    init(dispatch) {
        this.dispatch = dispatch;
    }
    apply(event) {
        this.config.accept(this, event);
    }
}
exports.Entity = Entity;
let incrementalUUID = false;
let uidCount = 0;
exports.useIncrementalUUID = (value) => {
    incrementalUUID = value;
};
exports.uuid = () => {
    return incrementalUUID ? `${uidCount++}` : uuid_1.v4();
};
//# sourceMappingURL=entity.js.map