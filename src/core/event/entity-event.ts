import {v4} from 'uuid';

export interface EntityEventUser {
  id : string;
  meta? : any;
}

export class EntityEvent {
  public uuid : string;
  public streamId : string;
  public typeNameMetaData : string;
  public name : string;
  public timestamp : number;
  public user? : EntityEventUser;

  public static possibleEntityEvent(obj : any) {
    return obj && obj.hasOwnProperty('uuid')
      && obj.hasOwnProperty('typeNameMetaData')
      && obj.hasOwnProperty('name');
  }

  constructor() {
    this.uuid = v4();
    this.typeNameMetaData = this.constructor.name;
    this.name = this.typeNameMetaData;
    this.timestamp = new Date().getTime();
  }
}

export interface EventsByStream {
  [streamId:string]: EntityEvent[]
}
