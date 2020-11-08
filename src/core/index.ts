export * from './entity';
export * from './event';
export * from './decorators';

export interface User {
  id : string;
  meta? : any;
}

export type Modifier = (event : any) => any | undefined;

export interface Modifiers {
  [key : string] : Modifier;
}
