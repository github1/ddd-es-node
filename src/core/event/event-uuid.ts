import { v4 } from 'uuid';

let frozenUUID : string;

export module EventUUID {

  export const freezeUUID = (value? : string) => {
    frozenUUID = value || v4();
  };

  export const unfreezeUUID = () => {
    frozenUUID = undefined;
  };

  export const uuid = () : string => {
    return frozenUUID === undefined ? v4() : frozenUUID;
  };

}
