import { v4 } from 'uuid';

let frozenUUID : string = null;

export module EventUUID {

  export const freezeUUID = (value? : string) => {
    frozenUUID = value || v4();
  };

  export const unfreezeUUID = () => {
    frozenUUID = null;

  };
  export const uuid = () : string => {
    return frozenUUID === null ? v4() : frozenUUID;
  };

}
