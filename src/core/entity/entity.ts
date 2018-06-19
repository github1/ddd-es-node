import {
  EntityEvent,
  VoidEventDispatcher
} from './../event';

export type EventHandler = (entity : Entity, event : EntityEvent) => void;

export class EventProcessor {
  private handler : EventHandler;

  public apply(newHandler : EventHandler) : EventProcessor {
    const parentHandler : EventHandler = this.handler;
    let handlerToSet : EventHandler = newHandler;
    if (parentHandler) {
      handlerToSet = (entity : Entity, event : EntityEvent) : void => {
        newHandler(entity, event);
        parentHandler(entity, event);
      };
    }
    this.handler = handlerToSet;
    return this;
  }

  public accept(entity : Entity, event : EntityEvent) : void {
    this.handler(entity, event);
  }
}

export class Entity {
  protected id : string;
  protected config : EventProcessor;
  protected dispatch : VoidEventDispatcher;

  constructor(id : string,
              config : EventProcessor) {
    this.id = id;
    this.config = config;
  }

  public static CONFIG(newHandler : EventHandler) : EventProcessor {
    return new EventProcessor().apply(newHandler);
  }

  public init(dispatch : VoidEventDispatcher) : void {
    this.dispatch = dispatch;
  }

  public apply(event : EntityEvent) : void {
    this.config.accept(this, event);
  }

}
