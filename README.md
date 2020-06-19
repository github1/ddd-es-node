# ddd-es-node

DDD and Event Sourcing primitives for nodejs

[![build status](https://img.shields.io/travis/github1/ddd-es-node/master.svg?style=flat-square)](https://travis-ci.org/github1/ddd-es-node)
[![npm version](https://img.shields.io/npm/v/ddd-es-node.svg?style=flat-square)](https://www.npmjs.com/package/ddd-es-node)
[![npm downloads](https://img.shields.io/npm/dm/ddd-es-node.svg?style=flat-square)](https://www.npmjs.com/package/ddd-es-node)

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
import { defaultEsContext } from "ddd-es-node";
import { Order } from "./orders";

const { entityRepository } = defaultEsContext;

export const cancelOrder = (id) : void => {
  return entityRepository
      .load(Order, id)
      .then((order : Order) => order.cancel());
};
```

Add event subscribers.

```typescript
import { defaultEsContext, EntityEvent } from "ddd-es-node";
import { OrderCancelledEvent } from "./events";

const { eventBus } = defaultEsContext;

eventBus.subscribe((event : EntityEvent) => {
  if (event instanceof OrderCancelledEvent) {
    // do something
  }
}, { replay: true });
```

## License
[MIT](LICENSE.md)
