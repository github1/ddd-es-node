# ddd-es-node

DDD and Event Sourcing primitives for nodejs

## Install

```shell
npm install ddd-es-node --save
```

## Usage

```javascript
import { Entity } from 'ddd-es-node/dist/src/core/entity';
import { OrderCancelledEvent } from './events';

class Order extends ddd.Entity {
  constructor(id) {
    super(id, Entity.CONFIG((self, event) => {
      if(event instanceof OrderCancelledEvent) {
        this.cancelled = true;
      }
    }));
  }
  cancel() {
    if(this.cancelled) {
      throw new Error('Order already cancelled');
    } else {
      this.dispatch(this.id, new OrderCancelledEvent());
    }
  }
}
```