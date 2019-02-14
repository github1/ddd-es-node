import {
  EntityEvent,
  VoidEventDispatcher
} from '../event';

export type EventHandler = (entity : Entity, event : EntityEvent) => void;

const composeHandlers = (...handlers : EventHandler[]) : EventHandler => {
  if (handlers.length === 1) {
    return handlers[0];
  }
  return (entity : Entity, event : EntityEvent) => {
    for (let i = handlers.length - 1; i >= 0; --i) {
      handlers[i](entity, event);
    }
  };
};

export class Entity {
  protected id : string;
  protected applier : EventHandler;
  protected dispatch : VoidEventDispatcher;

  constructor(id : string,
              ...appliers : EventHandler[]) {
    this.id = id;
    this.applier = composeHandlers(...appliers);
  }

  public init(dispatch : VoidEventDispatcher) : void {
    this.dispatch = dispatch;
  }

  public apply(event : EntityEvent) : void {
    this.applier(this, event);
  }

}
