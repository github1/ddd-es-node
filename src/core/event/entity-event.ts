import { Clock } from '../clock';
import { EventUUID } from './event-uuid';

export class EntityEvent {
  public uuid : string;
  public streamId : string;
  public typeNameMetaData : string;
  public name : string;
  public timestamp : number;

  constructor() {
    this.uuid = EventUUID.uuid();
    this.typeNameMetaData = this.constructor.name;
    this.name = this.typeNameMetaData;
    this.timestamp = Clock.now();
  }
}
