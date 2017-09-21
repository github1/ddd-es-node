import {
  resolveInstanceFromJson
} from '../../src/runtime/type_deserializer';
import {
  EntityEvent
} from '../../src/core/entity';

export class ComplexEvent extends EntityEvent {
  constructor(complexType) {
    super();
    this.complexType = complexType;
  }
}

export class ComplexType {
  constructor(value) {
    this.typeNameMetaData = this.constructor.name;
    this.value = value;
  }
}

describe('typeLoader', () => {

  describe('resolveInstanceFromJson', () => {
    describe('with an object with nested types', () => {
      it('it loads the type and child types from JSON based on type metadata', () => {
        return resolveInstanceFromJson(
          JSON.stringify(
            new ComplexEvent(
              new ComplexType('blah')
            )
          )
        ).then((result) => {
          expect(result.constructor).toEqual(ComplexEvent);
          expect(result.name).toEqual('ComplexEvent');
          expect(result.complexType.constructor).toEqual(ComplexType);
          expect(result.complexType.value).toEqual('blah');
        });
      });
    });
    describe('with an object with multiple nested types', () => {
      it('it loads the type and all child types from JSON based on type metadata', () => {
        return resolveInstanceFromJson({
          typeNameMetaData: ComplexEvent.name,
          a: {
            typeNameMetaData: ComplexType.name
          },
          b: {
            typeNameMetaData: ComplexType.name
          }
        }).then((result) => {
          expect(result.constructor).toEqual(ComplexEvent);
          expect(result.a.constructor).toEqual(ComplexType);
          expect(result.b.constructor).toEqual(ComplexType);
        });
      });
    });
    describe('with an object without nested types', () => {
      it('it loads a type from JSON based on type metadata', () => {
        return resolveInstanceFromJson(
          JSON.stringify(new ComplexType('handle', 'role', 'sessionId'))
        ).then((result) => {
          expect(result.constructor).toEqual(ComplexType);
        });
      });
    });
    describe('with an object already resolved', () => {
      it('it returns the object', () => {
        return resolveInstanceFromJson(new ComplexEvent(
          new ComplexType('foo')
        )).then((result) => {
          expect(result.constructor).toEqual(ComplexEvent);
          expect(result.complexType.constructor).toEqual(ComplexType);
          expect(result.complexType.value).toEqual('foo');
        });
      });
    });
    describe('without any type metadata', () => {
      it('returns the json', () => {
        return resolveInstanceFromJson({
          value: 'baz'
        }).then((result) => {
          expect(result.constructor).toEqual(Object);
          expect(result.value).toEqual('baz');
        });
      });
    });
    describe('when a type does not exist', () => {
      it('throws an error', () => {
        let errorThrown = false;
        return resolveInstanceFromJson({
          typeNameMetaData: 'FakeTestType'
        }).then((result) => {
          expect(result.constructor).toEqual(Object);
        }).catch(() => {
          errorThrown = true;
        }).then(() => {
          expect(errorThrown).toEqual(true);
        });
      });
    });
    describe('when json not passed', () => {
      it('throws an error', () => {
        let errorThrown = false;
        return resolveInstanceFromJson('ljahsdj').then((result) => {
          expect(result.constructor).toEqual(Object);
        }).catch(() => {
          errorThrown = true;
        }).then(() => {
          expect(errorThrown).toEqual(true);
        });
      });
    });
  });

});
