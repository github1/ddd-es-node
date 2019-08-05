# ddd-es-node

DDD and Event Sourcing primitives for nodejs

[![build status](https://img.shields.io/travis/github1/undefined/master.svg?style=flat-square)](https://travis-ci.org/github1/undefined)
[![npm version](https://img.shields.io/npm/v/@github1/undefined.svg?style=flat-square)](https://www.npmjs.com/package/@github1/undefined)
[![npm downloads](https://img.shields.io/npm/dm/@github1/undefined.svg?style=flat-square)](https://www.npmjs.com/package/@github1/undefined)

## Install

```shell
npm install ddd-es-node --save
```

## Usage

Define events.

```typescript
import { EntityEvent } from "ddd-es-node";

export class OrderCancelledEvent extends EntityEvent {
}
```

Create domain entities.

```typescript
import { Entity } from "ddd-es-node";
import { OrderCancelledEvent } from "./events";

export class Order extends Entity {
  private cancelled : boolean;
  constructor(id) {
    super(id, (self, event) => {
      if(event instanceof OrderCancelledEvent) {
        this.cancelled = true;
      }
    });
  }
  public cancel() {
    if(this.cancelled) {
      throw new Error('Order already cancelled');
    } else {
      this.dispatch(new OrderCancelledEvent());
    }
  }
}
```

Load entities and execute commands.

```typescript
import { entityRepository } from "ddd-es-node";
import { Order } from "./orders";

export const cancelOrder = (id) : void => {
  return entityRepository
      .load(Order, id)
      .then((order : Order) => order.cancel());
};
```

Add event subscribers.

```typescript
import { eventBus, EntityEvent } from "ddd-es-node";
import { OrderCancelledEvent } from "./events";

eventBus.subscribe((event : EntityEvent) => {
  if (event instanceof OrderCancelledEvent) {
    // do something
  }
}, { replay: true });
```

## License
[MIT](LICENSE.md)
