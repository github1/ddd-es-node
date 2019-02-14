# ddd-es-node

DDD and Event Sourcing primitives for nodejs

## Install

```shell
npm install ddd-es-node --save
```

## Usage

Define events.

```javascript
import { EntityEvent } from "ddd-es-node";

export class OrderCancelledEvent extends EntityEvent {
}
```

Create rich domain entities.

```javascript
import { Entity } from "ddd-es-node";
import { OrderCancelledEvent } from "./events";

export class Order extends Entity {
  constructor(id) {
    super(id, (self, event) => {
      if(event instanceof OrderCancelledEvent) {
        this.cancelled = true;
      }
    });
  }
  cancel() {
    if(this.cancelled) {
      throw new Error('Order already cancelled');
    } else {
      this.dispatch(new OrderCancelledEvent());
    }
  }
}
```

Load entities and execute commands.

```javascript
import { entityRepository } from "ddd-es-node";
import { Order } from "./orders";

export const cancelOrder = (id) => {
  return entityRepository
      .load(Order, id)
      .then(order => order.cancel());
};
```

Add subscribers.

```javascript
import { eventBus } from "ddd-es-node";
import { OrderCancelledEvent } from "./events";

eventBus.subscribe((event) => {
  if (event instanceof OrderCancelledEvent) {
    // do something
  }
}, { replay: true });
```

