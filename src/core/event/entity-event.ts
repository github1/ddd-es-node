import {v4} from 'uuid';
import {User} from '../';

export class EntityEvent {
  public static EVENT_TYPES : {[key:string]: any} = {};
  public uuid : string;
  public streamId : string;
  public typeNameMetaData : string;
  public name : string;
  public timestamp : number;
  public user? : User;

  constructor() {
    this.uuid = v4();
    this.typeNameMetaData = this.constructor.name;
    this.name = this.typeNameMetaData;
    this.timestamp = new Date().getTime();
    EntityEvent.EVENT_TYPES[this.typeNameMetaData] = this.constructor;
  }

  public static IS_LIKE_EVENT(obj : any) {
    return obj && obj.hasOwnProperty('uuid')
      && obj.hasOwnProperty('typeNameMetaData')
      && obj.hasOwnProperty('name');
  }
}

export interface EventsByStream {
  [streamId:string]: EntityEvent[];
}
