let time : number = -1;

export module Clock {

  export function freeze(at : number) : void {
    time = at;
  }

  export function unfreeze() : void {
    time = -1;
  }

  export function now() : number {
    return time === -1 ? new Date().getTime() : time;
  }

}
